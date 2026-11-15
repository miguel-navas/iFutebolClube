/** Nomes neutros que a FIFA usa na Copa 2026 -> nome do estádio na lista de sedes. */
const ALIASES: Record<string, string> = {
  'Atlanta Stadium': 'Mercedes-Benz Stadium',
  'BC Place Vancouver': 'BC Place',
  'Boston Stadium': 'Gillette Stadium',
  'Dallas Stadium': 'AT&T Stadium',
  'Guadalajara Stadium': 'Estadio Akron',
  'Houston Stadium': 'NRG Stadium',
  'Kansas City Stadium': 'Arrowhead Stadium',
  'Los Angeles Stadium': 'SoFi Stadium',
  'Miami Stadium': 'Hard Rock Stadium',
  'Monterrey Stadium': 'Estadio BBVA',
  'New York/New Jersey Stadium': 'MetLife Stadium',
  'Philadelphia Stadium': 'Lincoln Financial Field',
  'San Francisco Bay Area Stadium': "Levi's Stadium",
  'Seattle Stadium': 'Lumen Field',
  'Toronto Stadium': 'BMO Field',
};

/** Nome do estádio como aparece na lista de sedes (o mesmo nome se não houver apelido). */
export function stadiumKey(name: string): string {
  return ALIASES[name] ?? name;
}

/** O estádio da partida é o mesmo da lista de sedes, mesmo com nomes diferentes. */
export function sameStadium(matchStadium: string, listedName: string): boolean {
  return stadiumKey(matchStadium) === stadiumKey(listedName);
}
