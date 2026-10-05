import { useCallback, useEffect, useEffectEvent, useState } from 'react'

export interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Ejecuta una consulta asíncrona y la repite cuando cambia `key`.
 * Descarta respuestas viejas: si llegan fuera de orden, gana la última petición.
 * Mientras carga conserva los datos anteriores para que la pantalla no parpadee.
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>): QueryState<T> {
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState<{ request: string; data: T | null; error: string | null }>({ request: '', data: null, error: null })
  const request = `${key}#${tick}`
  const run = useEffectEvent(fetcher)

  useEffect(() => {
    let active = true
    run()
      .then((data) => { if (active) setResult({ request, data, error: null }) })
      .catch((error: unknown) => { if (active) setResult({ request, data: null, error: error instanceof Error ? error.message : String(error) }) })
    return () => { active = false }
  }, [request])

  const reload = useCallback(() => setTick((value) => value + 1), [])
  const loading = result.request !== request
  return { data: result.data, loading, error: loading ? null : result.error, reload }
}
