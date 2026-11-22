// Hors ligne : la page et la liste passent d'abord par le réseau, sinon la dernière copie.
// La base Firebase (autre domaine) n'est jamais mise en cache.
// /taches (taches.html) : depuis le 19/11/2026, seulement la page « Aurore Task a déménagé » qui renvoie vers la
// nouvelle adresse d'Aurore Task (dépôt aurore-task) ; sans réseau, elle retombe sur elle-même, pas sur le Cumul.
var CACHE = 'recolte-v72';
// Les fichiers de l'apparence pixel art (étape 48, de press-start-2p.woff2 à vignette-pixel.png) sont gardés pour tous,
// même restés en classique, pour pouvoir la choisir sans réseau.
var SHELL = ['./', './index.html', './config.js', './cle-web.js', './manifest.webmanifest', './favicon.ico', './icons/cumul-cagette.svg', './icons/cumul-cagette-192.png', './listes/actuelle.json', './referentiel/conditionnements.json', './referentiel/debouches.json', './especes/plants.svg', './especes/modifies.svg', './polices/bricolage-grotesque.woff2', './polices/dm-sans.woff2', './polices/open-sans.woff2',
  './polices/press-start-2p.woff2', './polices/vt323.woff2', './polices/signes-pixel.woff2', './apparence/fond-ordinateur.png', './apparence/fond-telephone.png', './apparence/cadre-carte.png', './apparence/logo-pixel.png', './apparence/coche-pixel.svg', './apparence/vignette-classique.png', './apparence/vignette-pixel.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // La page des tâches à part : son absence (ancien site, serveur de test) ne bloque pas le reste.
    return c.addAll(SHELL).then(function () { return Promise.all(['./taches'].map(function (u) { return c.add(u).catch(function () {}); })); });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) { return hit || (url.pathname.indexOf('/taches') >= 0 ? caches.match('./taches').then(function (t) { return t || caches.match('./taches.html'); }) : caches.match('./index.html')); });
  }));
});
