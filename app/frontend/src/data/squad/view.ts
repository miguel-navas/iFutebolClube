import type { SquadPlayer } from './types';
import { ageAt } from './types';

export interface EditionNumbers {
  games: number;
  starts: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

/** O que a janela do jogador precisa; o elenco embutido (`Player`) também serve. */
export interface PlayerView {
  id?: number;
  name: string;
  number: number | null;
  position: string | null;
  photo?: string | null;
  age?: number | null;
  caps?: number | null;
  goals?: number | null;
  clubs?: string[];
  /** De onde vêm `caps` e `goals`: da seleção (exemplo embutido) ou do total em Copas (banco). */
  careerScope?: 'selecao' | 'copas';
  /** Fonte de clubes e totais, mostrada no rodapé da janela. */
  source?: string | null;
  edition?: EditionNumbers | null;
}

export function viewFromSquad(p: SquadPlayer, reference: string): PlayerView {
  return {
    id: p.id,
    name: p.name,
    number: p.number,
    position: p.position,
    photo: p.photo,
    age: ageAt(p.birthDate, reference),
    caps: p.career?.games ?? null,
    goals: p.career?.goals ?? null,
    clubs: p.clubs,
    careerScope: p.career?.scope ?? 'copas',
    source: p.profileSource,
    edition: {
      games: p.games,
      starts: p.starts,
      goals: p.goals,
      assists: p.assists,
      yellow: p.yellow,
      red: p.red,
    },
  };
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
