"""Gera summary.json de cada edição já exportada (campeão, 2º a 4º lugar, artilheiros, gols).

Lê apenas os JSONs de app/frontend/public/data/editions; não precisa de banco.
Uso: python scripts/gerar-resumos-edicoes.py [prefixo]   (ex.: copa, eurocopa, nations-league; padrão: todos)
"""
import glob
import json
import os
import re
import sys
from collections import defaultdict

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'frontend', 'public', 'data', 'editions')


def _carrega(caminho):
    with open(caminho, encoding='utf-8') as f:
        return json.load(f)


def _vencedor(m, pasta):
    """(vencedor, perdedor) de um jogo eliminatório; usa pênaltis quando empatado."""
    a, b = m['scoreA'], m['scoreB']
    if a is None or b is None:
        return None
    if a == b and m.get('penaltiesA') is not None and m.get('penaltiesB') is not None and m['penaltiesA'] != m['penaltiesB']:
        a, b = m['penaltiesA'], m['penaltiesB']
    elif a == b:
        try:
            p = _carrega(os.path.join(pasta, 'matches', f"{m['id']}.json")).get('penalties')
        except OSError:
            p = None
        if not p or p['a'] == p['b']:
            return None
        a, b = p['a'], p['b']
    return (m['teamA'], m['teamB']) if a > b else (m['teamB'], m['teamA'])


def _junta_ida_volta(jogos):
    """Confrontos de ida e volta ('(ida)'/'(volta)' no fim da rodada) viram um jogo só, com placar agregado."""
    ids = re.compile(r'\s*\((ida|volta)\)\s*$', re.I)
    pares, saida = defaultdict(list), []
    for m in jogos:
        if ids.search(m['stage']):
            pares[(ids.sub('', m['stage']), frozenset((m['teamA'], m['teamB'])))].append(m)
        else:
            saida.append(m)
    for (rodada, _), lista in pares.items():
        lista.sort(key=lambda m: (m['date'], m['id']))
        ida, volta = lista[0], lista[-1]
        if len(lista) < 2:
            saida.append({**ida, 'stage': rodada})
            continue
        g = lambda m, t: m['scoreA'] if m['teamA'] == t else m['scoreB']  # noqa: E731
        pen = lambda t: volta.get('penaltiesA') if volta['teamA'] == t else volta.get('penaltiesB')  # noqa: E731
        saida.append({**volta, 'stage': rodada, 'teamA': ida['teamA'], 'teamB': ida['teamB'],
                      'scoreA': g(ida, ida['teamA']) + g(volta, ida['teamA']),
                      'scoreB': g(ida, ida['teamB']) + g(volta, ida['teamB']),
                      'penaltiesA': pen(ida['teamA']), 'penaltiesB': pen(ida['teamB'])})
    return saida


def _final_em_grupo(matches):
    """Edição sem final (1950): classificação da fase final em grupo (2 pontos por vitória)."""
    jogos = [m for m in matches if 'final' in m['stage'].lower() and 'grupo' in m['stage'].lower() and m['scoreA'] is not None]
    if not jogos:
        return None
    t = defaultdict(lambda: [0, 0])
    for m in jogos:
        for c, gp, gc in ((m['teamA'], m['scoreA'], m['scoreB']), (m['teamB'], m['scoreB'], m['scoreA'])):
            t[c][0] += 2 if gp > gc else 1 if gp == gc else 0
            t[c][1] += gp - gc
    return [c for c, _ in sorted(t.items(), key=lambda kv: (-kv[1][0], -kv[1][1]))]


def resumo(arquivo):
    pasta = arquivo[:-5]
    d = _carrega(arquivo)
    jogos = [m for m in d['matches'] if m['scoreA'] is not None]
    if not jogos:
        return None
    jogos = _junta_ida_volta(jogos)
    out = {'champion': None, 'runnerUp': None, 'third': None, 'fourth': None, 'semifinalists': []}
    finais = [m for m in jogos if m['stage'].lower().startswith('final') and 'grupo' not in m['stage'].lower()]
    terc = [m for m in jogos if 'terceiro' in m['stage'].lower() or 'third' in m['stage'].lower() or 'bronze' in m['stage'].lower()]
    semis = [m for m in jogos if 'semi' in m['stage'].lower()]
    if finais:
        r = _vencedor(sorted(finais, key=lambda m: (m['date'], m['id']))[-1], pasta)
        if r:
            out['champion'], out['runnerUp'] = r
    else:
        ordem = _final_em_grupo(jogos)
        if ordem and len(ordem) >= 2:
            out['champion'], out['runnerUp'] = ordem[0], ordem[1]
            if len(ordem) >= 4:
                out['third'], out['fourth'] = ordem[2], ordem[3]
    if not out['champion']:
        return None
    if terc and not out['third']:
        r = _vencedor(terc[-1], pasta)
        if r:
            out['third'], out['fourth'] = r
    if not out['third']:
        perd = []
        for m in semis:
            r = _vencedor(m, pasta)
            if r:
                perd.append(r[1])
        out['semifinalists'] = perd
    gols = defaultdict(int)
    for m in jogos:
        try:
            ev = _carrega(os.path.join(pasta, 'matches', f"{m['id']}.json")).get('events') or []
        except OSError:
            continue
        for e in ev:
            if e['type'] == 'goal' and e.get('kind') in ('normal', 'penalty') and e.get('player'):
                lado = m['teamA'] if e['side'] == 'A' else m['teamB']
                gols[(e['player']['name'], lado)] += 1
    if gols:
        topo = max(gols.values())
        out['topScorers'] = [{'name': n, 'team': t, 'goals': g} for (n, t), g in sorted(gols.items()) if g == topo]
    total = sum(m['scoreA'] + m['scoreB'] for m in jogos)
    out['totalGoals'] = total
    out['matches'] = len(jogos)
    return out


def main():
    prefixos = sys.argv[1:] or ['copa', 'eurocopa', 'nations-league', 'libertadores']
    for p in prefixos:
        for arq in sorted(glob.glob(os.path.join(RAIZ, f'{p}-[0-9][0-9][0-9][0-9].json'))):
            r = resumo(arq)
            if r is None:
                print('sem resumo:', os.path.basename(arq))
                continue
            os.makedirs(arq[:-5], exist_ok=True)
            with open(os.path.join(arq[:-5], 'summary.json'), 'w', encoding='utf-8') as f:
                json.dump(r, f, ensure_ascii=False, indent=1)
            print(os.path.basename(arq), r['champion'], r['runnerUp'], r['third'], r['fourth'], [s['name'] + ' ' + str(s['goals']) for s in r.get('topScorers', [])], r['totalGoals'])


if __name__ == '__main__':
    main()
