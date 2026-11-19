"""Baixa uma foto de cada estádio da Wikimedia Commons (licença livre) e guarda os créditos.

Os estádios vêm dos próprios dados do site (jogos de cada edição + lista da Copa 2026).
Saída: app/frontend/public/estadios/<chave>.jpg (até 3 fotos: <chave>-2.jpg, <chave>-3.jpg) e estadios.json
(fotos com autor, licença e origem; texto e coordenadas da Wikipédia).

Uso (no PC, com internet):
  python scripts\\baixar-estadios.py                 -> Copas do Mundo (todas as edições)
  python scripts\\baixar-estadios.py copa eurocopa   -> competições escolhidas
  python scripts\\baixar-estadios.py --refazer       -> baixa de novo mesmo as que já existem
Pode ser interrompido e rodado de novo: continua de onde parou.
"""
import glob
import html
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDICOES = os.path.join(RAIZ, 'app', 'frontend', 'public', 'data', 'editions')
SAIDA = os.path.join(RAIZ, 'app', 'frontend', 'public', 'estadios')
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'iFutebolClube/1.0 (https://www.ifutebolclube.com.br; miguelfernando@nivel77.com.br) python-urllib'
RUIM = re.compile(r'logo|map|mapa|plan|badge|seat|ticket|poster|flag|bandeira|crest|escudo|diagram|\bkit\b|jersey|coin|stamp|medal|portrait|interior', re.I)


def chave(nome, cidade):
    s = unicodedata.normalize('NFKD', f'{nome} {cidade}').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def get(url, tentativas=4):
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(3 * (i + 1))


def api(**p):
    p.update(format='json')
    return json.loads(get(API + '?' + urllib.parse.urlencode(p)))


def estadios_dos_dados(prefixos):
    achados = {}
    for pref in prefixos:
        for arq in sorted(glob.glob(os.path.join(EDICOES, f'{pref}-[0-9][0-9][0-9][0-9].json'))):
            if pref == 'copa' and arq.endswith('copa-2026.json'):
                continue  # a Copa 2026 usa nomes neutros da FIFA; os nomes reais vêm de worldCupData.ts
            with open(arq, encoding='utf-8') as f:
                for m in json.load(f)['matches']:
                    if m.get('stadium'):
                        achados.setdefault(chave(m['stadium'], m.get('city') or ''), (m['stadium'], m.get('city') or ''))
    if 'copa' in prefixos:  # Copa 2026: nomes em worldCupData.ts
        src = os.path.join(RAIZ, 'app', 'frontend', 'src', 'data', 'worldCupData.ts')
        with open(src, encoding='utf-8') as f:
            for nome, cidade in re.findall(r'\{ name: "([^"]+)", city: "([^"]+)", country: "[^"]+", capacity', f.read()):
                achados.setdefault(chave(nome, cidade), (nome, cidade))
    return achados


def tokens(txt):
    s = unicodedata.normalize('NFKD', txt).encode('ascii', 'ignore').decode().lower()
    return [t for t in re.split(r'[^a-z0-9]+', s) if len(t) > 2 and t not in ('stadium', 'stadion', 'stade', 'estadio', 'stadio', 'the', 'del', 'des')]


