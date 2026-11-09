// Hors ligne : la page et la liste passent d'abord par le réseau, sinon la dernière copie.
// La base Firebase (autre domaine) n'est jamais mise en cache.
var CACHE = 'recolte-v37';
var SHELL = ['./', './index.html', './config.js', './cle-web.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './listes/actuelle.json', './referentiel/conditionnements.json', './referentiel/debouches.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
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
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) { return hit || caches.match('./index.html'); });
  }));
});
