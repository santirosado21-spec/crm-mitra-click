// Deriva siglas automáticamente del nombre del cliente.
// Ej: "FITNESS FOR LIFE MÉRIDA" → "FFLM"
//     "BASF" → "BAS"
//     "La Red" → "LR"
export function deriveSiglas(name: string): string {
  if (!name) return 'CLI'
  const clean = name
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim()
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'CLI'
  if (words.length === 1) return words[0].slice(0, 3)
  return words.slice(0, 4).map(w => w[0]).join('')
}
