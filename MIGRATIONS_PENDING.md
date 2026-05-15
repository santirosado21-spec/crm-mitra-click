# MIGRATIONS_PENDING — Sprint Techship

## Estado: APLICADA OK

La migracion `20260515000001_techship_replica.sql` se aplico correctamente al
proyecto Supabase remoto (`uifrgmiqpkbgyvzbcldn`) via `supabase db push`.

Tablas creadas: markup_profiles, markup_profile_rules, parcel_addresses,
manifests, manifest_guias, parcel_order_templates, parcel_print_queue.
Columnas agregadas a guias_paqueteria: promised_delivery_date,
actual_delivery_date, induction_date, billing_account, markup_pct_applied.
Seed: direccion remitente default "Supply Chain MX - Lerma" CP 52000.

## Nota de sincronizacion

El historial de migraciones remoto estaba vacio (las 28 migraciones previas
existian en el schema pero no en `supabase_migrations.schema_migrations`).
Se reparo con `supabase migration repair --status applied <versions>` antes
del push para evitar reaplicar migraciones viejas no idempotentes.

## Pendiente: NINGUNO

No quedan migraciones SQL pendientes de aplicar.
