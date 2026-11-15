"""Historico de jogos entre selecoes (martj42/international_results, dominio publico CC0)."""
import csv
import math
from collections import defaultdict

# nome no banco do projeto -> nome no historico
ALIAS = {
    "Congo DR": "DR Congo", "Zaire": "DR Congo", "IR Iran": "Iran", "Korea DPR": "North Korea",
    "Korea Republic": "South Korea", "Cabo Verde": "Cape Verde", "Côte d'Ivoire": "Ivory Coast",
    "Czechia": "Czech Republic", "Germany FR": "Germany", "Soviet Union": "Russia",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina", "Serbia and Montenegro": "Serbia",
    "Dutch East Indies": "Indonesia", "China PR": "China PR",
}
# o historico lista essas selecoes antigas separadas; o rating continua na sucessora
SUCESSORAS = {"Czechoslovakia": "Czech Republic", "Yugoslavia": "Serbia", "West Germany": "Germany",
              "Zaïre": "DR Congo", "Soviet Union": "Russia", "Serbia and Montenegro": "Serbia"}

CONTINENTAIS = {"UEFA Euro", "Copa América", "African Cup of Nations", "AFC Asian Cup", "Gold Cup",
                "Confederations Cup", "Oceania Nations Cup", "CONCACAF Championship", "CONMEBOL–UEFA Cup of Champions"}


def nome(n):
    n = SUCESSORAS.get(n, n)
    return ALIAS.get(n, n)


def classe(torneio):
    t = torneio
    if t == "FIFA World Cup":
        return "copa"
    if "qualification" in t:
        return "eliminatoria"
    if t in CONTINENTAIS:
        return "continental"
    if "Nations League" in t:
        return "liga"
    if t == "Friendly":
        return "amistoso"
    return "outro"


def carregar(caminho):
    out = []
    with open(caminho, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["home_score"] in ("", "NA") or r["away_score"] in ("", "NA"):
                continue
            out.append((r["date"], nome(r["home_team"]), nome(r["away_team"]),
                        int(r["home_score"]), int(r["away_score"]), classe(r["tournament"]),
                        r["neutral"].upper() == "TRUE"))
    out.sort(key=lambda x: x[0])
    return out
