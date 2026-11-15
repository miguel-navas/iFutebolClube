#!/usr/bin/env python3
"""Exporta as probabilidades da Copa do Mundo para o site (validação do modelo na Copa 2026).

Gera app/frontend/public/data/editions/copa-2026/probabilities.json:
  - chance de cada seleção chegar a cada fase e ser campeã, calculada ANTES do torneio;
  - probabilidade de cada jogo (V/E/D) calculada antes do jogo, com o resultado real;
  - a validação do modelo (erro de calibração, comparado ao ruído esperado de amostra pequena).

Lê o SQLite da Copa (data/sqlite/CopaDoMundo.sqlite) e o histórico de jogos entre seleções
(data/historico/results.csv, martj42/international_results, domínio público). Uso: python export-probabilidades.py [simulações]
"""
from __future__ import annotations

import json
import math
import random
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime, timezone

import ifc_db
import historico
from modelo_probabilidades import MU, K_GOLS, Elo, amostrar_gols, probabilidades

EDICAO = 2026
INICIO = "2026-06-11"          # abertura da Copa 2026
META_PP = 5.0                  # margem aceitável de erro de calibração (pontos percentuais)
FASES = ["First Stage", "Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Final", "Campeao"]
N_SIM = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 30000
SAIDA = ifc_db.pasta_saida_dados() / "editions" / f"copa-{EDICAO}" / "probabilities.json"


def resultado(ga, gb):
    return 0 if ga > gb else 1 if ga == gb else 2


def calibracao(probs, reais, faixas=10):
    """Todas as probabilidades (V/E/D) por faixa: (n, soma prevista, acertos)."""
    f: dict[int, list] = {}
    for p, r in zip(probs, reais):
        for i in range(3):
            b = min(int(p[i] * faixas), faixas - 1)
            x = f.setdefault(b, [0, 0.0, 0])
            x[0] += 1
            x[1] += p[i]
            x[2] += 1 if i == r else 0
    return f


def erro_calibracao(f):
    return sum(abs(v[1] - v[2]) for v in f.values()) / sum(v[0] for v in f.values())


