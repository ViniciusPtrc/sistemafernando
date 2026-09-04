export function mulberry32(seed: number): () => number {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom<T>(random: () => number, itens: readonly T[]): T {
  return itens[Math.floor(random() * itens.length)];
}

export function intBetween(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function amountBetween(random: () => number, min: number, max: number, step = 10): number {
  const raw = random() * (max - min) + min;
  return Math.round(raw / step) * step;
}

export function addDays(iso: string, dias: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + dias);
  return date.toISOString().slice(0, 10);
}
