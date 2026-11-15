import { Navigate, useParams } from 'react-router-dom';
import type { SectionKey } from '@/data/registry';
import { editionPath } from '@/lib/editionPaths';

// Endereços antigos pertenciam à Copa do Mundo 2026.
export function LegacyRedirect({ section }: { section: SectionKey }) {
  return <Navigate to={editionPath('copa', '2026', section)} replace />;
}

export function LegacyTeamRedirect() {
  const { code = '' } = useParams();
  return <Navigate to={editionPath('copa', '2026', 'selecoes', code)} replace />;
}
