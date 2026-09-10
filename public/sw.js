// Service Worker do Franc Money.
//
// Escopo deliberadamente pequeno: só acelera o carregamento de arquivos
// estáticos (CSS, JS, ícones) guardando uma cópia local. Páginas HTML e
// chamadas de API NUNCA passam por aqui — sempre vão direto pra rede, pra
// nunca mostrar dado financeiro desatualizado.
//
// Ao mudar CSS/JS, é preciso subir o número da versão abaixo pra invalidar
// o cache antigo (senão o navegador continuaria servindo o arquivo velho).
const CACHE_NAME = 'franc-money-v1';

const PRECACHE_URLS = [
  '/dashboard.css',
  '/style.css',
  '/register.css',
  '/session.js',
  '/favicon.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isPrecached = PRECACHE_URLS.includes(url.pathname);
  if (event.request.method !== 'GET' || !isPrecached) {
    return; // deixa o navegador tratar normalmente (rede)
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
