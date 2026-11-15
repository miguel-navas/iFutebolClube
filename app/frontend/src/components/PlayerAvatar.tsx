import { useState } from 'react';
import { initials } from '@/data/squad/view';

/** Foto do jogador; sem foto (ou se ela não carregar) mostra as iniciais. */
export default function PlayerAvatar({
  name,
  photo,
  className = 'h-14 w-14',
  textClass = 'text-base',
}: {
  name: string;
  photo?: string | null;
  className?: string;
  textClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      data-testid="player-initials"
      className={`${className} ${textClass} flex shrink-0 items-center justify-center rounded-full bg-[#1E293B] font-bold text-[#D4AF37]`}
    >
      {initials(name)}
    </span>
  );
}
