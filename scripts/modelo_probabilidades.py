"""Modelo de probabilidades: rating Elo (por nome de seleção) + gols por Poisson.

Parâmetros ajustados só com jogos competitivos de 2000 a 2019 (ver Agentes/probabilidades/ajuste3.py) e
testados em 2020-2026, que o ajuste não viu. Sem dependências além da biblioteca padrão.
"""
import math
from collections import defaultdict

BASE = 1500.0
CASA = 140.0               # vantagem do mandante em campo não neutro (pontos de rating)
ESCALA_K = 1.5
K_POR_CLASSE = {"copa": 60.0, "continental": 50.0, "eliminatoria": 40.0, "liga": 40.0,
                "amistoso": 20.0, "outro": 30.0}
MU = 2.3                   # gols esperados por jogo entre seleções de mesmo rating
K_GOLS = 0.0018            # quanto cada ponto de diferença de rating desloca os gols esperados


def multiplicador_gols(dif):
    dif = abs(dif)
    if dif <= 1:
        return 1.0
    if dif == 2:
        return 1.5
    return (11 + dif) / 8.0


def esperado(dr):
    return 1.0 / (1.0 + 10 ** (-dr / 400.0))


class Elo:
    def __init__(self, ratings=None):
        self.r = defaultdict(lambda: BASE)
        if ratings:
            self.r.update(ratings)

    def diferenca(self, a, b, neutro=True):
        return self.r[a] - self.r[b] + (0.0 if neutro else CASA)

    def atualizar(self, a, b, ga, gb, classe="outro", neutro=True):
        dr = self.diferenca(a, b, neutro)
        w = 1.0 if ga > gb else 0.5 if ga == gb else 0.0
        delta = K_POR_CLASSE[classe] * ESCALA_K * multiplicador_gols(ga - gb) * (w - esperado(dr))
        self.r[a] += delta
        self.r[b] -= delta


def _poisson(l, n):
    p = [math.exp(-l)]
    for i in range(1, n + 1):
        p.append(p[-1] * l / i)
    return p


def probabilidades(dr, mu=MU, k=K_GOLS, maxg=10):
    """(P vitória A, P empate, P vitória B) para a diferença de rating dr."""
    la = mu / 2 * math.exp(k * dr)
    lb = mu / 2 * math.exp(-k * dr)
    pa, pb = _poisson(la, maxg), _poisson(lb, maxg)
    v = e = d = 0.0
    for i, x in enumerate(pa):
        for j, y in enumerate(pb):
            if i > j:
                v += x * y
            elif i == j:
                e += x * y
            else:
                d += x * y
    s = v + e + d
    return v / s, e / s, d / s


def amostrar_gols(dr, rng, mu=MU, k=K_GOLS):
    return _knuth(mu / 2 * math.exp(k * dr), rng), _knuth(mu / 2 * math.exp(-k * dr), rng)


def _knuth(l, rng):
    limite, n, p = math.exp(-l), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limite:
            return n
        n += 1
