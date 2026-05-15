# SECRETS_PENDING — Sprint Techship

Secrets que deben configurarse manualmente. El codigo esta completo; sin estos
secrets el provider opera en modo degradado / mock.

## FedEx REST (Fase 7)

El edge function `fedex-proxy` requiere 3 secrets de Supabase:

```bash
npx supabase secrets set FEDEX_CLIENT_ID=xxx
npx supabase secrets set FEDEX_CLIENT_SECRET=xxx
npx supabase secrets set FEDEX_ACCOUNT=xxx
# Opcional - sandbox de pruebas:
npx supabase secrets set FEDEX_BASE_URL=https://apis-sandbox.fedex.com
```

Despues desplegar el edge function:

```bash
npx supabase functions deploy fedex-proxy
```

Y en `/tms/carriers` marcar el provider **FedEx directo** como activo.

Origen de credenciales: portal FedEx Developer -> My Projects -> API key + secret.
El Account Number es el de la cuenta comercial FedEx MX.

## Skydropx (Fase 1 - buyLabel real)

La API key de Skydropx se registra desde la UI en `/tms/carriers` (no es secret
de Supabase). El `buyLabel` real ya esta implementado en `src/lib/carriers/skydropx.ts`.

## Estado

- [ ] FEDEX_CLIENT_ID configurado
- [ ] FEDEX_CLIENT_SECRET configurado
- [ ] FEDEX_ACCOUNT configurado
- [ ] `fedex-proxy` desplegado
- [ ] Provider FedEx activado en `/tms/carriers`
