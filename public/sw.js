const CACHE_NAME = 'blitz-board-v1'

const STATIC_ASSETS = [
  '/',
  '/scorer',
  '/results',
  '/payouts',
  '/history',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
]

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail on individual cache misses
      })
    })
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch — network first, fall back to cache
self.addEventListener('fetch', event => {
  // Skip non-GET and Firebase requests
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('firebaseio.com')) return
  if (event.request.url.includes('googleapis.com')) return
  if (event.request.url.includes('anthropic.com')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Return offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      })
  )
})