# Fabrique polices/signes-pixel.woff2 : les quelques signes que les polices pixel art (VT323, Press Start 2P) n'ont pas,
# dessinés en pixels (étape 48, docs/CONTRAT_APPARENCE_PIXEL_ART.md, règle R11) : ⋯ ▲ ▼ ▴ ▾ ● → − ✓ ＋ et l'horloge 🕘.
# La page la met juste après VT323 ou Press Start 2P : le navigateur la prend seulement pour ces signes, jamais une
# police du système. Mêmes « pixels » que VT323 (100 unités de large, 80 de haut, 1000 unités par cadratin).
# Police dessinée pour Farm tasks (étape 53 de son dépôt), reprise pour le Cumul avec ▴ ▾ et ＋ en plus ; même licence que le dépôt.
# Lancement depuis la racine du dépôt : python3 apparence/fabriquer-signes.py   (il faut : pip install fonttools brotli)
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX, PY = 100, 80  # un pixel : 100 unités de large, 80 de haut (comme VT323)

# Chaque signe : (code, avance en pixels, rangée du bas (en pixels au-dessus de la ligne de base), dessin de haut en bas).
SIGNES = {
    'pointsdesuspension': (0x22EF, 7, 3, ['.#.#.#.', '.#.#.#.']),
    'triangleHaut': (0x25B2, 6, 1, ['...#..', '...#..', '..###.', '..###.', '.#####', '.#####']),
    'triangleBas': (0x25BC, 6, 1, ['.#####', '.#####', '..###.', '..###.', '...#..', '...#..']),
    'disque': (0x25CF, 6, 1, ['..###.', '.#####', '.#####', '.#####', '.#####', '..###.']),
    'fleche': (0x2192, 6, 1, ['...#..', '...##.', '######', '######', '...##.', '...#..']),
    'moins': (0x2212, 4, 3, ['.##.']),
    'coche': (0x2713, 7, 1, ['......#', '.....#.', '#...#..', '.#.#...', '..#....']),
    'petitHaut': (0x25B4, 6, 2, ['...#..', '..###.', '.#####']),
    'petitBas': (0x25BE, 6, 2, ['.#####', '..###.', '...#..']),
    'plus': (0xFF0B, 7, 1, ['...#...', '...#...', '#######', '...#...', '...#...']),
    'horloge': (0x1F558, 9, 0, ['...###...', '.##...##.', '.#..#..#.', '#...#...#', '#.###...#', '#.......#', '.#.....#.', '.##...##.', '...###...']),
}

noms = ['.notdef'] + list(SIGNES)
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(noms)
fb.setupCharacterMap({code: nom for nom, (code, *_rest) in SIGNES.items()})
glyphes, avances = {}, {}
vide = TTGlyphPen(None)
glyphes['.notdef'] = vide.glyph()
avances['.notdef'] = (400, 0)
for nom, (code, larg, bas, dessin) in SIGNES.items():
    pen = TTGlyphPen(None)
    haut = len(dessin)
    for r, ligne in enumerate(dessin):
        y0 = (bas + haut - 1 - r) * PY
        for c, ch in enumerate(ligne):
            if ch != '#':
                continue
            x0 = c * PX
            pen.moveTo((x0, y0)); pen.lineTo((x0, y0 + PY)); pen.lineTo((x0 + PX, y0 + PY)); pen.lineTo((x0 + PX, y0)); pen.closePath()
    glyphes[nom] = pen.glyph()
    avances[nom] = (larg * PX, 0)
fb.setupGlyf(glyphes)
fb.setupHorizontalMetrics({n: (a, glyphes[n].xMin if hasattr(glyphes[n], 'xMin') and glyphes[n].numberOfContours else 0) for n, (a, _l) in avances.items()})
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({'familyName': 'Signes pixel', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=800, usWinDescent=200)
fb.setupPost()
fb.font.flavor = 'woff2'
sortie = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'polices', 'signes-pixel.woff2')
fb.save(sortie)
print('Écrit : ' + os.path.normpath(sortie) + ' (' + str(os.path.getsize(sortie)) + ' octets)')
