// Test des icônes de l'onglet, des favoris et de l'écran d'accueil (21/11/2026).
// Chrome garde une icône d'onglet sous son adresse : pour qu'il prenne le nouveau logo, les fichiers
// changent de nom à chaque nouveau logo. Ce test vérifie que chaque icône citée existe, qu'aucune page
// ne cite plus les anciens noms, et que /favicon.ico est une vraie icône (sinon le site renvoie la page).
// Sans navigateur ni réseau. Lancement depuis la racine du dépôt : node tests/icones.cjs
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
function verifie(c, msg) { if (c) { ok++; console.log('OK  ' + msg); } else { ko++; console.log('ÉCHEC ' + msg); } }

const ANCIENS = ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
const LOGO = 'icons/cumul-cagette.svg';

// 1. Les pages : favicon.ico, logo SVG, icône iPhone (index.html) ; mêmes icônes dans la page du magasin.
for (const page of ['index.html', 'magasin.html']) {
  const html = lire(page);
  const liens = [...html.matchAll(/<link rel="(icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[2]);
  verifie(liens.includes('favicon.ico') && liens.includes(LOGO), `${page} : onglet avec favicon.ico et ${LOGO}`);
  verifie(liens.every((h) => fs.existsSync(path.join(RACINE, h))), `${page} : chaque icône citée existe (${liens.join(', ')})`);
  verifie(html.includes(`<img src="${LOGO}"`), `${page} : le logo de l'en-tête est le nouveau fichier`);
  verifie(ANCIENS.every((a) => !html.includes(a)), `${page} : aucun ancien nom d'icône`);
}
verifie(/rel="apple-touch-icon" href="icons\/cumul-cagette-180\.png"/.test(lire('index.html')), 'index.html : icône iPhone renommée');

// 2. Le manifeste (téléphone) : trois icônes présentes, dont une ronde (maskable).
const man = JSON.parse(lire('manifest.webmanifest'));
verifie(man.icons.length === 3 && man.icons.every((i) => i.src.startsWith('icons/cumul-cagette') && fs.existsSync(path.join(RACINE, i.src))), 'manifeste : trois icônes renommées, présentes');
verifie(man.icons.some((i) => i.purpose === 'maskable'), 'manifeste : icône ronde (maskable) gardée');

// 3. Le hors-ligne : sw.js garde les nouveaux fichiers et pas les anciens.
const sw = lire('sw.js');
const shell = JSON.parse(sw.match(/var SHELL = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
verifie(shell.includes('./favicon.ico') && shell.includes('./' + LOGO), 'sw.js : favicon.ico et le logo gardés hors ligne');
verifie(shell.every((f) => f === './' || fs.existsSync(path.join(RACINE, f))), 'sw.js : chaque fichier gardé hors ligne existe');
verifie(ANCIENS.every((a) => !sw.includes(a)), 'sw.js : aucun ancien nom d\'icône');

// 4. favicon.ico : vraie icône Windows (en-tête 00 00 01 00) en 16, 32 et 48 pixels.
const ico = fs.readFileSync(path.join(RACINE, 'favicon.ico'));
const n = ico.readUInt16LE(4);
const tailles = [];
for (let i = 0; i < n; i++) tailles.push(ico[6 + i * 16] || 256);
verifie(ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1, 'favicon.ico : vraie icône (pas la page du site)');
verifie([16, 32, 48].every((t) => tailles.includes(t)), `favicon.ico : tailles ${tailles.join(', ')}`);

// 5. Le logo est bien la cagette de légumes (fond anthracite), et les anciens fichiers ont disparu.
verifie(/<rect width="512" height="512" rx="112" fill="#373737"\/>/.test(lire(LOGO)), 'logo : fond anthracite de la cagette de légumes');
verifie(ANCIENS.every((a) => !fs.existsSync(path.join(RACINE, a))), 'anciens fichiers d\'icônes retirés');

console.log(`\n${ok} sur ${ok + ko} vérifications réussies`);
process.exit(ko ? 1 : 0);
