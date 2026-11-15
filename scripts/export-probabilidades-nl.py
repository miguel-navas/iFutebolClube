#!/usr/bin/env python3
"""Probabilidades da Nations League (fase de grupos): chance de vencer o grupo, ficar entre os 2 primeiros e em último.

Lê o snapshot data/editions/nations-league-2027.json (gerado por export-nations-league.py) e o histórico de
jogos entre seleções (data/historico/results.csv). Sem banco de dados. Uso: python export-probabilidades-nl.py [simulações]
"""
from __future__ import annotations

import importlib.util
import json
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import historico
import ifc_db
from modelo_probabilidades import MU, K_GOLS, Elo, amostrar_gols, probabilidades

AQUI = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("exp_copa", AQUI / "export-probabilidades.py")
_copa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_copa)  # só define funções; main() não roda

EDICAO = 2027
INICIO = "2026-09-01"          # primeiros jogos da fase de grupos 2026/27
FIM_AJUSTE = "2020-01-01"
META_PP = 5.0
N_SIM = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 30000
BASE = ifc_db.pasta_saida_dados() / "editions"
ENTRADA = BASE / f"nations-league-{EDICAO}.json"
SAIDA = BASE / f"nations-league-{EDICAO}" / "probabilities.json"
HISTORICO = ifc_db.RAIZ / "data" / "historico" / "results.csv"

# código da seleção no site -> nome no histórico (inglês)
NOME_EN = {
    "ALB": "Albania", "AND": "Andorra", "ARM": "Armenia", "AUT": "Austria", "AZE": "Azerbaijan",
    "BEL": "Belgium", "BIH": "Bosnia and Herzegovina", "BLR": "Belarus", "BUL": "Bulgaria", "CRO": "Croatia",
    "CYP": "Cyprus", "CZE": "Czech Republic", "DEN": "Denmark", "ENG": "England", "ESP": "Spain",
    "EST": "Estonia", "FIN": "Finland", "FRA": "France", "FRO": "Faroe Islands", "GEO": "Georgia",
    "GER": "Germany", "GIB": "Gibraltar", "GRE": "Greece", "HUN": "Hungary", "IRL": "Republic of Ireland",
    "ISL": "Iceland", "ISR": "Israel", "ITA": "Italy", "KAZ": "Kazakhstan", "KOS": "Kosovo",
    "LIE": "Liechtenstein", "LTU": "Lithuania", "LUX": "Luxembourg", "LVA": "Latvia", "MDA": "Moldova",
    "MKD": "North Macedonia", "MLT": "Malta", "MNE": "Montenegro", "NED": "Netherlands", "NIR": "Northern Ireland",
    "NOR": "Norway", "POL": "Poland", "POR": "Portugal", "ROU": "Romania", "SCO": "Scotland",
    "SMR": "San Marino", "SRB": "Serbia", "SUI": "Switzerland", "SVK": "Slovakia", "SVN": "Slovenia",
    "SWE": "Sweden", "TUR": "Turkey", "UKR": "Ukraine", "WAL": "Wales",
}
ETAPAS = ["Vencer o grupo", "Terminar entre os 2 primeiros", "Terminar em último"]


