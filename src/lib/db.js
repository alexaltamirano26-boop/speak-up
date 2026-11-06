// ─────────────────────────────────────────────────────────────
// Lokale Datenbank (IndexedDB über Dexie.js)
// Alles bleibt auf deinem Gerät – kein Server, kein Login.
// ─────────────────────────────────────────────────────────────
import Dexie from 'dexie'

export const db = new Dexie('speakup')

// Die Strings definieren, nach welchen Feldern gesucht werden kann (Indizes).
// "++id" = automatische ID, "&[type+front]" = pro Typ eindeutig (keine doppelten Karten).
db.version(1).stores({
  conversations: '++id, scenarioId, startedAt, finishedAt',
  cards: '++id, &[type+front], front, due, type, createdAt',
  errors: 'tag, count, lastSeen',
})

/*
  Aufbau der Datensätze:

  conversation = {
    id, scenarioId, difficulty, startedAt, finishedAt,
    messages: [{ role: 'user'|'ai', text, viaVoice, confidence, feedback, suggestions }],
    summary: { score, verdict, strengths[], improve[], key_phrases[] } | null
  }

  card = {
    id, front (Englisch), back (Deutsch), example, type: 'word'|'phrase'|'mistake',
    sourceConvId, createdAt,
    // Spaced-Repetition-Felder (SM-2), werden im Vokabeltrainer benutzt:
    due, interval, ease, reps, lapses
  }

  error = { tag, count, lastSeen, lastExample }
*/

// Neue Karte anlegen – aber nur, wenn es sie noch nicht gibt.
export async function addCard({ front, back, example = '', type = 'word', sourceConvId = null }) {
  const clean = front.trim()
  if (!clean) return
  const exists = await db.cards
    .where('front').equalsIgnoreCase(clean)
    .filter((c) => c.type === type)
    .first()
  if (exists) return
  const now = Date.now()
  await db.cards.add({
    front: clean, back: back.trim(), example, type, sourceConvId,
    createdAt: now, due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0,
  })
}

// Fehler-Statistik hochzählen (für "häufigste Fehler" und Personalisierung).
export async function recordErrors(tags, example) {
  const now = Date.now()
  for (const tag of tags) {
    const existing = await db.errors.get(tag)
    await db.errors.put({
      tag,
      count: (existing?.count ?? 0) + 1,
      lastSeen: now,
      lastExample: example,
    })
  }
}

export async function topErrors(limit = 3) {
  const all = await db.errors.orderBy('count').reverse().limit(limit).toArray()
  return all.map((e) => e.tag)
}
