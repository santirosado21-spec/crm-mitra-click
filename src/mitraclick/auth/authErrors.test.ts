import { describe, expect, it } from 'vitest'
import { readAuthError } from './authErrors'

describe('readAuthError', () => {
  it('no reporta nada cuando la URL viene limpia', () => {
    expect(readAuthError('', '')).toBeNull()
    expect(readAuthError('#access_token=abc&token_type=bearer', '?periodo=mes')).toBeNull()
  })

  // El caso que más duele: Supabase rebota así cuando la URL de retorno no está en la
  // lista blanca de Authentication → URL Configuration. Sin explicarlo, la persona
  // vuelve a pedir el enlace una y otra vez y siempre falla igual.
  it('explica que la URL de retorno no está autorizada, y dónde se arregla', () => {
    const texto = readAuthError('#error=invalid_request&error_description=requested+path+is+invalid', '')
    expect(texto).toContain('URL de retorno')
    expect(texto).toContain('Authentication')
  })

  it('explica un enlace vencido o ya usado', () => {
    const texto = readAuthError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', '')
    expect(texto).toContain('venció')
  })

  it('explica que el proveedor no está habilitado', () => {
    expect(readAuthError('#error=server_error&error_description=Unsupported+provider%3A+provider+is+not+enabled', ''))
      .toContain('no está habilitado')
  })

  it('lee el error también de la query, no solo del fragmento', () => {
    expect(readAuthError('', '?error=access_denied&error_description=Something+went+wrong')).toBe('Something went wrong')
  })

  it('decodifica los signos de más y los porcentajes del mensaje crudo', () => {
    expect(readAuthError('#error=server_error&error_description=Database+error+saving+new+user', ''))
      .toBe('Database error saving new user')
  })

  it('con error pero sin descripción, devuelve algo útil en vez de vacío', () => {
    expect(readAuthError('#error=access_denied', '')).toBe('No se pudo iniciar sesión (access_denied).')
  })
})