def main() -> int:
    if not ENTRADA.exists() or not HISTORICO.exists():
        print(f"Faltam arquivos: {ENTRADA} / {HISTORICO}", file=sys.stderr)
        return 1
    snap = json.loads(ENTRADA.read_text(encoding="utf-8"))
    equipes = {t["code"]: t for t in snap["teams"]}
    faltam = sorted(c for c in equipes if c not in NOME_EN)
    if faltam:
        print("Seleções sem nome no histórico:", faltam, file=sys.stderr)
        return 1
    en = {c: historico.nome(NOME_EN[c]) for c in equipes}
    codigo_de = {v: k for k, v in en.items()}

    # uma passada: rating atual, previsão pré-jogo dos jogos de Nations League de 2020 em diante e da edição
    elo = Elo()
    teste, edicao = [], []                       # (probs, resultado)
    ultima = ""
    por_chave = {}                               # (data, a, b) -> probs pré-jogo dos jogos da edição
    for d, a, b, ga, gb, cl, neutro in historico.carregar(HISTORICO):
        ultima = d
        if cl == "liga" and d >= FIM_AJUSTE:
            p = probabilidades(elo.diferenca(a, b, neutro))
            r = _copa.resultado(ga, gb)
            teste.append((p, r))
            if d >= INICIO and a in codigo_de and b in codigo_de:
                edicao.append((p, r))
                por_chave[(codigo_de[a], codigo_de[b])] = (p, r)
        elo.atualizar(a, b, ga, gb, cl, neutro)
    # jogos do snapshot posteriores ao fim do histórico entram como Nations League
    for m in sorted((m for m in snap["matches"] if m["scoreA"] is not None and m["date"] > ultima), key=lambda m: m["date"]):
        a, b = en[m["teamA"]], en[m["teamB"]]
        p = probabilidades(elo.diferenca(a, b, False))
        r = _copa.resultado(m["scoreA"], m["scoreB"])
        edicao.append((p, r))
        por_chave[(m["teamA"], m["teamB"])] = (p, r)
        elo.atualizar(a, b, m["scoreA"], m["scoreB"], "liga", False)
    if not edicao:
        print("Sem jogos da edição para validar.", file=sys.stderr)
        return 1

    rng = random.Random(2027)
    P_t, R_t = [x[0] for x in teste], [x[1] for x in teste]
    P_e, R_e = [x[0] for x in edicao], [x[1] for x in edicao]
    todos = _copa.bloco_erro("Nations Leagues (2020 em diante)", P_t, R_t, rng)
    ed = _copa.bloco_erro("Nations League 2026/27", P_e, R_e, rng)
    acerto = sum(1 for p, r in edicao if max(range(3), key=lambda i: p[i]) == r) / len(edicao)
    brier = sum(sum((p[i] - (1 if i == r else 0)) ** 2 for i in range(3)) for p, r in edicao) / len(edicao)
    faixas = _copa.calibracao(P_e, R_e)

    # simulação dos jogos que faltam
    grupos = {g["name"]: [s["code"] for s in g["standings"]] for g in snap["groups"]}
    tabela = {s["code"]: s for g in snap["groups"] for s in g["standings"]}
    pendentes = defaultdict(list)
    jogos = []
    for m in snap["matches"]:
        a, b = m["teamA"], m["teamB"]
        if m["scoreA"] is None:
            dr = elo.diferenca(en[a], en[b], False)
            pA, pD, pB = probabilidades(dr)
            pendentes[m["group"]].append((a, b, dr))
            jogos.append(dict(id=m["id"], teamA=a, teamB=b, pA=round(pA, 4), pD=round(pD, 4), pB=round(pB, 4), result=None))
        else:
            p, r = por_chave.get((a, b)) or (probabilidades(0.0), None)
            jogos.append(dict(id=m["id"], teamA=a, teamB=b, pA=round(p[0], 4), pD=round(p[1], 4), pB=round(p[2], 4),
                              result="ADB"[r] if r is not None else None))
    cont = {c: [0, 0, 0] for c in equipes}
    for _ in range(N_SIM):
        for g, times in grupos.items():
            pts = {c: tabela[c]["points"] for c in times}
            sg = {c: tabela[c]["goalDifference"] for c in times}
            gp = {c: tabela[c]["goalsFor"] for c in times}
            for a, b, dr in pendentes[g]:
                ga, gb = amostrar_gols(dr, rng)
                gp[a] += ga; gp[b] += gb; sg[a] += ga - gb; sg[b] += gb - ga
                if ga > gb: pts[a] += 3
                elif ga < gb: pts[b] += 3
                else: pts[a] += 1; pts[b] += 1
            ordem = sorted(times, key=lambda c: (pts[c], sg[c], gp[c], rng.random()), reverse=True)
            cont[ordem[0]][0] += 1
            for c in ordem[:2]: cont[c][1] += 1
            cont[ordem[-1]][2] += 1

    selecoes = [dict(code=c, name=equipes[c]["name"], group=equipes[c]["group"], rating=round(elo.r[en[c]]),
                     probs=[round(x / N_SIM, 4) for x in cont[c]], reached=None) for c in equipes]
    selecoes.sort(key=lambda s: (s["group"], -s["probs"][0]))

    def faixa(f):
        return [dict(bin=f"{b * 10}-{b * 10 + 10}%", n=v[0], predicted=round(v[1] / v[0], 4), observed=round(v[2] / v[0], 4))
                for b, v in sorted(f.items())]

    saida = dict(
        generatedAt=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        edition=dict(competition="nations-league", year=str(EDICAO)),
        model=dict(
            name="Elo + gols por Poisson",
            description=("Cada seleção tem um rating Elo calculado com quase 50 mil jogos entre seleções desde 1872; a "
                         "diferença de rating (com vantagem de jogar em casa) define os gols esperados. As chances de "
                         "grupo vêm de simular milhares de vezes os jogos que faltam, a partir da tabela atual."),
            params=dict(mu=MU, k=K_GOLS, simulations=N_SIM),
            limitations=[
                "Os parâmetros foram ajustados com jogos de 2000 a 2019; o teste usa só 2020 em diante.",
                "Critério de desempate simplificado: pontos, saldo e gols pró; o confronto direto não é considerado.",
                "Promoção, rebaixamento e mata-mata da Liga A não entram nesta tela.",
                "Não considera lesões, escalações ou forma recente além do rating.",
                "A fase de grupos tem poucos jogos: a calibração desta edição varia muito por sorte.",
            ],
        ),
        validation=dict(targetPp=META_PP, edition=ed, pooled=todos, byType=[todos],
                        accuracy=round(acerto, 4), brier=round(brier, 4), brierBaseline=0.6667,
                        calibration=faixa(faixas)),
        stages=ETAPAS, teams=selecoes, matches=jogos,
    )
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Gravado {SAIDA} ({SAIDA.stat().st_size // 1024} KB): {len(selecoes)} seleções, {len(jogos)} jogos, histórico até {ultima}")
    print(f"{todos['label']}: {todos['errorPp']} pp ({todos['matches']}); edição: {ed['errorPp']} pp ({ed['matches']}); acerto {acerto:.1%}")
    for s in selecoes[:0]: pass
    for g in ("A1", "A3", "B1"):
        print(g, [(s["code"], round(s["probs"][0] * 100), round(s["probs"][1] * 100)) for s in selecoes if s["group"] == g])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
