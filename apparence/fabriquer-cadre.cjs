// Fabrique apparence/cadre-carte.png : le cadre en gros pixels des cartes de l'apparence pixel art (étape 48 du Cumul, repris de l'étape 53 de Farm tasks,
// docs/CONTRAT_APPARENCE_PIXEL_ART.md, annexe A4 et A5). Même dessin que la maquette validée le 21/11/2026
// (sources/carte-px.cjs), mais en une petite image découpée en 9 morceaux (border-image) au lieu d'un canevas.
//
// Un pixel du cadre = 3 × 3 points. L'image fait 11 × 13 pixels du cadre, soit 33 × 39 points :
//   - 5 pixels à gauche, à droite et en haut (coins en escalier), 1 pixel au milieu qui s'étire ;
//   - 7 pixels en bas : les 5 du cadre, puis 2 pixels d'ombre (l'ombre « 6 points plus bas »).
// Cadre, de l'extérieur vers l'intérieur : #3a2016, #c9875a, #e8a874, #3a2016, puis l'intérieur crème #fff4e4.
// Coins rentrés de 5, 3, 2, 1 et 1 pixels. La dernière rangée du haut est déjà rose (#e0709f) : c'est le début du haut
// de la carte, que la page prolonge (en-tête des listes, titre des fenêtres).
// Lancement depuis la racine du dépôt : node apparence/fabriquer-cadre.cjs   (sans dépendance)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 11, H = 13, BAS = 2, ECH = 3; // largeur, hauteur (en pixels du cadre), rangées d'ombre, points par pixel
const CUT = { 5: [5, 3, 2, 1, 1], 4: [4, 2, 1, 1], 3: [3, 1, 1], 2: [2, 1], 1: [1], 0: [] };
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const img = Array.from({ length: H }, () => Array.from({ length: W }, () => [0, 0, 0, 0]));
const point = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) img[y][x] = c; };

// Rectangle à coins en escalier, rentré de k, entre les rangées y0 et y1 (exclue).
function forme(k, coul, r, y0, y1, peindre) {
  const L = k, R = W - k, T = y0 + k, B = y1 - k;
  for (let y = T; y < B; y++) {
    const i = Math.min(y - T, B - 1 - y), cut = (CUT[r] || [])[i] || 0;
    for (let x = L + cut; x < R - cut; x++) peindre(x, y, coul);
  }
}
// L'ombre : la forme de la carte, 2 pixels plus bas, brun très foncé à 55 %.
const OMBRE = [42, 24, 16, Math.round(0.55 * 255)];
forme(0, OMBRE, 5, BAS, H, point);
// La carte par-dessus.
const carte = [['#3a2016', 5], ['#c9875a', 4], ['#e8a874', 3], ['#3a2016', 2], ['#fff4e4', 1]];
carte.forEach(([c, r], k) => forme(k, hex(c), r, 0, H - BAS, point));
// Début du haut rose : 5e rangée, rentrée d'un pixel de plus aux deux bouts (comme la maquette).
for (let x = 5; x < W - 5; x++) point(x, 4, hex('#e0709f'));

// Agrandi 3 fois, sans lissage, puis écrit en PNG (RGBA, sans compression particulière).
const w = W * ECH, h = H * ECH, brut = Buffer.alloc(h * (1 + w * 4));
for (let y = 0; y < h; y++) {
  brut[y * (1 + w * 4)] = 0;
  for (let x = 0; x < w; x++) img[Math.floor(y / ECH)][Math.floor(x / ECH)].forEach((v, i) => { brut[y * (1 + w * 4) + 1 + x * 4 + i] = v; });
}
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const o of b) c = TABLE[(c ^ o) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const morceau = (type, data) => { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), morceau('IHDR', ihdr), morceau('IDAT', zlib.deflateSync(brut, { level: 9 })), morceau('IEND', Buffer.alloc(0))]);
const sortie = path.join(__dirname, 'cadre-carte.png');
fs.writeFileSync(sortie, png);
console.log('Écrit : ' + sortie + ' (' + w + ' × ' + h + ' points, ' + png.length + ' octets)');
