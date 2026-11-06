// ─────────────────────────────────────────────────────────────
// Verbindung zur Claude API
//
// Der API-Key liegt nur in deinem Browser (localStorage) und wird direkt
// an Anthropic geschickt. "dangerouslyAllowBrowser" erlaubt das – ist ok,
// solange nur DU die App mit DEINEM Key nutzt.
// ─────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk'
import { loadSettings } from './settings'

export class FriendlyError extends Error {}

async function askClaude({ system, messages, schema, effort = 'low', maxTokens = 4000 }) {
  const { apiKey, model } = loadSettings()
  if (!apiKey) throw new FriendlyError('Kein API-Key hinterlegt. Bitte in den Einstellungen eintragen.')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const params = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
    // effort "low" = schnelle Antworten (wichtig für flüssige Gespräche).
    // format = Claude muss exakt unserem JSON-Schema folgen.
    output_config: { effort, format: { type: 'json_schema', schema } },
  }
  // Falls ein Sicherheitsfilter eine Anfrage fälschlich ablehnt, springt
  // automatisch ein anderes Modell ein (gibt es nicht für Haiku).
  if (!model.startsWith('claude-haiku')) {
    params.betas = ['server-side-fallback-2026-07-01']
    params.fallbacks = 'default'
  }

  let res
  try {
    res = await client.beta.messages.create(params)
  } catch (err) {
    throw translateError(err)
  }

  if (res.stop_reason === 'refusal') {
    throw new FriendlyError('Claude hat diese Anfrage abgelehnt. Formuliere deine Nachricht bitte anders.')
  }
  if (res.stop_reason === 'max_tokens') {
    throw new FriendlyError('Die Antwort war zu lang und wurde abgeschnitten. Bitte nochmal versuchen.')
  }
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  try {
    return JSON.parse(text)
  } catch {
    throw new FriendlyError('Antwort konnte nicht gelesen werden. Bitte nochmal versuchen.')
  }
}

function translateError(err) {
  if (err instanceof Anthropic.AuthenticationError) return new FriendlyError('API-Key ungültig. Bitte in den Einstellungen prüfen.')
  if (err instanceof Anthropic.PermissionDeniedError) return new FriendlyError('Dieser API-Key darf das gewählte Modell nicht nutzen.')
  if (err instanceof Anthropic.RateLimitError) return new FriendlyError('Zu viele Anfragen – warte kurz und versuch es nochmal.')
  if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message))
    return new FriendlyError('Dein API-Guthaben ist leer. Lade es auf console.anthropic.com auf.')
  if (err instanceof Anthropic.APIConnectionError) return new FriendlyError('Keine Verbindung. Bist du online?')
  if (err instanceof Anthropic.APIError) return new FriendlyError(`Fehler von der API (${err.status}): ${err.message}`)
  return err
}

// Gesprächsverlauf in das Format der API umwandeln.
// Für die KI-Seite schicken wir nur den gesprochenen Text ("reply") zurück –
// das Feedback braucht Claude für den weiteren Gesprächsverlauf nicht.
function toApiMessages(history) {
  const msgs = [{ role: 'user', content: '[The scene starts. Open the conversation in character.]' }]
  for (const m of history) {
    if (m.role === 'ai') msgs.push({ role: 'assistant', content: m.text })
    else msgs.push({ role: 'user', content: m.viaVoice ? `[VOICE] ${m.text}` : m.text })
  }
  return msgs
}

export function chatTurn({ system, history, schema }) {
  return askClaude({ system, messages: toApiMessages(history), schema })
}

export function summarize({ system, history, schema }) {
  const transcript = history
    .map((m) => `${m.role === 'ai' ? 'OTHER PERSON' : 'LEARNER'}: ${m.text}`)
    .join('\n')
  return askClaude({
    system,
    messages: [{ role: 'user', content: `Transcript:\n${transcript}` }],
    schema,
    effort: 'medium',
  })
}
