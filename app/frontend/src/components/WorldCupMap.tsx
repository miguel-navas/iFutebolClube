import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, Marker, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';
import './worldcup-map.css';
import { getHostMarkers, type HostMarker } from '@/data/worldCupHosts';

interface Props {
  /** Anos das edições com dados no site. */
  availableYears: ReadonlySet<string>;
  /** Abre a edição (navegação feita por quem usa o mapa). */
  onOpenEdition: (year: string) => void;
}

interface OpenCard {
  key: string;
  left: number;
  top: number;
  arrowX: number;
  placement: 'above' | 'below';
}

const BOUNDS: L.LatLngBoundsLiteral = [
  [-85, -180],
  [85, 180],
];
const CARD_HALF_WIDTH = 90;
const CLOSE_DELAY_MS = 180;

function ballHtml(marker: HostMarker): string {
  const label = `${marker.name}: ${marker.years.join(', ')}`;
  return `<button type="button" class="wc-ball" data-key="${marker.key}" aria-haspopup="true" aria-label="${label}">⚽</button>`;
}

/** Roda do mouse só depois de clicar ou focar o mapa; fecha o cartão ao mover; expõe o zoom. */
function MapBehaviour({ onDismiss }: { onDismiss: () => void }) {
  const map = useMap();

  // Zoom inicial: em telas largas cobre toda a área (sem margens vazias); em estreitas começa em 1.
  // O zoom mínimo é o que mostra o mundo inteiro. Acompanha mudanças de tamanho (menu lateral).
  useEffect(() => {
    const container = map.getContainer();
    const fitMinZoom = () => {
      map.setMinZoom(0); // getBoundsZoom respeita o zoom mínimo atual
      const contain = map.getBoundsZoom(BOUNDS, false);
      map.setMinZoom(contain);
      return contain;
    };

    map.invalidateSize({ animate: false });
    const contain = fitMinZoom();
    const narrow = container.clientWidth < 700;
    const start = narrow ? Math.max(contain, 1) : map.getBoundsZoom(BOUNDS, true);
    map.setView([15, 10], start, { animate: false });

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      fitMinZoom();
      // Em telas largas, uma área maior (menu recolhido) não deve deixar margens vazias.
      if (container.clientWidth >= 700) {
        const cover = map.getBoundsZoom(BOUNDS, true);
        if (map.getZoom() < cover) map.setZoom(cover, { animate: false });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute('data-testid', 'wc-map');
    const reportZoom = () => container.setAttribute('data-zoom', String(map.getZoom()));
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    const onClick = () => {
      enable();
      onDismiss();
    };
    const onFocusIn = () => enable();
    const onFocusOut = (e: FocusEvent) => {
      if (!container.contains(e.relatedTarget as Node | null)) disable();
    };

    reportZoom();
    disable();
    map.on('zoomend', reportZoom);
    map.on('click', onClick);
    map.on('movestart zoomstart', onDismiss);
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);
    container.addEventListener('mouseleave', disable);
    return () => {
      map.off('zoomend', reportZoom);
      map.off('click', onClick);
      map.off('movestart zoomstart', onDismiss);
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      container.removeEventListener('mouseleave', disable);
    };
  }, [map, onDismiss]);

  return null;
}

