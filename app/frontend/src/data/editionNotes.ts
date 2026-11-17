import type { SectionKey } from '@/data/registry';

/** Observações de cada tela nas Copas do Mundo anteriores a 2026: formato da época e limites dos dados. */

const FORMATO: Record<number, string> = {
  1930: '13 seleções em 4 grupos (um de 4 e três de 3). Só o 1º de cada grupo avançou, direto às semifinais: não houve quartas de final nem disputa do 3º lugar.',
  1934: '16 seleções em mata-mata direto desde a primeira rodada (aqui chamada de "Rodada preliminar"), sem fase de grupos. Jogo empatado era repetido no dia seguinte, por isso há um jogo a mais nas quartas de final.',
  1938: '15 seleções em mata-mata direto, sem fase de grupos (a Áustria desistiu depois de classificada). Empates eram repetidos em outro jogo, por isso há 9 jogos na primeira rodada e 5 nas quartas de final.',
  1950: '13 seleções. Quatro grupos de tamanhos diferentes (4, 4, 3 e 2 seleções) e depois uma fase final em grupo, com os quatro vencedores jogando todos contra todos. Não houve final: o campeão saiu da pontuação desse grupo.',
  1954: '16 seleções em 4 grupos, mas cada seleção fez só 2 jogos (as cabeças de chave não se enfrentavam). Empates na classificação eram decididos em jogo extra. Do mata-mata em diante, prorrogação de 30 minutos.',
  1958: '16 seleções em 4 grupos de 4, todos contra todos, com 2 avançando. Empates na classificação eram decididos em jogos extras, o que explica os 35 jogos.',
  1962: '16 seleções em 4 grupos de 4; os 2 primeiros de cada grupo avançavam às quartas de final.',
  1966: '16 seleções em 4 grupos de 4; os 2 primeiros de cada grupo avançavam às quartas de final.',
  1970: '16 seleções em 4 grupos de 4; os 2 primeiros de cada grupo avançavam às quartas de final. Primeira Copa com cartões amarelo e vermelho e com substituições.',
  1974: '16 seleções. Duas fases de grupos: 4 grupos de 4 e depois 2 grupos de 4. Não houve semifinais: os vencedores dos dois grupos da 2ª fase jogaram a final e os segundos colocados disputaram o 3º lugar.',
  1978: '16 seleções. Duas fases de grupos: 4 grupos de 4 e depois 2 grupos de 4. Não houve semifinais: os vencedores dos dois grupos da 2ª fase jogaram a final e os segundos colocados disputaram o 3º lugar.',
  1982: '24 seleções em 6 grupos de 4. Os 12 classificados formaram 4 grupos de 3 na 2ª fase, e os vencedores foram às semifinais. Primeira Copa com decisão por pênaltis (semifinal).',
  1986: '24 seleções em 6 grupos de 4; avançavam os 2 primeiros e os 4 melhores terceiros colocados, direto às oitavas de final.',
  1990: '24 seleções em 6 grupos de 4; avançavam os 2 primeiros e os 4 melhores terceiros colocados, direto às oitavas de final.',
  1994: '24 seleções em 6 grupos de 4; avançavam os 2 primeiros e os 4 melhores terceiros colocados, direto às oitavas de final. Vitória passou a valer 3 pontos.',
  1998: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final. Na prorrogação valia o gol de ouro (o primeiro gol encerrava o jogo).',
  2002: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final. Primeira Copa com dois países-sede, e a prorrogação ainda tinha gol de ouro.',
  2006: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final.',
  2010: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final.',
  2014: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final.',
  2018: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final.',
  2022: '32 seleções em 8 grupos de 4; os 2 primeiros avançavam às oitavas de final. Disputada em novembro e dezembro, por causa do calor no Catar.',
};

/** Seleções que já não existem com esse nome e não têm bandeira própria no site (aparece uma bandeira neutra). */
const SEM_BANDEIRA: Record<string, string> = {
  URS: 'União Soviética',
  TCH: 'Tchecoslováquia',
  YUG: 'Iugoslávia',
  GDR: 'Alemanha Oriental (RD da Alemanha)',
  SCG: 'Sérvia e Montenegro',
  ZAI: 'Zaire',
};

