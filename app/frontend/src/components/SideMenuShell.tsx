import type { ReactNode } from 'react';
import SideMenu, { SideMenuToggle, useSideMenu } from '@/components/SideMenu';

/** Estrutura comum da tela inicial e das páginas de competição: menu lateral retrátil + conteúdo. */
export default function SideMenuShell({
  competition,
  children,
}: {
  competition?: string;
  children: ReactNode;
}) {
  const menu = useSideMenu();
  return (
    <div className="flex h-screen overflow-hidden text-white">
      <SideMenu open={menu.open} competition={competition} />
      <main className="relative h-full min-w-0 flex-1">
        <SideMenuToggle open={menu.open} onToggle={menu.toggle} />
        {children}
      </main>
    </div>
  );
}
