"""
Extrai dos HTML baixados (data/uol-brasileirao/<ano>/*.html.gz) os detalhes de cada jogo do Brasileirão e grava
app/frontend/public/data/editions/brasileirao-<ano>/matches/<id>.json (o mesmo formato dos outros campeonatos):
escalações (titulares e reservas), técnicos, árbitro, gols, cartões e substituições.

    python scripts/extrair-brasileirao-uol.py [ano]

O id vem de brasileirao-<ano>.json; o jogo é achado pelos dois clubes (mandante x visitante).
"""
from __future__ import annotations

import gzip
import importlib.util
import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import ifc_db  # noqa: E402

RAIZ = AQUI.parent
EDITIONS = ifc_db.pasta_saida_dados() / "editions"

_spec = importlib.util.spec_from_file_location("baixar_uol", AQUI / "baixar-brasileirao-uol.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]
CODIGO_POR_SLUG = {v: k for k, v in _mod.SLUG.items()}

POSICAO = {"goalkeeper": "Goleiro"}
for _p in ("center-back", "left-back", "right-back", "left-wing-back", "right-wing-back", "sweeper"):
    POSICAO[_p] = "Defensor"
for _p in ("defensive-midfielder", "central-midfielder", "attacking-midfielder", "left-midfielder", "right-midfielder", "midfielder"):
    POSICAO[_p] = "Meio-campista"
for _p in ("forward", "striker", "centre-forward", "second-striker", "left-winger", "right-winger", "winger"):
    POSICAO[_p] = "Atacante"


def le_json(html: str) -> dict | None:
    i = html.find('"lineupSections"')
    if i < 0:
        return None
    a = html.rfind("<script", 0, i)
    b = html.find("</script>", i)
    try:
        return json.loads(html[html.find(">", a) + 1:b])["football-scoreboard"]
    except Exception:  # noqa: BLE001
        return None


def minuto(seg: int, tempo: str) -> str:
    m = seg // 60
    if tempo == "first-half":
        return str(m) if m <= 45 else f"45+{m - 45}"
    total = 45 + m
    return str(total) if total <= 90 else f"90+{total - 90}"


def monta_detalhe(fs: dict) -> dict:
    jog = fs["players"]
    home_id, away_id = str(fs["teams"]["home"]["id"]), str(fs["teams"]["away"]["id"])
    lado_do_jogador: dict[str, str] = {}
    times = {}
    for lado, chave in (("A", "home"), ("B", "away")):
        lista = []
        for pid in fs["lineup"][chave]:
            p = jog.get(str(pid))
            if not p:
                continue
            lado_do_jogador[str(pid)] = lado
            lista.append({
                "id": int(pid), "number": p.get("jerseyNumber"), "name": (p.get("nickname") or p["name"]).strip(),
                "position": POSICAO.get(p.get("position") or "", None), "captain": False, "starter": bool(p.get("hasStarted")),
            })
        lista.sort(key=lambda x: (not x["starter"], x["number"] if x["number"] is not None else 999))
        times[lado] = {"coach": (fs["teams"][chave].get("coach") or {}).get("name"), "formation": None, "players": lista}

    def pessoa(pid) -> dict:
        p = jog.get(str(pid), {})
        return {"id": int(pid), "name": (p.get("nickname") or p.get("name") or "?").strip()}

    def lado_time(team_id) -> str:
        return "A" if str(team_id) == home_id else "B"

    eventos = []
    for g in fs.get("goals", []):
        if not g.get("isGoal", True) or g.get("playerId") is None:
            continue
        lado = lado_time(g["teamId"])
        eventos.append({"type": "goal", "side": lado, "minute": minuto(g["timeInSeconds"], g["gameTime"]), "order": 0,
                        "player": pessoa(g["playerId"]), "assist": None, "kind": "own" if g.get("ownGoal") else "normal",
                        "_seg": g["timeInSeconds"] + (0 if g["gameTime"] == "first-half" else 2700)})
    for c in fs.get("cards", []):
        if c.get("recipient") != "player" or c.get("playerId") is None:
            continue
        cor = "red" if c["card"] == "red" else "yellow"
        eventos.append({"type": "card", "side": lado_time(c["teamId"]), "minute": minuto(c["timeInSeconds"], c["gameTime"]), "order": 0,
                        "player": pessoa(c["playerId"]), "color": cor,
                        "_seg": c["timeInSeconds"] + (0 if c["gameTime"] == "first-half" else 2700)})
    for s in fs.get("substitutions", []):
        pl = s["players"]
        eventos.append({"type": "sub", "side": lado_time(s["teamId"]), "minute": minuto(s["timeInSeconds"], s["gameTime"]), "order": 0,
                        "out": pessoa(pl["out"]), "in": pessoa(pl["in"]),
                        "_seg": s["timeInSeconds"] + (0 if s["gameTime"] == "first-half" else 2700)})
    eventos.sort(key=lambda e: e["_seg"])
    for n, e in enumerate(eventos):
        e["order"] = n
        del e["_seg"]
    arb = (fs.get("rawReferees") or [{}])[0].get("name")
    return {"referee": arb, "attendance": None, "penalties": None, "teams": times, "events": eventos, "stats": None, "ranking": None}


def main() -> int:
    ano = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    snap = json.loads((EDITIONS / f"brasileirao-{ano}.json").read_text(encoding="utf-8"))
    por_par = {(m["teamA"], m["teamB"]): m for m in snap["matches"]}
    entrada = RAIZ / "data" / "uol-brasileirao" / str(ano)
    saida = EDITIONS / f"brasileirao-{ano}" / "matches"
    saida.mkdir(parents=True, exist_ok=True)
    ok = falhas = 0
    for arq in sorted(entrada.glob("*.html.gz")):
        fs = le_json(gzip.decompress(arq.read_bytes()).decode("utf-8"))
        if fs is None:
            print(f"{arq.name}: sem dados do jogo", file=sys.stderr)
            falhas += 1
            continue
        a = CODIGO_POR_SLUG.get(fs["teams"]["home"]["slug"])
        b = CODIGO_POR_SLUG.get(fs["teams"]["away"]["slug"])
        m = por_par.get((a, b))
        if m is None:
            print(f"{arq.name}: jogo {fs['teams']['home']['slug']} x {fs['teams']['away']['slug']} não está na tabela", file=sys.stderr)
            falhas += 1
            continue
        det = monta_detalhe(fs)
        det["teams"]["A"]["code"], det["teams"]["B"]["code"] = m["teamA"], m["teamB"]
        (saida / f"{m['id']}.json").write_text(json.dumps(det, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        ok += 1
    print(f"Detalhes gravados: {ok}; com problema: {falhas}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
