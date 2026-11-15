import type { CardColor, GoalKind } from '@/data/match/types';

export const ICON_LABEL = {
  goal: 'Gol',
  penalty: 'Gol de pênalti',
  own: 'Gol contra',
  yellow: 'Cartão amarelo',
  red: 'Cartão vermelho',
  'second-yellow': 'Segundo amarelo (expulsão)',
  off: 'Jogador que sai',
  on: 'Jogador que entra',
} as const;

export type IconKind = keyof typeof ICON_LABEL;

const BALL_COLOR: Record<'goal' | 'penalty' | 'own', string> = {
  goal: '#E2E8F0',
  penalty: '#E2E8F0',
  own: '#F87171',
};

export function MatchIcon({
  kind,
  className = 'h-4 w-4',
}: {
  kind: IconKind;
  className?: string;
}) {
  const label = ICON_LABEL[kind];
  const common = {
    role: 'img',
    'aria-label': label,
    className,
    viewBox: '0 0 16 16',
  } as const;
  if (kind === 'goal' || kind === 'penalty' || kind === 'own') {
    return (
      <svg {...common} data-icon={kind}>
        <title>{label}</title>
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill={BALL_COLOR[kind]}
          stroke="#0F172A"
          strokeWidth="1"
        />
        <polygon
          points="8,4.6 10.6,6.5 9.6,9.5 6.4,9.5 5.4,6.5"
          fill="#0F172A"
        />
        {kind === 'penalty' && (
          <text
            x="8"
            y="14.8"
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fill="#D4AF37"
          >
            P
          </text>
        )}
      </svg>
    );
  }
  if (kind === 'yellow' || kind === 'red') {
    return (
      <svg {...common} data-icon={kind}>
        <title>{label}</title>
        <rect
          x="3.5"
          y="1.5"
          width="9"
          height="13"
          rx="1.5"
          fill={kind === 'yellow' ? '#FACC15' : '#EF4444'}
        />
      </svg>
    );
  }
  if (kind === 'second-yellow') {
    return (
      <svg {...common} data-icon={kind}>
        <title>{label}</title>
        <rect x="2" y="1.5" width="8" height="12" rx="1.5" fill="#FACC15" />
        <rect x="6" y="3" width="8" height="12" rx="1.5" fill="#EF4444" />
      </svg>
    );
  }
  const up = kind === 'on';
  return (
    <svg {...common} data-icon={kind}>
      <title>{label}</title>
      <path
        d={
          up ? 'M8 2 L14 9 H10 V14 H6 V9 H2 Z' : 'M8 14 L2 7 H6 V2 H10 V7 H14 Z'
        }
        fill={up ? '#22C55E' : '#EF4444'}
      />
    </svg>
  );
}

export const goalIcon = (kind: GoalKind): IconKind =>
  kind === 'penalty' ? 'penalty' : kind === 'own' ? 'own' : 'goal';
export const cardIcon = (color: CardColor): IconKind => color;
