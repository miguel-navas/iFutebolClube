// Sedes de todas as edições da Copa do Mundo (códigos como em Edicoes.Sede, banco CopaDoMundo).
// Fonte única para o mapa; quando os dados vierem do banco, só este módulo muda.

/** [longitude, latitude] */
export type Anchor = [number, number];

export interface HostCountry {
  code: string;
  name: string;
  anchor: Anchor;
  /** País atual onde o marcador é colocado, quando a sede não existe mais (ex.: FRG -> GER). */
  placeOn?: string;
}

export interface HostEdition {
  year: string;
  hosts: string[];
}

export interface HostMarker {
  key: string;
  name: string;
  anchor: Anchor;
  years: string[];
}

// Âncoras baseadas em copas.geojson do projeto iFC-Front; Canadá é novo (2026).
const COUNTRIES: HostCountry[] = [
  { code: 'URU', name: 'Uruguai', anchor: [-56, -33] },
  { code: 'ITA', name: 'Itália', anchor: [12.83, 42.83] },
  { code: 'FRA', name: 'França', anchor: [2, 46] },
  { code: 'BRA', name: 'Brasil', anchor: [-55, -10] },
  { code: 'SUI', name: 'Suíça', anchor: [8, 47] },
  { code: 'SWE', name: 'Suécia', anchor: [15, 62] },
  { code: 'CHI', name: 'Chile', anchor: [-71, -30] },
  { code: 'ENG', name: 'Inglaterra', anchor: [-2, 54] },
  { code: 'MEX', name: 'México', anchor: [-102, 23] },
  { code: 'GER', name: 'Alemanha', anchor: [9, 51] },
  { code: 'FRG', name: 'Alemanha', anchor: [9, 51], placeOn: 'GER' },
  { code: 'ARG', name: 'Argentina', anchor: [-64, -34] },
  { code: 'ESP', name: 'Espanha', anchor: [-4, 40] },
  { code: 'USA', name: 'Estados Unidos', anchor: [-97, 38] },
  { code: 'KOR', name: 'Coreia do Sul', anchor: [127.5, 37] },
  { code: 'JPN', name: 'Japão', anchor: [138, 36] },
  { code: 'RSA', name: 'África do Sul', anchor: [24, -29] },
  { code: 'RUS', name: 'Rússia', anchor: [37.61, 55.75] },
  { code: 'QAT', name: 'Catar', anchor: [51.25, 25.5] },
  { code: 'CAN', name: 'Canadá', anchor: [-106, 56] },
];

const EDITIONS: HostEdition[] = [
  { year: '1930', hosts: ['URU'] },
  { year: '1934', hosts: ['ITA'] },
  { year: '1938', hosts: ['FRA'] },
  { year: '1950', hosts: ['BRA'] },
  { year: '1954', hosts: ['SUI'] },
  { year: '1958', hosts: ['SWE'] },
  { year: '1962', hosts: ['CHI'] },
  { year: '1966', hosts: ['ENG'] },
  { year: '1970', hosts: ['MEX'] },
  { year: '1974', hosts: ['FRG'] },
  { year: '1978', hosts: ['ARG'] },
  { year: '1982', hosts: ['ESP'] },
  { year: '1986', hosts: ['MEX'] },
  { year: '1990', hosts: ['ITA'] },
  { year: '1994', hosts: ['USA'] },
  { year: '1998', hosts: ['FRA'] },
  { year: '2002', hosts: ['JPN', 'KOR'] },
  { year: '2006', hosts: ['GER'] },
  { year: '2010', hosts: ['RSA'] },
  { year: '2014', hosts: ['BRA'] },
  { year: '2018', hosts: ['RUS'] },
  { year: '2022', hosts: ['QAT'] },
  { year: '2026', hosts: ['CAN', 'MEX', 'USA'] },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getHostEditions(): HostEdition[] {
  return EDITIONS;
}

export function getHostCountry(code: string): HostCountry | undefined {
  return byCode.get(code);
}

/** Um marcador por país atual, com os anos das edições que sediou (crescente). */
export function getHostMarkers(): HostMarker[] {
  const markers = new Map<string, HostMarker>();
  for (const edition of EDITIONS) {
    for (const code of edition.hosts) {
      const host = byCode.get(code);
      if (!host) continue;
      const target = byCode.get(host.placeOn ?? host.code) ?? host;
      const marker = markers.get(target.code) ?? {
        key: target.code,
        name: target.name,
        anchor: target.anchor,
        years: [],
      };
      marker.years.push(edition.year);
      markers.set(target.code, marker);
    }
  }
  return [...markers.values()];
}
