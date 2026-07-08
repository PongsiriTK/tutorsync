/* TutorSync service worker — shows push reminders even when the app is closed. */
self.addEventListener('install', (e) => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'TutorSync 🗓️'
  const options = {
    body: data.body || 'มีการอัปเดตแพลนของคุณ',
    tag: data.tag || 'tutorsync',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) { if ('focus' in c) { c.navigate(url); return c.focus() } }
    if (self.clients.openWindow) return self.clients.openWindow(url)
  })())
})
