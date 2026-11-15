// FIFA World Cup 2026 - Data
// 48 teams, 12 groups of 4, hosted by USA/Mexico/Canada

export interface Team {
  name: string;
  code: string;
  flag: string;
  confederation: string;
  fifaRanking: number;
  group: string;
}

export interface Match {
  id: number;
  date: string;
  time: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  group: string;
  stadium: string;
  city: string;
  stage: string;
  penaltiesA?: number | null;
  penaltiesB?: number | null;
}

export interface GroupStanding {
  team: string;
  code: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Stadium {
  name: string;
  city: string;
  country: string;
  capacity: number;
  image: string;
  lat: number;
  lng: number;
}

export interface BracketMatch {
  id: string;
  round: string;
  teamA: string | null;
  teamB: string | null;
  scoreA: number | null;
  scoreB: number | null;
  date: string;
  stadium: string;
  /** Número do jogo na página do jogo (só nas edições com dados exportados). */
  matchId?: number;
  penaltiesA?: number | null;
  penaltiesB?: number | null;
}

// Flag emoji helper
const flags: Record<string, string> = {
  USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", BRA: "🇧🇷", ARG: "🇦🇷", FRA: "🇫🇷",
  GER: "🇩🇪", ESP: "🇪🇸", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", POR: "🇵🇹", NED: "🇳🇱", BEL: "🇧🇪",
  ITA: "🇮🇹", CRO: "🇭🇷", URU: "🇺🇾", COL: "🇨🇴", JPN: "🇯🇵", KOR: "🇰🇷",
  AUS: "🇦🇺", SEN: "🇸🇳", MAR: "🇲🇦", GHA: "🇬🇭", CMR: "🇨🇲", NGA: "🇳🇬",
  TUN: "🇹🇳", EGY: "🇪🇬", IRN: "🇮🇷", KSA: "🇸🇦", QAT: "🇶🇦", ECU: "🇪🇨",
  CHI: "🇨🇱", PAR: "🇵🇾", PER: "🇵🇪", SRB: "🇷🇸", SUI: "🇨🇭", DEN: "🇩🇰",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", POL: "🇵🇱", SWE: "🇸🇪", CRC: "🇨🇷", JAM: "🇯🇲", HON: "🇭🇳",
  PAN: "🇵🇦", NZL: "🇳🇿", UZB: "🇺🇿", IRQ: "🇮🇶", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", AUT: "🇦🇹",
  UKR: "🇺🇦", CIV: "🇨🇮",
};

export const teams: Team[] = [
  // Group A
  { name: "Estados Unidos", code: "USA", flag: flags.USA, confederation: "CONCACAF", fifaRanking: 11, group: "A" },
  { name: "Marrocos", code: "MAR", flag: flags.MAR, confederation: "CAF", fifaRanking: 14, group: "A" },
  { name: "Escócia", code: "SCO", flag: flags.SCO, confederation: "UEFA", fifaRanking: 38, group: "A" },
  { name: "Nova Zelândia", code: "NZL", flag: flags.NZL, confederation: "OFC", fifaRanking: 93, group: "A" },
  // Group B
  { name: "França", code: "FRA", flag: flags.FRA, confederation: "UEFA", fifaRanking: 2, group: "B" },
  { name: "Colômbia", code: "COL", flag: flags.COL, confederation: "CONMEBOL", fifaRanking: 12, group: "B" },
  { name: "Uzbequistão", code: "UZB", flag: flags.UZB, confederation: "AFC", fifaRanking: 64, group: "B" },
  { name: "Panamá", code: "PAN", flag: flags.PAN, confederation: "CONCACAF", fifaRanking: 47, group: "B" },
  // Group C
  { name: "Argentina", code: "ARG", flag: flags.ARG, confederation: "CONMEBOL", fifaRanking: 1, group: "C" },
  { name: "Dinamarca", code: "DEN", flag: flags.DEN, confederation: "UEFA", fifaRanking: 19, group: "C" },
  { name: "Iraque", code: "IRQ", flag: flags.IRQ, confederation: "AFC", fifaRanking: 55, group: "C" },
  { name: "Peru", code: "PER", flag: flags.PER, confederation: "CONMEBOL", fifaRanking: 32, group: "C" },
  // Group D
  { name: "Brasil", code: "BRA", flag: flags.BRA, confederation: "CONMEBOL", fifaRanking: 5, group: "D" },
  { name: "Itália", code: "ITA", flag: flags.ITA, confederation: "UEFA", fifaRanking: 9, group: "D" },
  { name: "Costa do Marfim", code: "CIV", flag: flags.CIV, confederation: "CAF", fifaRanking: 39, group: "D" },
  { name: "Paraguai", code: "PAR", flag: flags.PAR, confederation: "CONMEBOL", fifaRanking: 58, group: "D" },
  // Group E
  { name: "Espanha", code: "ESP", flag: flags.ESP, confederation: "UEFA", fifaRanking: 3, group: "E" },
  { name: "Japão", code: "JPN", flag: flags.JPN, confederation: "AFC", fifaRanking: 15, group: "E" },
  { name: "Equador", code: "ECU", flag: flags.ECU, confederation: "CONMEBOL", fifaRanking: 28, group: "E" },
  { name: "Costa Rica", code: "CRC", flag: flags.CRC, confederation: "CONCACAF", fifaRanking: 52, group: "E" },
  // Group F
  { name: "Inglaterra", code: "ENG", flag: flags.ENG, confederation: "UEFA", fifaRanking: 4, group: "F" },
  { name: "Senegal", code: "SEN", flag: flags.SEN, confederation: "CAF", fifaRanking: 17, group: "F" },
  { name: "Chile", code: "CHI", flag: flags.CHI, confederation: "CONMEBOL", fifaRanking: 30, group: "F" },
  { name: "Jamaica", code: "JAM", flag: flags.JAM, confederation: "CONCACAF", fifaRanking: 62, group: "F" },
  // Group G
  { name: "Alemanha", code: "GER", flag: flags.GER, confederation: "UEFA", fifaRanking: 6, group: "G" },
  { name: "Uruguai", code: "URU", flag: flags.URU, confederation: "CONMEBOL", fifaRanking: 13, group: "G" },
  { name: "Gana", code: "GHA", flag: flags.GHA, confederation: "CAF", fifaRanking: 44, group: "G" },
  { name: "Honduras", code: "HON", flag: flags.HON, confederation: "CONCACAF", fifaRanking: 72, group: "G" },
  // Group H
  { name: "Portugal", code: "POR", flag: flags.POR, confederation: "UEFA", fifaRanking: 7, group: "H" },
  { name: "Coreia do Sul", code: "KOR", flag: flags.KOR, confederation: "AFC", fifaRanking: 22, group: "H" },
  { name: "Nigéria", code: "NGA", flag: flags.NGA, confederation: "CAF", fifaRanking: 36, group: "H" },
  { name: "Suécia", code: "SWE", flag: flags.SWE, confederation: "UEFA", fifaRanking: 25, group: "H" },
  // Group I
  { name: "Holanda", code: "NED", flag: flags.NED, confederation: "UEFA", fifaRanking: 8, group: "I" },
  { name: "México", code: "MEX", flag: flags.MEX, confederation: "CONCACAF", fifaRanking: 16, group: "I" },
  { name: "Egito", code: "EGY", flag: flags.EGY, confederation: "CAF", fifaRanking: 33, group: "I" },
  { name: "Ucrânia", code: "UKR", flag: flags.UKR, confederation: "UEFA", fifaRanking: 24, group: "I" },
  // Group J
  { name: "Bélgica", code: "BEL", flag: flags.BEL, confederation: "UEFA", fifaRanking: 10, group: "J" },
  { name: "Canadá", code: "CAN", flag: flags.CAN, confederation: "CONCACAF", fifaRanking: 40, group: "J" },
  { name: "Irã", code: "IRN", flag: flags.IRN, confederation: "AFC", fifaRanking: 20, group: "J" },
  { name: "Camarões", code: "CMR", flag: flags.CMR, confederation: "CAF", fifaRanking: 46, group: "J" },
  // Group K
  { name: "Croácia", code: "CRO", flag: flags.CRO, confederation: "UEFA", fifaRanking: 18, group: "K" },
  { name: "Suíça", code: "SUI", flag: flags.SUI, confederation: "UEFA", fifaRanking: 21, group: "K" },
  { name: "Tunísia", code: "TUN", flag: flags.TUN, confederation: "CAF", fifaRanking: 35, group: "K" },
  { name: "Polônia", code: "POL", flag: flags.POL, confederation: "UEFA", fifaRanking: 26, group: "K" },
  // Group L
  { name: "Austrália", code: "AUS", flag: flags.AUS, confederation: "AFC", fifaRanking: 23, group: "L" },
  { name: "Sérvia", code: "SRB", flag: flags.SRB, confederation: "UEFA", fifaRanking: 27, group: "L" },
  { name: "Arábia Saudita", code: "KSA", flag: flags.KSA, confederation: "AFC", fifaRanking: 56, group: "L" },
  { name: "Áustria", code: "AUT", flag: flags.AUT, confederation: "UEFA", fifaRanking: 29, group: "L" },
];

export const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function getGroupStandings(group: string): GroupStanding[] {
  const groupTeams = teams.filter((t) => t.group === group);
  return groupTeams.map((t) => ({
    team: t.name,
    code: t.code,
    flag: t.flag,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
}

export const stadiums: Stadium[] = [
  { name: "MetLife Stadium", city: "Nova York/Nova Jersey", country: "EUA", capacity: 82500, image: "🏟️", lat: 40.8135, lng: -74.0745 },
  { name: "AT&T Stadium", city: "Dallas", country: "EUA", capacity: 80000, image: "🏟️", lat: 32.7473, lng: -97.0945 },
  { name: "SoFi Stadium", city: "Los Angeles", country: "EUA", capacity: 70240, image: "🏟️", lat: 33.9535, lng: -118.3392 },
  { name: "Hard Rock Stadium", city: "Miami", country: "EUA", capacity: 64767, image: "🏟️", lat: 25.958, lng: -80.2389 },
  { name: "NRG Stadium", city: "Houston", country: "EUA", capacity: 72220, image: "🏟️", lat: 29.6847, lng: -95.4107 },
  { name: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA", capacity: 71000, image: "🏟️", lat: 33.7554, lng: -84.4010 },
  { name: "Lincoln Financial Field", city: "Filadélfia", country: "EUA", capacity: 69176, image: "🏟️", lat: 39.9008, lng: -75.1674 },
  { name: "Lumen Field", city: "Seattle", country: "EUA", capacity: 68740, image: "🏟️", lat: 47.5952, lng: -122.3316 },
  { name: "Gillette Stadium", city: "Boston/Foxborough", country: "EUA", capacity: 65878, image: "🏟️", lat: 42.0909, lng: -71.2643 },
  { name: "Arrowhead Stadium", city: "Kansas City", country: "EUA", capacity: 76416, image: "🏟️", lat: 39.0489, lng: -94.4839 },
  { name: "Levi's Stadium", city: "São Francisco/Santa Clara", country: "EUA", capacity: 68500, image: "🏟️", lat: 37.4033, lng: -121.9694 },
  { name: "Estadio Azteca", city: "Cidade do México", country: "México", capacity: 87523, image: "🏟️", lat: 19.3029, lng: -99.1505 },
  { name: "Estadio BBVA", city: "Monterrey", country: "México", capacity: 53500, image: "🏟️", lat: 25.6699, lng: -100.2447 },
  { name: "Estadio Akron", city: "Guadalajara", country: "México", capacity: 49850, image: "🏟️", lat: 20.6810, lng: -103.4625 },
  { name: "BMO Field", city: "Toronto", country: "Canadá", capacity: 45736, image: "🏟️", lat: 43.6332, lng: -79.4186 },
  { name: "BC Place", city: "Vancouver", country: "Canadá", capacity: 54500, image: "🏟️", lat: 49.2768, lng: -123.1118 },
];

// Sample matches for the group stage
export const matches: Match[] = [
  // Group A - Matchday 1
  { id: 1, date: "2026-06-11", time: "20:00", teamA: "USA", teamB: "MAR", scoreA: null, scoreB: null, group: "A", stadium: "MetLife Stadium", city: "Nova York", stage: "Fase de Grupos" },
  { id: 2, date: "2026-06-11", time: "17:00", teamA: "SCO", teamB: "NZL", scoreA: null, scoreB: null, group: "A", stadium: "AT&T Stadium", city: "Dallas", stage: "Fase de Grupos" },
  // Group A - Matchday 2
  { id: 3, date: "2026-06-15", time: "20:00", teamA: "USA", teamB: "SCO", scoreA: null, scoreB: null, group: "A", stadium: "MetLife Stadium", city: "Nova York", stage: "Fase de Grupos" },
  { id: 4, date: "2026-06-15", time: "17:00", teamA: "MAR", teamB: "NZL", scoreA: null, scoreB: null, group: "A", stadium: "SoFi Stadium", city: "Los Angeles", stage: "Fase de Grupos" },
  // Group A - Matchday 3
  { id: 5, date: "2026-06-19", time: "18:00", teamA: "MAR", teamB: "SCO", scoreA: null, scoreB: null, group: "A", stadium: "Hard Rock Stadium", city: "Miami", stage: "Fase de Grupos" },
  { id: 6, date: "2026-06-19", time: "18:00", teamA: "USA", teamB: "NZL", scoreA: null, scoreB: null, group: "A", stadium: "MetLife Stadium", city: "Nova York", stage: "Fase de Grupos" },
  // Group B
  { id: 7, date: "2026-06-12", time: "15:00", teamA: "FRA", teamB: "COL", scoreA: null, scoreB: null, group: "B", stadium: "SoFi Stadium", city: "Los Angeles", stage: "Fase de Grupos" },
  { id: 8, date: "2026-06-12", time: "18:00", teamA: "UZB", teamB: "PAN", scoreA: null, scoreB: null, group: "B", stadium: "NRG Stadium", city: "Houston", stage: "Fase de Grupos" },
  { id: 9, date: "2026-06-16", time: "15:00", teamA: "FRA", teamB: "UZB", scoreA: null, scoreB: null, group: "B", stadium: "SoFi Stadium", city: "Los Angeles", stage: "Fase de Grupos" },
  { id: 10, date: "2026-06-16", time: "18:00", teamA: "COL", teamB: "PAN", scoreA: null, scoreB: null, group: "B", stadium: "Hard Rock Stadium", city: "Miami", stage: "Fase de Grupos" },
  { id: 11, date: "2026-06-20", time: "18:00", teamA: "COL", teamB: "UZB", scoreA: null, scoreB: null, group: "B", stadium: "Mercedes-Benz Stadium", city: "Atlanta", stage: "Fase de Grupos" },
  { id: 12, date: "2026-06-20", time: "18:00", teamA: "FRA", teamB: "PAN", scoreA: null, scoreB: null, group: "B", stadium: "SoFi Stadium", city: "Los Angeles", stage: "Fase de Grupos" },
  // Group C
  { id: 13, date: "2026-06-12", time: "21:00", teamA: "ARG", teamB: "DEN", scoreA: null, scoreB: null, group: "C", stadium: "Hard Rock Stadium", city: "Miami", stage: "Fase de Grupos" },
  { id: 14, date: "2026-06-12", time: "12:00", teamA: "IRQ", teamB: "PER", scoreA: null, scoreB: null, group: "C", stadium: "Lincoln Financial Field", city: "Filadélfia", stage: "Fase de Grupos" },
  { id: 15, date: "2026-06-16", time: "21:00", teamA: "ARG", teamB: "IRQ", scoreA: null, scoreB: null, group: "C", stadium: "Hard Rock Stadium", city: "Miami", stage: "Fase de Grupos" },
  { id: 16, date: "2026-06-16", time: "12:00", teamA: "DEN", teamB: "PER", scoreA: null, scoreB: null, group: "C", stadium: "Lumen Field", city: "Seattle", stage: "Fase de Grupos" },
  { id: 17, date: "2026-06-20", time: "21:00", teamA: "DEN", teamB: "IRQ", scoreA: null, scoreB: null, group: "C", stadium: "Lincoln Financial Field", city: "Filadélfia", stage: "Fase de Grupos" },
  { id: 18, date: "2026-06-20", time: "21:00", teamA: "ARG", teamB: "PER", scoreA: null, scoreB: null, group: "C", stadium: "Hard Rock Stadium", city: "Miami", stage: "Fase de Grupos" },
  // Group D
  { id: 19, date: "2026-06-13", time: "18:00", teamA: "BRA", teamB: "ITA", scoreA: null, scoreB: null, group: "D", stadium: "Estadio Azteca", city: "Cidade do México", stage: "Fase de Grupos" },
  { id: 20, date: "2026-06-13", time: "15:00", teamA: "CIV", teamB: "PAR", scoreA: null, scoreB: null, group: "D", stadium: "Estadio BBVA", city: "Monterrey", stage: "Fase de Grupos" },
  { id: 21, date: "2026-06-17", time: "18:00", teamA: "BRA", teamB: "CIV", scoreA: null, scoreB: null, group: "D", stadium: "Estadio Azteca", city: "Cidade do México", stage: "Fase de Grupos" },
  { id: 22, date: "2026-06-17", time: "15:00", teamA: "ITA", teamB: "PAR", scoreA: null, scoreB: null, group: "D", stadium: "Estadio Akron", city: "Guadalajara", stage: "Fase de Grupos" },
  { id: 23, date: "2026-06-21", time: "18:00", teamA: "ITA", teamB: "CIV", scoreA: null, scoreB: null, group: "D", stadium: "Estadio BBVA", city: "Monterrey", stage: "Fase de Grupos" },
  { id: 24, date: "2026-06-21", time: "18:00", teamA: "BRA", teamB: "PAR", scoreA: null, scoreB: null, group: "D", stadium: "Estadio Azteca", city: "Cidade do México", stage: "Fase de Grupos" },
  // Group E
  { id: 25, date: "2026-06-13", time: "21:00", teamA: "ESP", teamB: "JPN", scoreA: null, scoreB: null, group: "E", stadium: "AT&T Stadium", city: "Dallas", stage: "Fase de Grupos" },
  { id: 26, date: "2026-06-13", time: "12:00", teamA: "ECU", teamB: "CRC", scoreA: null, scoreB: null, group: "E", stadium: "Gillette Stadium", city: "Boston", stage: "Fase de Grupos" },
  { id: 27, date: "2026-06-17", time: "21:00", teamA: "ESP", teamB: "ECU", scoreA: null, scoreB: null, group: "E", stadium: "AT&T Stadium", city: "Dallas", stage: "Fase de Grupos" },
  { id: 28, date: "2026-06-17", time: "12:00", teamA: "JPN", teamB: "CRC", scoreA: null, scoreB: null, group: "E", stadium: "Arrowhead Stadium", city: "Kansas City", stage: "Fase de Grupos" },
  { id: 29, date: "2026-06-21", time: "21:00", teamA: "JPN", teamB: "ECU", scoreA: null, scoreB: null, group: "E", stadium: "Gillette Stadium", city: "Boston", stage: "Fase de Grupos" },
  { id: 30, date: "2026-06-21", time: "21:00", teamA: "ESP", teamB: "CRC", scoreA: null, scoreB: null, group: "E", stadium: "AT&T Stadium", city: "Dallas", stage: "Fase de Grupos" },
  // Group F
  { id: 31, date: "2026-06-14", time: "18:00", teamA: "ENG", teamB: "SEN", scoreA: null, scoreB: null, group: "F", stadium: "Mercedes-Benz Stadium", city: "Atlanta", stage: "Fase de Grupos" },
  { id: 32, date: "2026-06-14", time: "15:00", teamA: "CHI", teamB: "JAM", scoreA: null, scoreB: null, group: "F", stadium: "Levi's Stadium", city: "São Francisco", stage: "Fase de Grupos" },
  { id: 33, date: "2026-06-18", time: "18:00", teamA: "ENG", teamB: "CHI", scoreA: null, scoreB: null, group: "F", stadium: "Mercedes-Benz Stadium", city: "Atlanta", stage: "Fase de Grupos" },
  { id: 34, date: "2026-06-18", time: "15:00", teamA: "SEN", teamB: "JAM", scoreA: null, scoreB: null, group: "F", stadium: "BMO Field", city: "Toronto", stage: "Fase de Grupos" },
  { id: 35, date: "2026-06-22", time: "18:00", teamA: "SEN", teamB: "CHI", scoreA: null, scoreB: null, group: "F", stadium: "Levi's Stadium", city: "São Francisco", stage: "Fase de Grupos" },
  { id: 36, date: "2026-06-22", time: "18:00", teamA: "ENG", teamB: "JAM", scoreA: null, scoreB: null, group: "F", stadium: "Mercedes-Benz Stadium", city: "Atlanta", stage: "Fase de Grupos" },
  // Groups G-L (abbreviated for MVP - key matches)
  { id: 37, date: "2026-06-14", time: "21:00", teamA: "GER", teamB: "URU", scoreA: null, scoreB: null, group: "G", stadium: "NRG Stadium", city: "Houston", stage: "Fase de Grupos" },
  { id: 38, date: "2026-06-14", time: "12:00", teamA: "GHA", teamB: "HON", scoreA: null, scoreB: null, group: "G", stadium: "BC Place", city: "Vancouver", stage: "Fase de Grupos" },
  { id: 39, date: "2026-06-15", time: "15:00", teamA: "POR", teamB: "KOR", scoreA: null, scoreB: null, group: "H", stadium: "Lincoln Financial Field", city: "Filadélfia", stage: "Fase de Grupos" },
  { id: 40, date: "2026-06-15", time: "12:00", teamA: "NGA", teamB: "SWE", scoreA: null, scoreB: null, group: "H", stadium: "Lumen Field", city: "Seattle", stage: "Fase de Grupos" },
  { id: 41, date: "2026-06-11", time: "15:00", teamA: "NED", teamB: "MEX", scoreA: null, scoreB: null, group: "I", stadium: "Estadio Azteca", city: "Cidade do México", stage: "Fase de Grupos" },
  { id: 42, date: "2026-06-11", time: "12:00", teamA: "EGY", teamB: "UKR", scoreA: null, scoreB: null, group: "I", stadium: "BMO Field", city: "Toronto", stage: "Fase de Grupos" },
  { id: 43, date: "2026-06-12", time: "15:00", teamA: "BEL", teamB: "CAN", scoreA: null, scoreB: null, group: "J", stadium: "BC Place", city: "Vancouver", stage: "Fase de Grupos" },
  { id: 44, date: "2026-06-12", time: "12:00", teamA: "IRN", teamB: "CMR", scoreA: null, scoreB: null, group: "J", stadium: "Arrowhead Stadium", city: "Kansas City", stage: "Fase de Grupos" },
  { id: 45, date: "2026-06-13", time: "15:00", teamA: "CRO", teamB: "SUI", scoreA: null, scoreB: null, group: "K", stadium: "Gillette Stadium", city: "Boston", stage: "Fase de Grupos" },
  { id: 46, date: "2026-06-13", time: "12:00", teamA: "TUN", teamB: "POL", scoreA: null, scoreB: null, group: "K", stadium: "Levi's Stadium", city: "São Francisco", stage: "Fase de Grupos" },
  { id: 47, date: "2026-06-14", time: "15:00", teamA: "AUS", teamB: "SRB", scoreA: null, scoreB: null, group: "L", stadium: "BMO Field", city: "Toronto", stage: "Fase de Grupos" },
  { id: 48, date: "2026-06-14", time: "12:00", teamA: "KSA", teamB: "AUT", scoreA: null, scoreB: null, group: "L", stadium: "Estadio Akron", city: "Guadalajara", stage: "Fase de Grupos" },
];

export const bracketMatches: BracketMatch[] = [
  // Round of 32
  { id: "R32-1", round: "Oitavas", teamA: "1ºA", teamB: "2ºC", scoreA: null, scoreB: null, date: "2026-06-28", stadium: "MetLife Stadium" },
  { id: "R32-2", round: "Oitavas", teamA: "1ºB", teamB: "2ºD", scoreA: null, scoreB: null, date: "2026-06-28", stadium: "SoFi Stadium" },
  { id: "R32-3", round: "Oitavas", teamA: "1ºC", teamB: "2ºA", scoreA: null, scoreB: null, date: "2026-06-29", stadium: "Hard Rock Stadium" },
  { id: "R32-4", round: "Oitavas", teamA: "1ºD", teamB: "2ºB", scoreA: null, scoreB: null, date: "2026-06-29", stadium: "Estadio Azteca" },
  { id: "R32-5", round: "Oitavas", teamA: "1ºE", teamB: "2ºG", scoreA: null, scoreB: null, date: "2026-06-30", stadium: "AT&T Stadium" },
  { id: "R32-6", round: "Oitavas", teamA: "1ºF", teamB: "2ºH", scoreA: null, scoreB: null, date: "2026-06-30", stadium: "Mercedes-Benz Stadium" },
  { id: "R32-7", round: "Oitavas", teamA: "1ºG", teamB: "2ºE", scoreA: null, scoreB: null, date: "2026-07-01", stadium: "NRG Stadium" },
  { id: "R32-8", round: "Oitavas", teamA: "1ºH", teamB: "2ºF", scoreA: null, scoreB: null, date: "2026-07-01", stadium: "Lincoln Financial Field" },
  { id: "R32-9", round: "Oitavas", teamA: "1ºI", teamB: "2ºK", scoreA: null, scoreB: null, date: "2026-07-02", stadium: "Lumen Field" },
  { id: "R32-10", round: "Oitavas", teamA: "1ºJ", teamB: "2ºL", scoreA: null, scoreB: null, date: "2026-07-02", stadium: "BC Place" },
  { id: "R32-11", round: "Oitavas", teamA: "1ºK", teamB: "2ºI", scoreA: null, scoreB: null, date: "2026-07-03", stadium: "Gillette Stadium" },
  { id: "R32-12", round: "Oitavas", teamA: "1ºL", teamB: "2ºJ", scoreA: null, scoreB: null, date: "2026-07-03", stadium: "Arrowhead Stadium" },
  // Quarter-finals
  { id: "QF-1", round: "Quartas", teamA: "V R32-1", teamB: "V R32-2", scoreA: null, scoreB: null, date: "2026-07-06", stadium: "MetLife Stadium" },
  { id: "QF-2", round: "Quartas", teamA: "V R32-3", teamB: "V R32-4", scoreA: null, scoreB: null, date: "2026-07-06", stadium: "SoFi Stadium" },
  { id: "QF-3", round: "Quartas", teamA: "V R32-5", teamB: "V R32-6", scoreA: null, scoreB: null, date: "2026-07-07", stadium: "AT&T Stadium" },
  { id: "QF-4", round: "Quartas", teamA: "V R32-7", teamB: "V R32-8", scoreA: null, scoreB: null, date: "2026-07-07", stadium: "Hard Rock Stadium" },
  // Semi-finals
  { id: "SF-1", round: "Semifinal", teamA: "V QF-1", teamB: "V QF-2", scoreA: null, scoreB: null, date: "2026-07-11", stadium: "MetLife Stadium" },
  { id: "SF-2", round: "Semifinal", teamA: "V QF-3", teamB: "V QF-4", scoreA: null, scoreB: null, date: "2026-07-12", stadium: "AT&T Stadium" },
  // Third place
  { id: "3RD", round: "3º Lugar", teamA: "P SF-1", teamB: "P SF-2", scoreA: null, scoreB: null, date: "2026-07-18", stadium: "Hard Rock Stadium" },
  // Final
  { id: "FINAL", round: "Final", teamA: "V SF-1", teamB: "V SF-2", scoreA: null, scoreB: null, date: "2026-07-19", stadium: "MetLife Stadium" },
];

export function getTeamByCode(code: string): Team | undefined {
  return teams.find((t) => t.code === code);
}

export function getMatchesByGroup(group: string): Match[] {
  return matches.filter((m) => m.group === group);
}

export function getMatchesByDate(date: string): Match[] {
  return matches.filter((m) => m.date === date);
}

export function getMatchDates(): string[] {
  return [...new Set(matches.map((m) => m.date))].sort();
}

export const confederations = [
  { code: "UEFA", name: "Europa", color: "#3B82F6" },
  { code: "CONMEBOL", name: "América do Sul", color: "#22C55E" },
  { code: "CONCACAF", name: "América do Norte/Central", color: "#EAB308" },
  { code: "CAF", name: "África", color: "#F97316" },
  { code: "AFC", name: "Ásia", color: "#EF4444" },
  { code: "OFC", name: "Oceania", color: "#8B5CF6" },
];