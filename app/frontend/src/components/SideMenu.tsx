import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu, PanelLeftClose, Trophy } from 'lucide-react';
import { listAvailableEditions, listCompetitions } from '@/data/registry';
import { editionPath } from '@/lib/editionPaths';

const STORAGE_KEY = 'ifc:side-menu-open';

function initialOpen(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true' || saved === 'false') return saved === 'true';
  } catch {
    // sem armazenamento: usa o padrão por largura
  }
  return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
}

/** Estado aberto/fechado do menu lateral, lembrado neste navegador. */
export function useSideMenu() {
  const [open, setOpen] = useState<boolean>(initialOpen);
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignora
      }
      return next;
    });
  }, []);
  return { open, toggle };
}

export function SideMenuToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={open}
      aria-controls="side-menu"
      data-testid="side-menu-toggle"
      className="absolute left-3 top-3 z-[1100] flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#0A0F1C]/90 text-white shadow-lg backdrop-blur hover:border-[#D4AF37]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {open ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

export default function SideMenu({ open, competition = '' }: { open: boolean; competition?: string }) {
  const competitions = listCompetitions();
  // Clicar na competição que já está aberta recolhe as edições; ao trocar de competição volta a abrir.
  const [recolhida, setRecolhida] = useState(false);
  useEffect(() => setRecolhida(false), [competition]);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // edição aberta no momento (/<competição>/<ano>/...), para marcar no seletor
  const anoAtual = competition ? pathname.match(new RegExp(`^/${competition}/(\\d{4})`))?.[1] ?? '' : '';

  return (
    <aside
      id="side-menu"
      data-testid="side-menu"
      aria-label="Menu lateral"
      className={`h-full shrink-0 overflow-hidden border-[#1E293B] bg-[#0A0F1C] transition-[width] duration-200 ${
        open ? 'w-64 border-r' : 'w-0'
      }`}
    >
      {open && (
        <nav className="scroll-sutil flex h-full w-64 flex-col gap-6 overflow-y-auto px-4 pb-6 pt-16">
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8960C]">
              <Trophy className="h-4 w-4 text-[#0A0F1C]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">iFutebolClube</span>
          </div>

          <Link
            to="/"
            aria-current={competition === '' ? 'page' : undefined}
            data-testid="menu-home"
            className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium ${
              competition === '' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Home className="h-4 w-4" />
            Início
          </Link>

          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">Competições</p>
            <ul className="flex flex-col gap-1">
              {competitions.map((c) => {
                const current = c.slug === competition;
                const aberta = current && !recolhida;
                const editions = aberta ? listAvailableEditions(c.slug) : [];
                return (
                  <li key={c.slug}>
                    <Link
                      to={`/${c.slug}`}
                      aria-current={current ? 'page' : undefined}
                      aria-expanded={current ? aberta : undefined}
                      onClick={(e) => {
                        if (current) {
                          e.preventDefault();
                          setRecolhida((r) => !r);
                        }
                      }}
                      data-testid={`menu-competition-${c.slug}`}
                      className={`block rounded-lg px-2 py-2 text-sm font-semibold ${
                        current ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {c.name}
                    </Link>
                    {aberta && (
                      <div className="mb-1 ml-3 mt-1 border-l border-[#1E293B] pl-3">
                        {editions.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-[#94A3B8]" data-testid="menu-em-breve">
                            Em breve
                          </p>
                        ) : (
                          <select
                            aria-label={`Edição de ${c.name}`}
                            data-testid="menu-edition-select"
                            value={anoAtual}
                            onChange={(ev) => {
                              if (ev.target.value) navigate(editionPath(c.slug, ev.target.value));
                            }}
                            className="w-full cursor-pointer [color-scheme:dark] rounded-md border border-[#1E293B] bg-[#131A2E] px-2 py-1.5 text-sm text-white hover:border-[#D4AF37]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
                          >
                            <option value="" disabled>
                              Escolha a edição
                            </option>
                            {editions.map((e) => (
                              <option key={e.year} value={e.year} data-testid={`edition-${e.year}`}>
                                {e.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      )}
    </aside>
  );
}
