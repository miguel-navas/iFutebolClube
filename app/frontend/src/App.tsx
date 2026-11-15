import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Matches from './pages/Matches';
import Groups from './pages/Groups';
import MatchDetail from './pages/MatchDetail';
import Teams from './pages/Teams';
import PlayerStats from './pages/PlayerStats';
import Probabilities from './pages/Probabilities';
import Comparison from './pages/Comparison';
import TeamDetail from './pages/TeamDetail';
import Bracket from './pages/Bracket';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import Hub from './pages/Hub';
import Competition from './pages/Competition';
import NotFound from './pages/NotFound';
import { EditionLayout } from './contexts/EditionContext';
import { LegacyRedirect, LegacyTeamRedirect } from './components/LegacyRedirects';
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MODULE_PROVIDERS_START */}
    {/* MODULE_PROVIDERS_END */}
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Hub />} />
          {/* Endereços antigos (Copa do Mundo 2026) */}
          <Route path="/matches" element={<LegacyRedirect section="jogos" />} />
          <Route path="/groups" element={<LegacyRedirect section="grupos" />} />
          <Route path="/teams" element={<LegacyRedirect section="selecoes" />} />
          <Route path="/teams/:code" element={<LegacyTeamRedirect />} />
          <Route path="/bracket" element={<LegacyRedirect section="eliminatorias" />} />
          <Route path="/stadiums" element={<LegacyRedirect section="estadios" />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          {/* MODULE_ROUTES_START */}
          {/* MODULE_ROUTES_END */}
          <Route path="/:competition" element={<Competition />} />
          <Route path="/:competition/:edition" element={<EditionLayout />}>
            <Route index element={<Index />} />
            <Route path="jogos" element={<Matches />} />
            <Route path="jogos/:id" element={<MatchDetail />} />
            <Route path="grupos" element={<Groups />} />
            <Route path="selecoes" element={<Teams />} />
            <Route path="selecoes/:code" element={<TeamDetail />} />
            <Route path="jogadores" element={<PlayerStats />} />
            <Route path="probabilidades" element={<Probabilities />} />
            <Route path="comparacao" element={<Comparison />} />
            <Route path="eliminatorias" element={<Bracket />} />
            <Route path="estadios" element={<Bracket />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    {/* MODULE_PROVIDERS_CLOSE */}
  </QueryClientProvider>
);

export default App;