def ruido(probs, rng, n=300):
    """Erro de calibração esperado se o modelo fosse perfeito (só ruído de amostra)."""
    sims = []
    for _ in range(n):
        reais = [rng.choices((0, 1, 2), weights=p)[0] for p in probs]
        sims.append(erro_calibracao(calibracao(probs, reais)))
    sims.sort()
    return sims[n // 2], sims[int(n * 0.9)]


HISTORICO = ifc_db.RAIZ / "data" / "historico" / "results.csv"
FIM_AJUSTE = "2020-01-01"      # o ajuste dos parâmetros usou jogos até 2019; daí em diante é teste
ROTULO_CLASSE = {"continental": "Torneios continentais", "eliminatoria": "Eliminatórias",
                 "liga": "Nations Leagues", "amistoso": "Amistosos", "copa": "Copas do Mundo"}


def bloco_erro(label, P, R, rng, n_ruido=150):
    mediana, p90 = ruido(P, rng, n_ruido)
    return dict(label=label, matches=len(P), errorPp=round(erro_calibracao(calibracao(P, R)) * 100, 2),
                noiseMedianPp=round(mediana * 100, 2), noiseP90Pp=round(p90 * 100, 2))


def main() -> int:
    caminho = ifc_db.caminho_sqlite("CopaDoMundo")
    if not caminho.exists() or not HISTORICO.exists():
        print(f"Faltam arquivos: {caminho} / {HISTORICO}", file=sys.stderr)
        return 1
    con = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
    nomes = {r[0]: r[1] for r in con.execute("SELECT SelecaoId, COALESCE(NomePT, Nome) FROM Selecoes")}
    nome_en = {r[0]: historico.nome(r[1]) for r in con.execute("SELECT SelecaoId, Nome FROM Selecoes")}
    codigos = {r[0]: r[1] for r in con.execute("SELECT SelecaoId, Codigo FROM Selecoes")}

    # uma passada pelo histórico: rating de antes da abertura e previsão (pré-jogo) de todos os jogos de 2020 em diante
    jogos_hist = historico.carregar(HISTORICO)
    elo = Elo()
    pre = None
    teste = []                                   # (data, dr, gols a, gols b, classe)
    neutro_de = {}
    for d, a, b, ga, gb, cl, neutro in jogos_hist:
        if pre is None and d >= INICIO:
            pre = dict(elo.r)
        if d >= FIM_AJUSTE:
            teste.append((d, elo.diferenca(a, b, neutro), ga, gb, cl))
        if cl == "copa" and d >= INICIO:
            neutro_de[(d, frozenset((a, b)))] = neutro
        elo.atualizar(a, b, ga, gb, cl, neutro)
    pre = pre or dict(elo.r)

    fase_nome = {r[0]: r[1] for r in con.execute("SELECT FaseId, Nome FROM Fases WHERE Edicao=?", (EDICAO,))}
    copa = [dict(id=num, fase=fase_nome[fid], grupo=gid, a=a, b=b, ga=ga, gb=gb, data=dh[:10])
            for num, fid, gid, a, b, ga, gb, dh in con.execute(
                "SELECT NumeroJogo, FaseId, GrupoId, MandanteId, VisitanteId, GolsMandante, GolsVisitante, DataHoraUTC "
                "FROM Partidas WHERE Edicao=? AND GolsMandante IS NOT NULL ORDER BY DataHoraUTC, NumeroJogo", (EDICAO,))]
    if not copa:
        print("A Copa 2026 não tem jogos finalizados no banco.", file=sys.stderr)
        return 1
    sem_rating = sorted({nome_en[t] for j in copa for t in (j["a"], j["b"]) if nome_en[t] not in pre})
    if sem_rating:
        print("AVISO: seleções sem histórico (rating inicial 1500):", ", ".join(sem_rating), file=sys.stderr)

    # probabilidade de cada jogo da Copa, calculada antes do jogo (rating atualizado durante o torneio)
    vivo = Elo(pre)
    jogos = []
    for j in copa:
        na, nb = nome_en[j["a"]], nome_en[j["b"]]
        neutro = neutro_de.get((j["data"], frozenset((na, nb))), True)
        p = probabilidades(vivo.diferenca(na, nb, neutro))
        jogos.append(dict(id=j["id"], teamA=codigos[j["a"]], teamB=codigos[j["b"]],
                          pA=round(p[0], 4), pD=round(p[1], 4), pB=round(p[2], 4),
                          result="ADB"[resultado(j["ga"], j["gb"])]))
        vivo.atualizar(na, nb, j["ga"], j["gb"], "copa", neutro)
    P = [(x["pA"], x["pD"], x["pB"]) for x in jogos]
    R = ["ADB".index(x["result"]) for x in jogos]

    # validação
    rng = random.Random(2026)
    def pr(am):
        return [probabilidades(x[1]) for x in am], [resultado(x[2], x[3]) for x in am]
    todos = bloco_erro("Todos os jogos de 2020 a 2026", *pr(teste), rng)
    por_tipo = []
    for cl in ("continental", "eliminatoria", "liga", "amistoso", "copa"):
        am = [x for x in teste if x[4] == cl and (cl != "copa" or x[0] >= "2022-01-01")]
        if len(am) >= 30:
            por_tipo.append(bloco_erro(ROTULO_CLASSE[cl] + (" 2022 e 2026" if cl == "copa" else ""), *pr(am), rng))
    edicao = bloco_erro("Copa 2026", P, R, rng)
    f26 = calibracao(P, R)
    brier = sum(sum((p[i] - (1 if i == r else 0)) ** 2 for i in range(3)) for p, r in zip(P, R)) / len(P)
    acerto = sum(1 for p, r in zip(P, R) if max(range(3), key=lambda i: p[i]) == r) / len(P)

    # simulação do torneio com o rating de antes da abertura
    grupos = defaultdict(list)
    for j in copa:
        if j["fase"] == "First Stage":
            grupos[j["grupo"]].append(j)
    times_grupo = {g: sorted({x for m in ms for x in (m["a"], m["b"])}) for g, ms in grupos.items()}
    letra = {r[0]: r[1] for r in con.execute("SELECT GrupoId, Nome FROM Grupos")}
    chegou = defaultdict(lambda: [0] * 7)
    forca = {t: pre.get(nome_en[t], 1500.0) for ms in times_grupo.values() for t in ms}

    def avanca(a, b):
        pv, pe, pd = probabilidades(forca[a] - forca[b])
        return rng.random() < pv + pe * pv / max(pv + pd, 1e-9)

    for _ in range(N_SIM):
        classif, terceiros = [], []
        for g, times in times_grupo.items():
            pts, sg, gp = defaultdict(int), defaultdict(int), defaultdict(int)
            for m in grupos[g]:
                ga, gb = amostrar_gols(forca[m["a"]] - forca[m["b"]], rng)
                gp[m["a"]] += ga; gp[m["b"]] += gb
                sg[m["a"]] += ga - gb; sg[m["b"]] += gb - ga
                if ga > gb: pts[m["a"]] += 3
                elif ga < gb: pts[m["b"]] += 3
                else: pts[m["a"]] += 1; pts[m["b"]] += 1
            ordem = sorted(times, key=lambda t: (pts[t], sg[t], gp[t], rng.random()), reverse=True)
            classif += ordem[:2]
            terceiros.append((pts[ordem[2]], sg[ordem[2]], gp[ordem[2]], rng.random(), ordem[2]))
        terceiros.sort(reverse=True)
        classif += [t[4] for t in terceiros[:8]]
        vivos = classif[:]
        rng.shuffle(vivos)                       # chaveamento simplificado: sorteio entre os 32
        nivel = 1
        while len(vivos) > 1:
            for t in vivos:
                chegou[t][nivel] += 1
            vivos = [a if avanca(a, b) else b for a, b in zip(vivos[0::2], vivos[1::2])]
            nivel += 1
        chegou[vivos[0]][6] += 1

    real = defaultdict(int)
    for j in copa:
        if j["fase"] in FASES:
            for t in (j["a"], j["b"]):
                real[t] = max(real[t], FASES.index(j["fase"]))
    campea = con.execute("SELECT CampeaoId FROM Edicoes WHERE Edicao=?", (EDICAO,)).fetchone()[0]
    real[campea] = 6

    selecoes = []
    for t in sorted(chegou, key=lambda t: -chegou[t][6]):
        grupo = next((letra.get(m["grupo"]) for m in copa if t in (m["a"], m["b"]) and m["fase"] == "First Stage"), None)
        selecoes.append(dict(code=codigos[t], name=nomes[t], group=(grupo or "")[-1:] or None,
                             rating=round(forca[t]), probs=[round(x / N_SIM, 4) for x in chegou[t][1:]], reached=real[t]))

    def faixa(f):
        return [dict(bin=f"{b * 10}-{b * 10 + 10}%", n=v[0], predicted=round(v[1] / v[0], 4), observed=round(v[2] / v[0], 4))
                for b, v in sorted(f.items())]

    saida = dict(
        generatedAt=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        edition=dict(competition="copa", year=str(EDICAO)),
        model=dict(
            name="Elo + gols por Poisson",
            description=("Cada seleção tem um rating Elo calculado com quase 50 mil jogos entre seleções desde 1872 "
                         "(Copas, torneios continentais, eliminatórias, Nations Leagues e amistosos); a diferença de "
                         "rating define os gols esperados de cada lado."),
            params=dict(mu=MU, k=K_GOLS, simulations=N_SIM),
            limitations=[
                "Os parâmetros foram ajustados com jogos de 2000 a 2019; o teste usa só 2020 em diante.",
                "O chaveamento do mata-mata é simplificado (sorteio entre os 32 classificados).",
                "Não considera lesões, escalações ou forma recente além do rating.",
                "Uma Copa tem poucos jogos: a medida de calibração de um só torneio varia muito por sorte.",
            ],
        ),
        validation=dict(
            targetPp=META_PP, edition=edicao, pooled=todos, byType=por_tipo,
            accuracy=round(acerto, 4), brier=round(brier, 4), brierBaseline=0.6667,
            calibration=faixa(f26), championName=nomes[campea],
        ),
        stages=["16-avos", "Oitavas", "Quartas", "Semifinal", "Final", "Campeã"],
        teams=selecoes,
        matches=jogos,
    )
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Gravado {SAIDA} ({SAIDA.stat().st_size // 1024} KB): {len(selecoes)} seleções, {len(jogos)} jogos")
    print(f"Calibração: {todos['label']} {todos['errorPp']} pp ({todos['matches']} jogos); Copa 2026 {edicao['errorPp']} pp; meta {META_PP}")
    for b in por_tipo:
        print(f"  {b['label']}: {b['errorPp']} pp ({b['matches']} jogos, ruído {b['noiseMedianPp']})")
    top = [(s['name'], round(s['probs'][-1] * 100, 1)) for s in selecoes[:6]]
    esp = next((round(s['probs'][-1] * 100, 1) for s in selecoes if s['code'] == 'ESP'), None)
    print("Campeã (top 6):", top, "| Espanha:", esp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
