// Código de seleção (FIFA, 3 letras) -> código do país (ISO 3166-1 alfa-2 ou subdivisão do Reino Unido).
const ISO: Record<string, string> = {
  ALB: 'al',
  ALG: 'dz',
  AND: 'ad',
  ANG: 'ao',
  ARG: 'ar',
  ARM: 'am',
  AUS: 'au',
  AUT: 'at',
  AZE: 'az',
  BEL: 'be',
  BEN: 'bj',
  BFA: 'bf',
  BHR: 'bh',
  BIH: 'ba',
  BLR: 'by',
  BOL: 'bo',
  BRA: 'br',
  BUL: 'bg',
  CAN: 'ca',
  CHI: 'cl',
  CHN: 'cn',
  CIV: 'ci',
  CMR: 'cm',
  COD: 'cd',
  COL: 'co',
  CPV: 'cv',
  CRC: 'cr',
  CRO: 'hr',
  CUB: 'cu',
  CUW: 'cw',
  CYP: 'cy',
  CZE: 'cz',
  DEN: 'dk',
  ECU: 'ec',
  EGY: 'eg',
  ENG: 'gb-eng',
  ESP: 'es',
  EST: 'ee',
  FIN: 'fi',
  FRA: 'fr',
  FRG: 'de',
  FRO: 'fo',
  GAB: 'ga',
  GEO: 'ge',
  GER: 'de',
  GHA: 'gh',
  GIB: 'gi',
  GRE: 'gr',
  GUA: 'gt',
  GUI: 'gn',
  HAI: 'ht',
  HON: 'hn',
  HUN: 'hu',
  IDN: 'id',
  INH: 'id',
  IRL: 'ie',
  IRN: 'ir',
  IRQ: 'iq',
  ISL: 'is',
  ISR: 'il',
  ITA: 'it',
  JAM: 'jm',
  JOR: 'jo',
  JPN: 'jp',
  KAZ: 'kz',
  KOR: 'kr',
  KOS: 'xk',
  KSA: 'sa',
  KUW: 'kw',
  LIE: 'li',
  LTU: 'lt',
  LUX: 'lu',
  LVA: 'lv',
  MAR: 'ma',
  MDA: 'md',
  MEX: 'mx',
  MKD: 'mk',
  MLI: 'ml',
  MLT: 'mt',
  MNE: 'me',
  NED: 'nl',
  NGA: 'ng',
  NIR: 'gb-nir',
  NOR: 'no',
  NZL: 'nz',
  OMA: 'om',
  PAN: 'pa',
  PAR: 'py',
  PER: 'pe',
  POL: 'pl',
  POR: 'pt',
  PRK: 'kp',
  QAT: 'qa',
  ROU: 'ro',
  RSA: 'za',
  RUS: 'ru',
  SCO: 'gb-sct',
  SEN: 'sn',
  SLV: 'sv',
  SMR: 'sm',
  SRB: 'rs',
  SUI: 'ch',
  SUR: 'sr',
  SVK: 'sk',
  SVN: 'si',
  SWE: 'se',
  TOG: 'tg',
  TRI: 'tt',
  TUN: 'tn',
  TUR: 'tr',
  UAE: 'ae',
  UKR: 'ua',
  URU: 'uy',
  USA: 'us',
  UZB: 'uz',
  VEN: 've',
  WAL: 'gb-wls',
};

export const NEUTRAL_FLAG = '🏳️';

/** Código de país da bandeira, ou `null` se o código da seleção for desconhecido. */
export function flagCountry(code: string): string | null {
  return ISO[code.toUpperCase()] ?? null;
}

/** Emoji da bandeira da seleção; bandeira neutra se o código for desconhecido. */
export function flagEmoji(code: string): string {
  const iso = flagCountry(code);
  if (!iso) return NEUTRAL_FLAG;
  if (iso.includes('-')) {
    // Inglaterra, Escócia, País de Gales e Irlanda do Norte usam sequência de tags.
    const tags = [...iso.replace('-', '')].map(
      (c) => 0xe0000 + c.charCodeAt(0),
    );
    return String.fromCodePoint(0x1f3f4, ...tags, 0xe007f);
  }
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Endereço da imagem da bandeira (SVG guardado em public/flags), ou `null` se o código for desconhecido. */
export function flagUrl(code: string): string | null {
  const iso = flagCountry(code);
  return iso ? `${import.meta.env.BASE_URL}flags/${iso}.svg` : null;
}
