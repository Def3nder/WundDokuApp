/*
 * Service Worker der WundDoku.
 *
 * Er haelt ausschliesslich zwei Dinge auf dem Geraet vor, damit die persoenliche
 * Zeiterfassung ohne Verbindung zum Server laeuft:
 *   - die unveraenderlichen, mit Hash benannten Programmdateien (/_next/static/)
 *   - die zuletzt geladene HTML-Seite der Zeiterfassung (/zeiterfassung...)
 *
 * Patienten-, Wund-, Foto- und Dokumentdaten werden NIE zwischengespeichert:
 * Alle anderen Seiten und alle API-Antworten laufen unveraendert am Worker
 * vorbei. Beim Anmelden bzw. Abmelden wird die Zwischenablage der
 * Zeiterfassungsseiten geleert.
 */

const BASIS = "wunddoku-basis-v1";
const STATISCH = "wunddoku-statisch-v1";
const SEITEN = "wunddoku-seiten-v1";
const AKTUELL = [BASIS, STATISCH, SEITEN];
const OFFLINE_SEITE = "/offline.html";
const ZEIT_PFAD = "/zeiterfassung";
const MAX_STATISCH = 600;
const NETZ_ZEITLIMIT_MS = 5000;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const antwort = await fetch(OFFLINE_SEITE, { cache: "reload" });
    if (antwort.ok && !antwort.redirected) await (await caches.open(BASIS)).put(OFFLINE_SEITE, antwort);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (!AKTUELL.includes(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

function istZeitSeite(pfad) {
  return pfad === ZEIT_PFAD || pfad.startsWith(ZEIT_PFAD + "/");
}

self.addEventListener("fetch", (event) => {
  const anfrage = event.request;
  if (anfrage.method !== "GET") return;
  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(ausCacheOderNetz(anfrage));
  } else if (anfrage.mode === "navigate") {
    event.respondWith(seite(anfrage, url));
  }
});

async function ausCacheOderNetz(anfrage) {
  const cache = await caches.open(STATISCH);
  const treffer = await cache.match(anfrage);
  if (treffer) return treffer;
  const antwort = await fetch(anfrage);
  if (antwort.status === 200) await cache.put(anfrage, antwort.clone());
  return antwort;
}

function schluessel(url) {
  return url.pathname + url.search;
}

function mitZeitlimit(versprechen, ms) {
  return new Promise((erfolg, fehler) => {
    const timer = setTimeout(() => fehler(new Error("Zeitueberschreitung")), ms);
    versprechen.then((wert) => { clearTimeout(timer); erfolg(wert); }, (grund) => { clearTimeout(timer); fehler(grund); });
  });
}

async function seite(anfrage, url) {
  const zeit = istZeitSeite(url.pathname);
  const seiten = await caches.open(SEITEN);
  const vorhanden = zeit ? (await seiten.match(schluessel(url))) || (await seiten.match(ZEIT_PFAD)) : undefined;
  try {
    // Ist die Zeiterfassung schon auf dem Geraet, darf ein haengender Server sie nicht ausbremsen.
    const abruf = fetch(anfrage);
    const antwort = vorhanden ? await mitZeitlimit(abruf, NETZ_ZEITLIMIT_MS) : await abruf;
    if (antwort.redirected && new URL(antwort.url).pathname === "/login") {
      await caches.delete(SEITEN);
    } else if (zeit && antwort.status >= 500 && vorhanden) {
      return vorhanden;
    } else if (zeit && antwort.ok && !antwort.redirected && (antwort.headers.get("content-type") || "").includes("text/html")) {
      await seiten.put(schluessel(url), antwort.clone());
    }
    return antwort;
  } catch {
    if (vorhanden) return vorhanden;
    const offline = await (await caches.open(BASIS)).match(OFFLINE_SEITE);
    return offline || new Response("Keine Verbindung zum Server.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("message", (event) => {
  const daten = event.data;
  if (daten && daten.typ === "vorwaermen" && Array.isArray(daten.pfade)) event.waitUntil(vorwaermen(daten.pfade));
});

/**
 * Laedt die Zeiterfassung samt ihrer Programmdateien einmal im Voraus, damit sie
 * auch dann offline startet, wenn sie nie vorher aufgerufen wurde.
 */
async function vorwaermen(pfade) {
  const seiten = await caches.open(SEITEN);
  const statisch = await caches.open(STATISCH);
  for (const pfad of pfade) {
    if (!istZeitSeite(pfad) || (await seiten.match(pfad))) continue;
    try {
      const antwort = await fetch(pfad, { headers: { Accept: "text/html" } });
      if (!antwort.ok || antwort.redirected) continue;
      const html = await antwort.clone().text();
      await seiten.put(pfad, antwort);
      const dateien = new Set([
        ...(html.match(/\/_next\/static\/[^"'\\\s<>)]+/g) || []),
        ...(html.match(/(?<=["'])static\/(?:chunks|css|media)\/[^"'\\\s<>)]+/g) || []).map((p) => "/_next/" + p),
      ]);
      for (const datei of dateien) await ablegen(statisch, datei);
    } catch { /* Offline oder abgemeldet: dann gibt es nichts vorzuwaermen. */ }
  }
  const schluesselListe = await statisch.keys();
  for (const eintrag of schluesselListe.slice(0, Math.max(0, schluesselListe.length - MAX_STATISCH))) await statisch.delete(eintrag);
}

async function ablegen(cache, datei) {
  try {
    if (await cache.match(datei)) return;
    const antwort = await fetch(datei);
    if (antwort.status !== 200) return;
    await cache.put(datei, antwort.clone());
    if (new URL(datei, self.location.origin).pathname.endsWith(".css")) {
      const css = await antwort.text();
      for (const treffer of css.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/g)) {
        const ziel = new URL(treffer[1], new URL(datei, self.location.origin));
        if (ziel.origin === self.location.origin && ziel.pathname.startsWith("/_next/static/")) await ablegen(cache, ziel.pathname + ziel.search);
      }
    }
  } catch { /* Einzelne fehlende Datei ist kein Grund, das Vorwaermen abzubrechen. */ }
}
