-- Mitra Click · Sistema operativo · 1 · Reinicio
-- El proyecto deja de ser un tablero de solo lectura (Mitra mayorista + Mitra Click)
-- y pasa a ser el sistema operativo de Mitra Click. Se elimina el modelo anterior,
-- que estaba vacío (sin datos reales). Se conservan: schemas private y raw,
-- raw.api_payloads, public.sync_runs, el tipo data_source y los normalizadores
-- private.clean_text / fold / to_num / to_date / to_month / to_bool / req / set_updated_at.

drop view if exists public.sales_facts;

drop function if exists public.ingest_batch(public.data_source, text, jsonb, text);
drop function if exists public.purge_source(public.data_source, text);
drop function if exists private.ingest_row(public.data_source, text, jsonb);
drop function if exists private.write_lines(public.data_source, text, uuid, jsonb, boolean);
drop function if exists private.ensure_rep(public.data_source, text);
drop function if exists private.ensure_client(public.data_source, text);
drop function if exists private.ensure_product(public.data_source, text, public.business_unit);
drop function if exists private.to_business_unit(text, public.data_source);
drop function if exists private.to_wholesale_status(text);
drop function if exists private.to_retail_status(text);
drop function if exists private.to_quote_status(text);

-- La política de lectura de sync_runs dependía de app_users; se recrea en la migración 2.
drop policy if exists "Miembros activos leen" on public.sync_runs;

drop table if exists
  public.wholesale_order_lines,
  public.wholesale_orders,
  public.retail_order_lines,
  public.retail_orders,
  public.wholesale_quotes,
  public.ecommerce_traffic_daily,
  public.inventory_levels,
  public.clients,
  public.rep_monthly_quotas,
  public.business_goals,
  public.products,
  public.sales_reps,
  public.audit_log,
  public.agent_profiles,
  public.app_users
cascade;

drop type if exists public.business_unit;
drop type if exists public.wholesale_order_status;
drop type if exists public.retail_order_status;
drop type if exists public.quote_status;