export default function WorldCupMap({ availableYears, onOpenEdition }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<FeatureCollection | null>(null);
  const [failed, setFailed] = useState(false);
  const [card, setCard] = useState<OpenCard | null>(null);

  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const keyboardRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const focusCardRef = useRef(false);
  const skipFocusOpenRef = useRef(false);

  const markers = useMemo(() => getHostMarkers(), []);
  const icons = useMemo(
    () => markers.map((m) => L.divIcon({ className: 'wc-marker', html: ballHtml(m), iconSize: [0, 0] })),
    [markers],
  );
  const open = card ? markers.find((m) => m.key === card.key) : undefined;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/countries-50m.geojson`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setCountries)
      .catch((e) => {
        if (e?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // Enter no marcador leva o foco para o primeiro ano disponível do cartão.
  useEffect(() => {
    if (card && focusCardRef.current) {
      focusCardRef.current = false;
      cardRef.current?.querySelector<HTMLElement>('.wc-year[data-available="true"]')?.focus();
    }
  }, [card]);

  const ballOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('.wc-ball') as HTMLButtonElement | null;
  const insideCard = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('.wc-card-wrap');
  const related = (t: EventTarget | null) => !!ballOf(t) || insideCard(t);

  // Estável: o mapa registra este callback, e recriá-lo religaria o mapa a cada render.
  const close = useCallback(() => {
    window.clearTimeout(timerRef.current);
    hoverRef.current = false;
    focusRef.current = false;
    setCard(null);
  }, []);

  function closeSoon() {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!hoverRef.current && !(focusRef.current && keyboardRef.current)) setCard(null);
    }, CLOSE_DELAY_MS);
  }

  function openFor(ball: HTMLButtonElement) {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const box = ball.getBoundingClientRect();
    const area = wrapper.getBoundingClientRect();
    const ballX = box.left - area.left + box.width / 2;
    const left = Math.min(Math.max(ballX, CARD_HALF_WIDTH), Math.max(area.width - CARD_HALF_WIDTH, CARD_HALF_WIDTH));
    const above = box.top - area.top > 150;
    setCard({
      key: ball.dataset.key ?? '',
      left,
      arrowX: ballX - left,
      top: above ? box.top - area.top : box.bottom - area.top,
      placement: above ? 'above' : 'below',
    });
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      onMouseDown={() => {
        keyboardRef.current = false;
      }}
      onKeyDown={(e) => {
        keyboardRef.current = true;
        const ball = ballOf(e.target);
        if (ball && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          focusCardRef.current = true;
          openFor(ball);
          // se o cartão já estava aberto, o efeito acima não roda de novo
          cardRef.current?.querySelector<HTMLElement>('.wc-year[data-available="true"]')?.focus();
        } else if (e.key === 'Escape' && card) {
          const key = card.key;
          const wasInside = insideCard(e.target);
          close();
          if (wasInside) {
            skipFocusOpenRef.current = true; // devolver o foco não deve reabrir o cartão
            wrapperRef.current?.querySelector<HTMLElement>(`.wc-ball[data-key="${key}"]`)?.focus();
          }
        }
      }}
      onMouseOver={(e) => {
        if (!related(e.target)) return;
        hoverRef.current = true;
        window.clearTimeout(timerRef.current);
        const ball = ballOf(e.target);
        if (ball) openFor(ball);
      }}
      onMouseOut={(e) => {
        if (!related(e.target) || related(e.relatedTarget)) return;
        hoverRef.current = false;
        closeSoon();
      }}
      onFocus={(e) => {
        if (!related(e.target)) return;
        if (skipFocusOpenRef.current) {
          skipFocusOpenRef.current = false;
          return;
        }
        focusRef.current = true;
        window.clearTimeout(timerRef.current);
        const ball = ballOf(e.target);
        if (ball) openFor(ball);
      }}
      onBlur={(e) => {
        if (!related(e.target) || related(e.relatedTarget)) return;
        focusRef.current = false;
        closeSoon();
      }}
      onClick={(e) => {
        const ball = ballOf(e.target);
        if (ball) {
          openFor(ball); // toque em telas sem mouse
          return;
        }
        const year = (e.target as HTMLElement).closest?.('.wc-year') as HTMLButtonElement | null;
        if (year && year.dataset.available === 'true') {
          close();
          onOpenEdition(year.dataset.year ?? '');
        }
      }}
    >
      <MapContainer
        className="wc-map h-full w-full"
        center={[25, 10]}
        zoom={2}
        minZoom={2}
        zoomSnap={0.25}
        maxZoom={8}
        maxBounds={BOUNDS}
        maxBoundsViscosity={1}
        worldCopyJump={false}
        scrollWheelZoom={false}
        attributionControl={false}
        zoomControl={false}
        preferCanvas
      >
        <ZoomControl position="topright" />
        <MapBehaviour onDismiss={close} />
        {countries && (
          <GeoJSON
            data={countries}
            interactive={false}
            style={() => ({ fill: true, fillColor: '#18233D', fillOpacity: 1, color: '#475677', weight: 0.7 })}
          />
        )}
        {markers.map((m, i) => (
          <Marker key={m.key} position={[m.anchor[1], m.anchor[0]]} icon={icons[i]} keyboard={false} />
        ))}
      </MapContainer>

      {failed && (
        <p className="absolute bottom-3 left-3 z-[1000] rounded bg-black/80 px-3 py-1 text-xs text-[#94A3B8]" role="status">
          Não foi possível carregar o desenho dos países; os marcadores continuam disponíveis.
        </p>
      )}

      {card && open && (
        <div
          ref={cardRef}
          className={`wc-card-wrap wc-card-wrap--${card.placement}`}
          data-testid="wc-card"
          style={{ left: card.left, top: card.top, ['--arrow-x' as string]: `${card.arrowX}px` }}
        >
          <div className="wc-card" role="group" aria-label={open.name}>
            <strong className="wc-card-title">{open.name}</strong>
            {open.years.map((year) => {
              const ok = availableYears.has(year);
              return (
                <button
                  key={year}
                  type="button"
                  className={`wc-year${ok ? '' : ' wc-year--off'}`}
                  data-year={year}
                  data-available={ok}
                  aria-label={`${year}, ${open.name}${ok ? '' : ', em breve'}`}
                  aria-disabled={ok ? undefined : true}
                >
                  {year}
                  {!ok && <small>Em breve</small>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
