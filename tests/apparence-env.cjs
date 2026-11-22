// Étape 48 (Cumul) (docs/CONTRAT_APPARENCE_PIXEL_ART.md, test T3) : APPARENCE=pixel fait tourner un fichier de tests dans
// l'apparence pixel art. Chaque navigateur ouvert par le test commence alors avec recolte.apparence = "pixel" sur
// l'appareil (sauf si le test l'a déjà posé), exactement comme un appareil où l'on a choisi « Pixel art ».
// Sans la variable (ou APPARENCE=classique), rien ne change : le test tourne dans l'apparence classique.
// Les vérifications d'aspect propres au classique (tailles, couleurs, arrondis mesurés) se sautent avec
// sautePixel(msg) : la liste des vérifications sautées est imprimée, et leur équivalent est dans tests/apparence.cjs.
const { chromium } = require('playwright');

const PIXEL = process.env.APPARENCE === 'pixel';
const sautees = [];

if (PIXEL && !chromium.__apparence) {
  chromium.__apparence = true;
  const lancer = chromium.launch.bind(chromium);
  chromium.launch = async (...a) => {
    const nav = await lancer(...a);
    const nouveau = nav.newContext.bind(nav);
    nav.newContext = async (...o) => {
      const ctx = await nouveau(...o);
      await ctx.addInitScript(() => { try { if (localStorage.getItem('recolte.apparence') === null) localStorage.setItem('recolte.apparence', '"pixel"'); } catch (e) { /* pas de mémoire */ } });
      return ctx;
    };
    nav.newPage = async (...o) => (await nav.newContext(...o)).newPage();
    return nav;
  };
  console.log('Apparence : PIXEL ART (APPARENCE=pixel)');
  process.on('exit', () => {
    if (sautees.length) console.log('Vérifications propres au classique, sautées en pixel art (' + sautees.length + ') :\n' + sautees.map((m) => '  - ' + m).join('\n'));
  });
}

// Pour une vérification d'aspect propre à l'apparence classique : vrai s'il faut la sauter (et la note).
function sautePixel(msg) { if (PIXEL) { sautees.push(msg); console.log('SAUTÉ ' + msg + ' (aspect du classique)'); } return PIXEL; }

module.exports = { PIXEL, sautePixel };
