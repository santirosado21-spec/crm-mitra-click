-- ============================================================================
-- Sprint C · Extensiv Billing — log de charges + idempotencia + RLS
-- Ejecutar después de v3, email_log y extensiv_link.
--
-- Modelo:
--   - Cada vez que el frontend pushea un charge a Extensiv (POST
--     /billingcharges), se inserta una fila en extensiv_billing_log con
--     status='pending'. Cuando vuelve la respuesta, se actualiza con
--     extensiv_charge_id (éxito) o error_message (falla).
--   - El UNIQUE (source_table, source_id, charge_type) evita que cobranza
--     mande dos veces el mismo cobro accidentalmente. Si vuelve a apretar
--     "Enviar", se hace UPSERT — actualiza el row existente en vez de crear
--     uno nuevo. Solo se reintenta si el anterior está 'pending' o 'failed'.
--   - Vista v_extensiv_charge_status para que el frontend sepa si un viaje
--     ya fue cobrado (botón gris) o aún no (botón azul).
-- ============================================================================

-- 1. Tabla principal de log -------------------------------------------------
CREATE TABLE IF NOT EXISTS extensiv_billing_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table       TEXT NOT NULL CHECK (source_table IN ('viajes','operations','servicios_adicionales')),
  source_id          UUID NOT NULL,
  customer_id        INT  NOT NULL,
  charge_type        TEXT NOT NULL,
  amount             NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description        TEXT NOT NULL,
  reference_number   TEXT NOT NULL,
  shipment_id        TEXT,                     -- extensiv_transaction_id si aplica
  charge_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  extensiv_charge_id TEXT,                     -- llena al éxito
  status             TEXT NOT NULL CHECK (status IN ('pending','sent','failed','voided')),
  http_status        INT,
  error_message      TEXT,
  attempted_by       TEXT NOT NULL,            -- email del usuario que apretó "Enviar"
  attempted_at       TIMESTAMPTZ DEFAULT now(),
  sent_at            TIMESTAMPTZ,
  voided_at          TIMESTAMPTZ,
  voided_by          TEXT,
  CONSTRAINT extensiv_billing_log_unique
    UNIQUE (source_table, source_id, charge_type)
);

