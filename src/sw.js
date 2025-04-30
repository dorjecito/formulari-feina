import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

// Precache de tots els assets generats per Vite
precacheAndRoute(self.__WB_MANIFEST)

// Neteja caches antigues
cleanupOutdatedCaches()

// Estratègia per a fitxers estàtics (HTML, CSS, JS)
registerRoute(
  ({ request }) => request.destination === 'script' ||
                   request.destination === 'style' ||
                   request.destination === 'document',
  new StaleWhileRevalidate()
)

// Estratègia per a imatges (cache i refresca al fons)
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate()
)

// Instal·lació immediata del SW nou (sense esperar el tancament de pestanyes)
self.addEventListener('install', event => {
  self.skipWaiting()
})

// Activació immediata del SW nou
self.addEventListener('activate', event => {
  clients.claim()
})
