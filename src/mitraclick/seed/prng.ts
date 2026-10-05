// PRNG con semilla fija (mulberry32): el modo demo produce siempre los mismos datos
// para una misma fecha de corte, así la presentación a dirección es estable.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Rng {
  /** Flotante uniforme en [min, max). */
  range: (min: number, max: number) => number
  /** Entero uniforme en [min, max], inclusivo. */
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  chance: (probability: number) => boolean
  /** Índice ponderado: [3, 1, 1] devuelve 0 tres veces más seguido. */
  weighted: (weights: readonly number[]) => number
}

export function makeRng(seed: number): Rng {
  const rand = mulberry32(seed)
  return {
    range: (min, max) => min + rand() * (max - min),
    int: (min, max) => Math.floor(min + rand() * (max - min + 1)),
    pick: (items) => items[Math.floor(rand() * items.length)],
    chance: (probability) => rand() < probability,
    weighted: (weights) => {
      const total = weights.reduce((sum, weight) => sum + weight, 0)
      let remaining = rand() * total
      for (let index = 0; index < weights.length; index += 1) {
        remaining -= weights[index]
        if (remaining <= 0) return index
      }
      return weights.length - 1
    },
  }
}
