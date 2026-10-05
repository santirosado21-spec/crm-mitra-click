import { useSearchParams } from 'react-router-dom'

/** Vista activa según `?vista=`; la primera opción es la predeterminada. */
export function useView<Key extends string>(options: { key: Key; label: string }[]): Key {
  const [params] = useSearchParams()
  const current = params.get('vista')
  return options.find((option) => option.key === current)?.key ?? options[0].key
}
