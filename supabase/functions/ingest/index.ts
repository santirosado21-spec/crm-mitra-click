// Retirada. Esta función cargaba datos al modelo anterior (tablero de solo lectura, dos
// negocios), que ya no existe. La carga de catálogo y clientes se hace con el importador
// CSV de la app y la de Shopify con las funciones `shopify-webhook` y `shopify-sync`.
// Supabase no permite borrarla desde aquí: queda como aviso y se puede eliminar desde
// el panel (Edge Functions → ingest → Delete).
Deno.serve(() =>
  new Response(JSON.stringify({ error: 'Esta función fue retirada.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  }),
)
