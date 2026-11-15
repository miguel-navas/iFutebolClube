import type { BracketMatch } from '@/data/worldCupData';

/** Posição da fase no caminho até a final (maior = mais perto da final). 0 = fase não reconhecida. */
export function roundRank(round: string): number {
  const r = round.toLowerCase();
  // 3º lugar primeiro: "Bronze final" também contém "final".
  if (/terceiro|3º|3\.º|3rd|third|bronz|consola/.test(r)) return 5;
  if (r.includes('semi')) return 4;
  if (r.includes('quart')) return 3;
  if (r.includes('oitavas')) return 2;
  if (r.includes('16 avos') || r.includes('32')) return 1;
  if (r.includes('final')) return 6;
  return 0;
}

export const DEFAULT_LABELS: Record<number, string> = {
  1: '16 avos de final',
  2: 'Oitavas de final',
  3: 'Quartas de final',
  4: 'Semifinais',
  5: 'Disputa do 3º lugar',
  6: 'Final',
};

export type Slot = BracketMatch | null;

export interface TreeColumn {
  rank: number;
  label: string;
  /** Jogos da metade esquerda e da direita, de cima para baixo (null = vaga ainda sem jogo). */
  left: Slot[];
  right: Slot[];
}

export interface TreeLayout {
  columns: TreeColumn[];
  final: Slot;
  third: Slot;
  /** Jogos de fases não reconhecidas, que ficam fora da árvore. */
  others: BracketMatch[];
}

/** Código do vencedor, ou null enquanto o jogo não está decidido. */
export function winnerCode(m: BracketMatch): string | null {
  if (m.scoreA == null || m.scoreB == null) return null;
  if (m.scoreA !== m.scoreB) return m.scoreA > m.scoreB ? m.teamA : m.teamB;
  if (
    m.penaltiesA != null &&
    m.penaltiesB != null &&
    m.penaltiesA !== m.penaltiesB
  ) {
    return m.penaltiesA > m.penaltiesB ? m.teamA : m.teamB;
  }
  return null;
}

const byDate = (x: BracketMatch, y: BracketMatch) =>
  x.date.localeCompare(y.date) ||
  String(x.id).localeCompare(String(y.id), undefined, { numeric: true });

/**
 * Monta a árvore da final para trás: cada jogo traz, logo acima dele, os dois jogos
 * cujos vencedores o disputam. Onde isso não puder ser descoberto (jogo sem times
 * ou sem resultado) as vagas são preenchidas pela data e as que faltam ficam vazias.
 */
export function buildTreeLayout(matches: BracketMatch[]): TreeLayout {
  const pools = new Map<number, BracketMatch[]>();
  for (const m of [...matches].sort(byDate)) {
    const rank = roundRank(m.round);
    pools.set(rank, [...(pools.get(rank) ?? []), m]);
  }
  // A final é o último jogo do torneio; se houver mais de um "final", vale o mais recente.
  const finals = pools.get(6) ?? [];
  const final = finals.length ? finals[finals.length - 1] : null;
  const third = pools.get(5)?.[0] ?? null;
  const others = pools.get(0) ?? [];

  const present = [1, 2, 3, 4].filter((r) => pools.has(r));
  const firstRank = present.length ? Math.min(...present) : 4;

  // Do último para o primeiro: ordena os jogos de cada fase conforme a fase seguinte.
  const ordered = new Map<number, Slot[]>();
  let parents: Slot[] = [final];
  for (let rank = 4; rank >= firstRank; rank--) {
    const pool = [...(pools.get(rank) ?? [])];
    const take = (code: string | null): BracketMatch | null => {
      if (!code) return null;
      const i = pool.findIndex((c) => winnerCode(c) === code);
      return i >= 0 ? pool.splice(i, 1)[0] : null;
    };
    const slots: Slot[] = [];
    const feeders = parents.map((p) => [
      take(p?.teamA ?? null),
      take(p?.teamB ?? null),
    ]);
    for (const [a, b] of feeders) {
      slots.push(a ?? pool.shift() ?? null, b ?? pool.shift() ?? null);
    }
    ordered.set(rank, slots);
    parents = slots;
  }

  const columns: TreeColumn[] = [];
  for (let rank = firstRank; rank <= 4; rank++) {
    const slots = ordered.get(rank) ?? [];
    const half = slots.length / 2;
    columns.push({
      rank,
      label: pools.get(rank)?.[0]?.round ?? DEFAULT_LABELS[rank],
      left: slots.slice(0, half),
      right: slots.slice(half),
    });
  }
  return { columns, final, third, others };
}
