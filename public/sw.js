/**
 * public/sw.js — Salon Central service worker
 *
 * Deliberately minimal. It does NOT cache API responses or authenticated
 * dashboard pages: this app serves per-tenant data behind a session cookie,
 * so a naive runtime cache risks showing one salon's data to another user
 * on a shared device. Scope is limited to three jobs:
 *
 *   1. receive Web Push payloads and show a notification
 *   2. focus (or open) the right page when a notification is tapped
 *   3. serve an offline fallback page for failed navigations
 *
 * Bump SW_VERSION whenever this file changes so clients drop the old cache.
 */

const SW_VERSION   = "v1";
const OFFLINE_CACHE = `salon-central-offline-${SW_VERSION}`;
const OFFLINE_URL   = "/offline.html";

// ─── Install: pre-cache only the offline fallback ────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

// ─── Activate: drop caches from previous versions ────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Offline fallback for navigations only ───────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate" || request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    }),
  );
});

// ─── Push ────────────────────────────────────────────────────────────────────
// Payload shape sent by lib/push.ts:
//   { title, body, url, tag, icon, badge, image, requireInteraction, actions }
// A push with no payload (or unparseable JSON) still shows a generic
// notification: on Chrome/Android a "userVisibleOnly" subscription that
// receives a push without showing one gets a browser-generated
// "This site has been updated in the background" notice instead.
self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Salon Central";
  const options = {
    body:    payload.body  || "You have a new update from your salon.",
    icon:    payload.icon  || "/icons/icon-192.png",
    badge:   payload.badge || "/icons/icon-192.png",
    image:   payload.image || undefined,
    tag:     payload.tag   || "salon-central",
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction),
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : [],
    // Read back in notificationclick to decide where to navigate.
    data: {
      url: payload.url || "/",
      sentAt: payload.sentAt || Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click ──────────────────────────────────────────────────────
// Focus an already-open tab on the target origin and navigate it, rather than
// piling up duplicate tabs each time a client taps an offer.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // An action button may carry its own url (payload.actions[].url is not part
  // of the Notification API, so we look it up from the stored data instead).
  const target = event.notification.data?.url || "/";
  const targetUrl = new URL(target, self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).origin !== targetUrl.origin) continue;
          if ("focus" in client) {
            if (client.url !== targetUrl.href && "navigate" in client) {
              return client.navigate(targetUrl.href).then((c) => c && c.focus());
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl.href);
      }),
  );
});

// ─── Subscription rotation ───────────────────────────────────────────────────
// Browsers may silently rotate an endpoint. Re-subscribe and hand the new
// subscription to the backend so the old row can be swapped out.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
      if (!applicationServerKey) return;

      const fresh = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: fresh.toJSON(),
          previousEndpoint: event.oldSubscription?.endpoint,
        }),
      }).catch(() => {});
    })(),
  );
});

// Lets the page tell a waiting worker to take over immediately after a deploy.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