def buscar(nome, cidade):
    """Melhor imagem da Commons para o estádio, ou None."""
    base = tokens(nome)
    for consulta in (f'{nome} {cidade} stadium', f'{nome} stadium', f'{nome} {cidade}'):
        r = api(action='query', generator='search', gsrsearch=consulta, gsrnamespace=6, gsrlimit=15,
                prop='imageinfo', iiprop='url|size|mime|extmetadata', iiurlwidth=1100)
        melhores = []
        for p in (r.get('query', {}).get('pages') or {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            titulo = p.get('title', '')
            if ii.get('mime') not in ('image/jpeg', 'image/png') or RUIM.search(titulo):
                continue
            if ii.get('width', 0) < 1000 or ii.get('width', 0) < ii.get('height', 1) * 1.2:
                continue
            t = set(tokens(titulo))
            pontos = sum(1 for x in base if x in t) + (1 if any(x in t for x in tokens(cidade)) else 0)
            if base and pontos < max(1, (len(base) + 1) // 2):
                continue
            melhores.append((pontos, ii.get('width', 0), titulo, ii))
        if melhores:
            melhores.sort(key=lambda x: (-x[0], -x[1]))
            return melhores[:3]
        time.sleep(0.5)
    return []


def buscar_texto(nome, cidade):
    """Resumo do estádio na Wikipédia (pt, depois en): texto, página, idioma e coordenadas. None se não achar com segurança."""
    base = tokens(nome)
    for lang in ('pt', 'en'):
        wiki = f'https://{lang}.wikipedia.org/w/api.php'
        for consulta in (f'{nome} {cidade} ' + ('estádio' if lang == 'pt' else 'stadium'), f'{nome} {cidade}'):
            try:
                r = json.loads(get(wiki + '?' + urllib.parse.urlencode(
                    dict(action='query', list='search', srsearch=consulta, srlimit=5, format='json'))))
            except Exception:  # noqa: BLE001
                continue
            for hit in r.get('query', {}).get('search', []):
                t = set(tokens(hit['title']))
                if base and sum(1 for x in base if x in t) < max(1, (len(base) + 1) // 2):
                    continue
                try:
                    titulo = urllib.parse.quote(hit['title'].replace(' ', '_'), safe='')
                    d = json.loads(get(f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{titulo}'))
                except Exception:  # noqa: BLE001
                    continue
                if d.get('type') != 'standard' or len(d.get('extract', '')) < 80:
                    continue
                c = d.get('coordinates') or {}
                return {
                    'description': d['extract'],
                    'descriptionLang': lang,
                    'descriptionSource': d.get('content_urls', {}).get('desktop', {}).get('page', ''),
                    'wikiTitle': d.get('title', hit['title']),
                    'lat': c.get('lat'), 'lon': c.get('lon'),
                }
            time.sleep(0.4)
    return None


def limpa(txt):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', txt or ''))).strip()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    refazer = '--refazer' in sys.argv
    prefixos = args or ['copa']
    os.makedirs(SAIDA, exist_ok=True)
    catalogo_arq = os.path.join(SAIDA, 'estadios.json')
    catalogo = json.load(open(catalogo_arq, encoding='utf-8')) if os.path.exists(catalogo_arq) else {}
    lista = estadios_dos_dados(prefixos)
    print(f'{len(lista)} estádios para tratar.')
    sem = []
    for i, (k, (nome, cidade)) in enumerate(sorted(lista.items()), 1):
        destino = os.path.join(SAIDA, k + '.jpg')
        e = catalogo.get(k)
        # formato antigo (uma foto só) -> lista de fotos
        if e and 'photos' not in e and e.get('file'):
            e['photos'] = [{k2: e[k2] for k2 in ('file', 'author', 'license', 'source') if k2 in e}]
        tem_foto = bool(e and e.get('photos') and os.path.exists(destino))
        precisa_fotos = refazer or not tem_foto or not e.get('fotosBuscadas')
        precisa_texto = refazer or not (e and e.get('textoBuscado'))
        if not precisa_fotos and not precisa_texto:
            continue
        try:
            e = e or {'name': nome, 'city': cidade}
            msg = []
            if precisa_fotos:
                achados = buscar(nome, cidade)
                novas = []
                for n, (_, _, titulo, ii) in enumerate(achados):
                    arq = f'{k}.jpg' if n == 0 else f'{k}-{n + 1}.jpg'
                    if n == 0 and tem_foto and not refazer and e.get('photos'):
                        novas.append(e['photos'][0])  # mantém a principal já baixada
                        continue
                    with open(os.path.join(SAIDA, arq), 'wb') as f:
                        f.write(get(ii.get('thumburl') or ii['url']))
                    meta = ii.get('extmetadata', {})
                    novas.append({
                        'file': f'estadios/{arq}', 'title': titulo.replace('File:', ''),
                        'author': limpa(meta.get('Artist', {}).get('value')) or 'Desconhecido',
                        'license': limpa(meta.get('LicenseShortName', {}).get('value')),
                        'source': ii.get('descriptionurl', ''),
                    })
                if novas:
                    e['photos'] = novas
                    e['file'] = novas[0]['file']
                e['fotosBuscadas'] = True
                msg.append(f'{len(e.get("photos", []))} foto(s)')
            if precisa_texto:
                t = buscar_texto(nome, cidade)
                if t:
                    e.update(t)
                e['textoBuscado'] = True
                msg.append('texto' if t else 'sem texto')
            catalogo[k] = e
            print(f'[{i}/{len(lista)}] {nome} ({cidade}): ' + ', '.join(msg))
            if not e.get('photos'):
                sem.append(f'{nome} ({cidade})')
            with open(catalogo_arq, 'w', encoding='utf-8') as f:
                json.dump(catalogo, f, ensure_ascii=False, indent=1)
        except Exception as ex:  # noqa: BLE001
            print(f'[{i}/{len(lista)}] erro: {nome} ({cidade}): {ex}')
            sem.append(f'{nome} ({cidade}) [erro]')
        time.sleep(1)
    print(f'\nEstádios no catálogo: {len(catalogo)}. Sem foto/erro: {len(sem)}')
    for s in sem:
        print('  -', s)


if __name__ == '__main__':
    main()
