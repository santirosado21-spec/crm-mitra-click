// Supabase Auth no reporta sus fallas en la respuesta de una llamada: redirige de vuelta
// a la app con el error en la URL, unas veces en el fragmento (#) y otras en la query (?).
// Si nadie lo lee, quien intentó entrar vuelve a la pantalla de login sin ninguna pista y
// repite el intento con el mismo resultado. Esto lo lee y lo traduce.

/** Mensajes en español para las fallas que de verdad aparecen al poner esto en marcha. */
const EXPLICACIONES: { coincide: RegExp; texto: string }[] = [
  {
    // Lo que responde Supabase cuando la URL de retorno no está en la lista blanca. Es la
    // falla más común al arrancar, porque el Site URL por omisión es localhost:3000.
    coincide: /requested path is invalid/i,
    texto: 'La URL de retorno no está autorizada en Supabase. Agrégala en Authentication → URL Configuration (Site URL y Redirect URLs) y vuelve a intentar.',
  },
  {
    coincide: /expired|invalid or has expired|otp_expired/i,
    texto: 'El enlace venció o ya se usó. Los enlaces duran poco y sirven una sola vez; pide uno nuevo y ábrelo en este mismo navegador.',
  },
  {
    coincide: /provider is not enabled|unsupported provider/i,
    texto: 'Ese proveedor no está habilitado en Supabase. Actívalo en Authentication → Providers.',
  },
  {
    coincide: /signups? not allowed|signup is disabled/i,
    texto: 'Ese correo no tiene cuenta y el registro está cerrado. Hay que darlo de alta en Supabase primero.',
  },
  {
    coincide: /email not confirmed/i,
    texto: 'La cuenta existe pero el correo no está confirmado. Confírmalo en Supabase (Authentication → Users) o desde el correo de confirmación.',
  },
]

/**
 * Saca el error que Supabase dejó en la URL, ya traducido. `null` si no hay ninguno.
 *
 * Se revisa el fragmento y la query porque el flujo implícito usa `#` y el de PKCE `?`.
 */
export function readAuthError(hash: string, search: string): string | null {
  for (const fuente of [hash, search]) {
    const params = new URLSearchParams(fuente.replace(/^[#?]/, ''))
    const error = params.get('error') ?? params.get('error_code')
    if (!error) continue

    const crudo = params.get('error_description') ?? params.get('error_code') ?? ''
    const explicacion = EXPLICACIONES.find((item) => item.coincide.test(`${crudo} ${error}`))
    if (explicacion) return explicacion.texto
    // Sin traducción, el mensaje de Supabase tal cual es mejor que el silencio.
    return crudo ? crudo : `No se pudo iniciar sesión (${error}).`
  }
  return null
}
