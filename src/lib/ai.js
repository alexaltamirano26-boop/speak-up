// ─────────────────────────────────────────────────────────────
// Verbindung zur KI: Google Gemini API (kostenloses Kontingent)
//
// Der API-Key liegt nur in deinem Browser (localStorage) und wird direkt
// an Google geschickt – kein eigener Server nötig.
// Key holen: https://aistudio.google.com/apikey (kostenlos, ohne Kreditkarte)
// ─────────────────────────────────────────────────────────────
import { loadSettings } from './settings'

const API = 'https://generativelanguage.googleapis.com/v1beta'

export class FriendlyError extends Error {}

// Reihenfolge, in der wir Modelle bevorzugen. Ist ein Modell im Gratis-
// Kontingent ausgeschöpft (Fehler 429), probieren wir automatisch das nächste.
const PREFERRED = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest']

// Holt die Liste der Modelle, die dein Key benutzen darf.
export async function listModels(apiKey) {
  const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } })
  if (!res.ok) throw await toFriendlyError(res)
  const data = await res.json()
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((id) => id.includes('flash') && !/image|tts|audio|live|embedding|preview-tts/.test(id))
}

// Wählt aus den verfügbaren Modellen das beste nach unserer Vorliebe.
export function pickDefaultModel(available) {
  for (const p of PREFERRED) if (available.includes(p)) return p
  return available[0] ?? 'gemini-2.5-flash'
}

// Unser Schema ist Standard-JSON-Schema. Gemini erwartet ein etwas anderes
// Format (Typen in Großbuchstaben, kein "additionalProperties") → umwandeln.
function toGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema)
  if (!schema || typeof schema !== 'object') return schema
  const out = {}
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties') continue
    if (k === 'type') out.type = String(v).toUpperCase()
    else if (k === 'properties') {
      out.properties = Object.fromEntries(Object.entries(v).map(([p, s]) => [p, toGeminiSchema(s)]))
      out.propertyOrdering = Object.keys(v) // Felder in fester Reihenfolge
    } else if (k === 'items') out.items = toGeminiSchema(v)
    else out[k] = v
  }
  return out
}

async function callModel({ apiKey, model, system, contents, schema }) {
  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema: toGeminiSchema(schema),
    maxOutputTokens: 4000,
  }
  // Gemini 2.5 "denkt" standardmäßig nach → langsamer. Für flüssige
  // Gespräche schalten wir das ab.
  if (model.includes('2.5')) generationConfig.thinkingConfig = { thinkingBudget: 0 }

  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig,
    }),
  })
  if (!res.ok) {
    const err = await toFriendlyError(res)
    err.status = res.status
    throw err
  }
  const data = await res.json()

  if (data.promptFeedback?.blockReason) {
    throw new FriendlyError('Die Nachricht wurde vom Sicherheitsfilter blockiert. Formuliere sie bitte anders.')
  }
  const cand = data.candidates?.[0]
  if (!cand) throw new FriendlyError('Keine Antwort erhalten. Bitte nochmal versuchen.')
  if (cand.finishReason === 'SAFETY') throw new FriendlyError('Die Antwort wurde vom Sicherheitsfilter blockiert. Bitte anders formulieren.')
  if (cand.finishReason === 'MAX_TOKENS') throw new FriendlyError('Die Antwort war zu lang. Bitte nochmal versuchen.')

  const text = (cand.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('')
  try {
    return JSON.parse(text)
  } catch {
    throw new FriendlyError('Antwort konnte nicht gelesen werden. Bitte nochmal versuchen.')
  }
}

async function askAI({ system, contents, schema }) {
  const { apiKey, model, availableModels } = loadSettings()
  if (!apiKey) throw new FriendlyError('Kein API-Key hinterlegt. Bitte in den Einstellungen eintragen.')

  // Erst das gewählte Modell. Ist dessen Gratis-Kontingent aufgebraucht,
  // weichen wir aus – zuerst auf "lite"-Modelle, die ein höheres Limit haben.
  const isLite = (m) => m.includes('lite')
  const others = PREFERRED.filter((m) => m !== model && (availableModels ?? []).includes(m))
  const chain = [model, ...others.filter(isLite), ...others.filter((m) => !isLite(m))]

  let lastErr
  for (const m of chain) {
    try {
      return await callModel({ apiKey, model: m, system, contents, schema })
    } catch (err) {
      lastErr = err
      if (err.status !== 429 && err.status !== 503) throw err // nur bei "Limit erreicht"/"überlastet" wechseln
    }
  }
  throw lastErr
}

async function toFriendlyError(res) {
  let msg = ''
  try {
    msg = (await res.json()).error?.message ?? ''
  } catch { /* keine JSON-Antwort */ }
  if (res.status === 400 && /api key/i.test(msg)) return new FriendlyError('API-Key ungültig. Bitte in den Einstellungen prüfen.')
  if (res.status === 403) return new FriendlyError('Dieser API-Key hat keinen Zugriff. Erstelle einen neuen auf aistudio.google.com.')
  if (res.status === 429) return new FriendlyError('Das kostenlose Tageslimit ist erreicht. Morgen geht es weiter – oder probier es in einer Minute nochmal.')
  if (res.status === 503) return new FriendlyError('Gemini ist gerade überlastet. Bitte gleich nochmal versuchen.')
  return new FriendlyError(`Fehler von der API (${res.status}): ${msg || res.statusText}`)
}

// Gesprächsverlauf ins Gemini-Format umwandeln ("model" = KI, "user" = du).
// Für die KI-Seite schicken wir nur den gesprochenen Text ("reply") zurück.
function toContents(history) {
  const contents = [{ role: 'user', parts: [{ text: '[The scene starts. Open the conversation in character.]' }] }]
  for (const m of history) {
    if (m.role === 'ai') contents.push({ role: 'model', parts: [{ text: m.text }] })
    else contents.push({ role: 'user', parts: [{ text: m.viaVoice ? `[VOICE] ${m.text}` : m.text }] })
  }
  return contents
}

export function chatTurn({ system, history, schema }) {
  return askAI({ system, contents: toContents(history), schema })
}

export function summarize({ system, history, schema }) {
  const transcript = history
    .map((m) => `${m.role === 'ai' ? 'OTHER PERSON' : 'LEARNER'}: ${m.text}`)
    .join('\n')
  return askAI({ system, contents: [{ role: 'user', parts: [{ text: `Transcript:\n${transcript}` }] }], schema })
}