const HISTORICAS: Record<string, string> = {
  FRG: 'Alemanha Ocidental (aparece como "RF da Alemanha")',
  GDR: 'Alemanha Oriental',
  URS: 'União Soviética',
  TCH: 'Tchecoslováquia',
  YUG: 'Iugoslávia',
  SCG: 'Sérvia e Montenegro',
  ZAI: 'Zaire (atual RD do Congo)',
  INH: 'Índias Orientais Holandesas (atual Indonésia)',
};

export function copaNotes(year: number, section: SectionKey, teamCodes: string[]): string[] {
  if (year >= 2026 || !(year in FORMATO)) return [];
  const notes: string[] = [];
  const temGrupos = year !== 1934 && year !== 1938;
  const codes = new Set(teamCodes);

  switch (section) {
    case 'overview':
      notes.push('Edição histórica: os dados são fixos e não mudam mais.');
      notes.push(`Formato em ${year}: ${FORMATO[year]}`);
      notes.push(
        'Esta edição não tem a aba Jogadores (as estatísticas individuais só existem para a Copa de 2026) nem Probabilidades e Comparação.',
      );
      break;
    case 'jogos': {
      notes.push(`Formato em ${year}: ${FORMATO[year]}`);
      if (year < 1970)
        notes.push(
          'Não havia cartões amarelo e vermelho nem substituições nessa época: o detalhe do jogo mostra só os gols (e raras expulsões).',
        );
      if (year < 1982)
        notes.push('Não existia decisão por pênaltis: jogos eliminatórios empatados tinham prorrogação, repetição do jogo ou critério de pontos.');
      if (year < 2018)
        notes.push('Público e formação tática dos times só estão disponíveis a partir de 2018. Árbitro, escalações e minuto dos gols aparecem quando o banco os tem.');
      if (year < 1954) notes.push('Os jogos não tinham número de camisa fixo: os números não aparecem nas escalações.');
      break;
    }
    case 'grupos':
      if (temGrupos) {
        notes.push(`Formato em ${year}: ${FORMATO[year]}`);
        if ([1974, 1978, 1982].includes(year))
          notes.push('A 2ª fase de grupos aparece junto com a 1ª, na mesma lista de grupos.');
        if (year === 1950)
          notes.push('A fase final em grupo (sem final) aparece em "Outros jogos" na aba Eliminatórias.');
        if (year === 1954)
          notes.push('Como cada seleção jogou só 2 vezes, o número de jogos na tabela é menor que nas outras Copas.');
      }
      break;
    case 'selecoes': {
      const hist = [...codes].filter((c) => c in HISTORICAS).map((c) => HISTORICAS[c]);
      if (hist.length > 0) notes.push(`Seleções que mudaram de nome ou já não existem: ${hist.join('; ')}.`);
      const semFlag = [...codes].filter((c) => c in SEM_BANDEIRA).map((c) => SEM_BANDEIRA[c]);
      if (semFlag.length > 0) notes.push(`Sem bandeira própria no site (aparece uma bandeira neutra): ${semFlag.join('; ')}.`);
      notes.push('Os elencos vêm das listas oficiais de cada edição. Não há fotos dos jogadores.');
      if (year < 1954) notes.push('Nessa época os jogadores não tinham número fixo de camisa, então o número não aparece.');
      break;
    }
    case 'eliminatorias':
      notes.push(`Formato em ${year}: ${FORMATO[year]}`);
      if (!temGrupos) notes.push('Toda a edição foi mata-mata: não existe a aba Grupos.');
      if (year === 1950) notes.push('Não houve final. Os 6 jogos da fase final em grupo aparecem em "Outros jogos".');
      if ([1930, 1950].includes(year)) notes.push('Não houve disputa do 3º lugar nessa edição.');
      break;
    default:
      break;
  }
  return notes;
}
