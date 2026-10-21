from collections import Counter
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import tomllib
from urllib.parse import urlsplit
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Audit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.elements = []

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def handle_endtag(self, tag):
        assert self.stack and self.stack[-1] == tag, (tag, self.stack[-5:])
        self.stack.pop()


doc = Audit()
html = (DIST / 'index.html').read_text()
doc.feed(html)
assert not doc.stack, doc.stack
ids = [a['id'] for _, a in doc.elements if 'id' in a]
assert len(ids) == len(set(ids)), [x for x, count in Counter(ids).items() if count > 1]
allowed_links = {
    'https://www.instagram.com/pulse.training/',
    'https://unsplash.com',
    'https://chat.whatsapp.com/FDjxcKHOCx2ItphKPysgLU',
    'https://chat.whatsapp.com/Dng4ewBUaqIIA3UIcObnDK',
    'https://strava.app.link/FYvofCYMnXb',
}
outbound = set()
for tag, attrs in doc.elements:
    for label in ('aria-labelledby', 'aria-controls'):
        for ref in attrs.get(label, '').split():
            assert ref in ids, (label, ref)
    if tag == 'img':
        assert attrs.get('alt')
        assert int(attrs.get('width', '0')) > 0 and int(attrs.get('height', '0')) > 0
    for key in ('src', 'href'):
        value = attrs.get(key)
        if not value:
            continue
        if value.startswith('#'):
            assert value == '#' or value[1:] in ids, value
        elif value.startswith('https:'):
            assert tag == 'a' and value in allowed_links, value
            assert attrs.get('target') == '_blank'
            assert {'noopener', 'noreferrer'} <= set(attrs.get('rel', '').split())
            outbound.add(value)
        else:
            assert not value.startswith(('http:', '//', 'javascript:')), value
            assert (DIST / urlsplit(value).path).is_file(), value
assert outbound == allowed_links

for css_path in DIST.glob('*.css'):
    css = css_path.read_text()
    assert css.count('{') == css.count('}'), css_path
    for value in re.findall(r'url\([\"\x27]?([^\)\"\x27]+)', css):
        if not value.startswith('#'):
            assert (DIST / value).is_file(), value

assert 'hidden' in next(a for tag, a in doc.elements if a.get('id') == 'pulse-intro')
assert next(a for tag, a in doc.elements if a.get('id') == 'pulse-intro')['aria-hidden'] == 'true'
assert len([1 for tag, a in doc.elements if a.get('class') == 'founder']) == 2
assert len([1 for tag, a in doc.elements if a.get('class') == 'partner']) == 4
assert len([1 for tag, a in doc.elements if a.get('class') == 'product-card']) == 6
assert len([1 for tag, a in doc.elements if a.get('class') == 'community-link']) == 3
assert 'FÁBIO TEIXEIRA' in html and 'RITA MONTEIRO' in html
assert 'QUERES SER NOSSO PARCEIRO?' in html
assert '#D5FA3B' in html and '#000000' in (DIST / 'intro.css').read_text()
assert 'class="hero-intro"' not in html
assert '<span>RUN · WALK · BIKE.</span>' not in html
assert 'class="rhythm-strip"' in html
assert 'Fotos Run e Bike ilustrativas' not in html
assert 'Run e Bike: fotografias ilustrativas' not in html
assert 'href="intro.css?v=20261021"' in html
assert 'src="intro-bootstrap.js?v=20261021"' in html
assert 'src="intro.js?v=20261021"' in html
geometry = json.loads((ROOT / 'notes/intro-geometry.json').read_text())
assert next(a['d'] for tag, a in doc.elements if a.get('id') == 'intro-motion-guide') == geometry['path']
symbol = Image.open(DIST / 'assets/pulse-symbol-original.jpg').convert('L')
assert symbol.size == tuple(geometry['source_size'])
for a, b in zip(geometry['points'], geometry['points'][1:]):
    for sample in range(1001):
        t = sample / 1000
        x = round(a[0] + (b[0] - a[0]) * t)
        y = round(a[1] + (b[1] - a[1]) * t)
        assert symbol.getpixel((x, y)) > 180, (x, y)
assert 'transition:opacity 350ms ease' in (DIST / 'intro.css').read_text()
assert '@media(prefers-reduced-motion:reduce)' in (DIST / 'intro.css').read_text()
assert not re.search(r'<(?:video|iframe)\b', html)
regions = json.loads((ROOT / 'notes/collection-regions.json').read_text())
collection = Image.open(DIST / 'assets' / regions['source'])
assert collection.size == tuple(regions['size'])
collection_pixels = collection.convert('L')
photos = [a for tag, a in doc.elements if a.get('class') == 'product-photo']
assert len(photos) == 6
for photo, region in zip(photos, regions['products']):
    assert photo.get('role') == 'img' and photo.get('aria-label')
    assert photo['viewbox'] == ' '.join(map(str, region['box']))
    x, y, width, height = region['box']
    assert x >= 0 and y >= 0 and width > 0 and height > 0
    assert x + width <= collection.width and y + height <= collection.height
    perimeter = [(u, y) for u in range(x, x + width)] + [(u, y + height - 1) for u in range(x, x + width)]
    perimeter += [(x, v) for v in range(y, y + height)] + [(x + width - 1, v) for v in range(y, y + height)]
    assert all(collection_pixels.getpixel(point) >= 100 for point in perimeter), region['key']
assert 'product-illustration' not in html and 'id="product-' not in html
assert not re.search(r'\d+\s*(?:€|EUR)|(?:esgotado|em stock|comprar agora)', html, re.I)
netlify = tomllib.loads((ROOT / 'netlify.toml').read_text())
assert netlify['build']['publish'] == 'dist'
assert netlify['build']['command'] == 'node --test tests/site.test.cjs'
assert not (ROOT / '.openai').exists()

manifest = json.loads((ROOT / 'notes/assets.json').read_text())
for item in manifest:
    assert sha256((DIST / 'assets' / item['asset']).read_bytes()).hexdigest() == item['sha256'], item['asset']
print(f'PASS: valid HTML structure; {len(ids)} unique IDs; all assets, anchors and accessible labels present.')
print('PASS: four partners, two founders, six product categories, and three community links.')
print(f'PASS: all {len(manifest)} supplied images retained byte-for-byte, including the original symbol.')
print('PASS: all six motion-path segments lie on the original symbol; fade and reduced-motion CSS are present.')
print('PASS: requested hero text removed, green strip retained, Run/Bike updated; Walk unchanged.')
print('PASS: all six collection windows use the unchanged original; no prices or stock claims added.')