CREATE INDEX IF NOT EXISTS idx_ebl_source     ON extensiv_billing_log(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_ebl_customer   ON extensiv_billing_log(customer_id, charge_date);
CREATE INDEX IF NOT EXISTS idx_ebl_status     ON extensiv_billing_log(status, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebl_charge_date ON extensiv_billing_log(charge_date);

-- 2. RLS (admin + cobranza pueden ver/modificar) ---------------------------
ALTER TABLE extensiv_billing_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Helper: usuario es admin O cobranza activo en team_members
  CREATE OR REPLACE FUNCTION current_user_can_bill() RETURNS BOOLEAN
  LANGUAGE sql STABLE AS $f$
    SELECT EXISTS (
      SELECT 1 FROM team_members
       WHERE lower(user_email) = current_user_email()
         AND active = true
         AND role IN ('admin','cobranza')
    );
  $f$;
EXCEPTION WHEN duplicate_function THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY ebl_select ON extensiv_billing_log FOR SELECT TO authenticated
    USING (current_user_can_bill());
  CREATE POLICY ebl_insert ON extensiv_billing_log FOR INSERT TO authenticated
    WITH CHECK (current_user_can_bill() AND attempted_by = current_user_email());
  CREATE POLICY ebl_update ON extensiv_billing_log FOR UPDATE TO authenticated
    USING (current_user_can_bill()) WITH CHECK (current_user_can_bill());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. RPC para registrar el intento (antes del POST a Extensiv) ------------
-- Crea o reutiliza la fila de log. Si ya existe y está 'sent' rechaza con
-- excepción para evitar doble cobro. Si está 'pending' o 'failed', resetea
-- a 'pending' para reintentar. Devuelve el id de log.
CREATE OR REPLACE FUNCTION extensiv_log_attempt(
  p_source_table     TEXT,
  p_source_id        UUID,
  p_customer_id      INT,
  p_charge_type      TEXT,
  p_amount           NUMERIC,
  p_description      TEXT,
  p_reference_number TEXT,
  p_shipment_id      TEXT DEFAULT NULL,
  p_charge_date      DATE DEFAULT CURRENT_DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller TEXT := current_user_email();
  v_existing extensiv_billing_log;
  v_log_id UUID;
BEGIN
  IF v_caller = '' THEN RAISE EXCEPTION 'no auth'; END IF;
  IF NOT current_user_can_bill() THEN
    RAISE EXCEPTION 'Solo admin o cobranza pueden enviar charges';
  END IF;

  SELECT * INTO v_existing
    FROM extensiv_billing_log
   WHERE source_table = p_source_table
     AND source_id    = p_source_id
     AND charge_type  = p_charge_type
   FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'sent' THEN
      RAISE EXCEPTION 'Charge ya enviado a Extensiv (id=%) — usa "void" si necesitas anularlo', v_existing.extensiv_charge_id;
    END IF;
    -- Reset para reintentar
    UPDATE extensiv_billing_log
       SET status = 'pending',
           amount = p_amount,
           description = p_description,
           reference_number = p_reference_number,
           shipment_id = p_shipment_id,
           charge_date = p_charge_date,
           attempted_by = v_caller,
           attempted_at = now(),
           error_message = NULL,
           http_status = NULL
     WHERE id = v_existing.id
     RETURNING id INTO v_log_id;
  ELSE
    INSERT INTO extensiv_billing_log (
      source_table, source_id, customer_id, charge_type, amount,
      description, reference_number, shipment_id, charge_date,
      status, attempted_by
    ) VALUES (
      p_source_table, p_source_id, p_customer_id, p_charge_type, p_amount,
      p_description, p_reference_number, p_shipment_id, p_charge_date,
      'pending', v_caller
    )
    RETURNING id INTO v_log_id;
  END IF;

  RETURN v_log_id;
END;
$$;

-- 4. RPC para finalizar el log (tras la respuesta de Extensiv) ------------
CREATE OR REPLACE FUNCTION extensiv_log_finalize(
  p_log_id            UUID,
  p_extensiv_charge_id TEXT,
  p_http_status       INT,
  p_error_message     TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT current_user_can_bill() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE extensiv_billing_log
     SET extensiv_charge_id = p_extensiv_charge_id,
         http_status        = p_http_status,
         status             = CASE
           WHEN p_http_status BETWEEN 200 AND 299 AND p_extensiv_charge_id IS NOT NULL THEN 'sent'
           ELSE 'failed'
         END,
         error_message      = p_error_message,
         sent_at            = CASE WHEN p_http_status BETWEEN 200 AND 299 AND p_extensiv_charge_id IS NOT NULL THEN now() END
   WHERE id = p_log_id;
END;
$$;

-- 5. Vista para que el frontend sepa qué viajes ya están cobrados ---------
CREATE OR REPLACE VIEW v_extensiv_charge_status AS
SELECT source_table,
       source_id,
       charge_type,
       status,
       extensiv_charge_id,
       sent_at,
       error_message,
       attempted_at
  FROM extensiv_billing_log;

-- 6. RPC para "anular" un charge ya enviado (solo admin) -------------------
-- Marca el log como voided. NO hace DELETE en Extensiv — eso debe hacerse
-- manualmente en la UI de Extensiv. Esto solo permite reintentar enviar el
-- mismo source con un charge_type distinto si fue error humano.
CREATE OR REPLACE FUNCTION extensiv_log_void(p_log_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede anular charges';
  END IF;
  UPDATE extensiv_billing_log
     SET status        = 'voided',
         voided_at     = now(),
         voided_by     = current_user_email(),
         error_message = COALESCE(error_message, '') || ' | VOIDED: ' || p_reason
   WHERE id = p_log_id;
END;
$$;
