# WEBHOOKS_PENDING — Sprint Techship

El edge function `carrier-tracking-webhook` esta listo. Falta desplegarlo y
registrar las URLs en los portales de cada carrier.

## Deploy

```bash
npx supabase functions deploy carrier-tracking-webhook --no-verify-jwt
```

`--no-verify-jwt` es necesario: los carriers no envian un JWT de Supabase.
La autenticidad se valida con HMAC (ver secrets abajo).

## URL del endpoint

```
https://uifrgmiqpkbgyvzbcldn.supabase.co/functions/v1/carrier-tracking-webhook?provider=skydropx
https://uifrgmiqpkbgyvzbcldn.supabase.co/functions/v1/carrier-tracking-webhook?provider=fedex
```

## Registro en portales

### Skydropx
Settings > Webhooks > Add webhook
- URL: `.../carrier-tracking-webhook?provider=skydropx`
- Evento: tracking / shipment status updates

### FedEx
FedEx Developer Portal > Track API > Subscriptions
- URL: `.../carrier-tracking-webhook?provider=fedex`

## Secrets de validacion HMAC (opcionales pero recomendados)

```bash
npx supabase secrets set SKYDROPX_WEBHOOK_SECRET=xxx
npx supabase secrets set FEDEX_WEBHOOK_SECRET=xxx
```

Sin secret el webhook acepta el payload sin validar firma (util en pruebas).

## Estado

- [ ] `carrier-tracking-webhook` desplegado
- [ ] URL Skydropx registrada
- [ ] URL FedEx registrada
- [ ] SKYDROPX_WEBHOOK_SECRET configurado
- [ ] FEDEX_WEBHOOK_SECRET configurado
