// ─────────────────────────────────────────────────────────────
// KI-Rollenspiel-Chat – die wichtigste Funktion der App
//
// Ablauf:
//  1. Beim Start eröffnet die KI das Gespräch (z.B. "Next, please. Passport?")
//  2. Du antwortest per Mikrofon oder Tastatur
//  3. Claude liefert: Antwort in der Rolle + Feedback zu deinem Satz + Vokabeln
//  4. Vokabeln & Fehler landen automatisch in der Datenbank (für den Trainer)
//  5. "Beenden" → Auswertung mit Punktzahl
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { db, addCard, recordErrors, topErrors } from '../lib/db'
import { getScenario, getDifficulty } from '../data/scenarios'
import { buildChatSystemPrompt, CHAT_SCHEMA, buildSummaryPrompt, SUMMARY_SCHEMA } from '../lib/prompts'
import { chatTurn, summarize } from '../lib/claude'
import { speak, stopSpeaking, useSpeechRecognition, canListen } from '../lib/speech'
import FeedbackCard from '../components/FeedbackCard'
import SummaryView from '../components/SummaryView'

export default function ChatScreen({ scenarioId, difficulty: level, settings, onExit }) {
  const scenario = getScenario(scenarioId)
  const difficulty = getDifficulty(level)

  const [messages, setMessages] = useState([]) // [{ role, text, viaVoice, feedback, vocab, suggestions }]
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [listenMode, setListenMode] = useState(false) // Hörmodus: KI-Text erst nach Antippen sichtbar
  const [showHelp, setShowHelp] = useState(false)
  const [goalReached, setGoalReached] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)

  const convIdRef = useRef(null)
  const systemRef = useRef('')
  const startedRef = useRef(false)
  const bottomRef = useRef(null)

  // ── Gespräch starten (einmalig) ─────────────────────────────
  useEffect(() => {
    if (startedRef.current) return // React StrictMode ruft Effekte doppelt auf
    startedRef.current = true
    ;(async () => {
      const frequentErrors = await topErrors(3)
      systemRef.current = buildChatSystemPrompt({ scenario, difficulty, frequentErrors })
      convIdRef.current = await db.conversations.add({
        scenarioId, difficulty: level, startedAt: Date.now(), finishedAt: null, messages: [], summary: null,
      })
      await runTurn([])
    })()
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Automatisch nach unten scrollen bei neuen Nachrichten
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, summary])

  // ── Ein Gesprächszug: Verlauf an Claude schicken, Antwort verarbeiten ──
  async function runTurn(history) {
    setBusy(true)
    setError('')
    try {
      const result = await chatTurn({ system: systemRef.current, history, schema: CHAT_SCHEMA })

      // Feedback gehört zur LETZTEN Nachricht des Nutzers
      const updated = [...history]
      const last = updated[updated.length - 1]
      if (last?.role === 'user' && result.feedback.status !== 'none') {
        updated[updated.length - 1] = { ...last, feedback: result.feedback }
      }
      const aiMsg = { role: 'ai', text: result.reply, vocab: result.new_vocab, suggestions: result.suggestions }
      const next = [...updated, aiMsg]
      setMessages(next)
      setShowHelp(false)
      if (result.goal_reached) setGoalReached(true)

      if (settings.autoSpeak) speak(result.reply, { rate: difficulty.ttsRate, voiceName: settings.voiceName })

      await saveLearningData(result, last)
      await db.conversations.update(convIdRef.current, { messages: next })
    } catch (err) {
      setMessages(history) // Nutzer-Nachricht bleibt stehen → "Nochmal versuchen"
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  // Vokabeln und Fehler speichern → daraus speist sich später der Trainer
  async function saveLearningData(result, userMsg) {
    for (const v of result.new_vocab) {
      await addCard({ front: v.en, back: v.de, example: v.example, type: 'phrase', sourceConvId: convIdRef.current })
    }
    const fb = result.feedback
    if (userMsg?.role === 'user' && fb.status === 'error') {
      await recordErrors(fb.error_tags, userMsg.text)
      await addCard({
        front: userMsg.text, // dein Originalsatz
        back: fb.natural || fb.corrected,
        example: fb.explanation,
        type: 'mistake',
        sourceConvId: convIdRef.current,
      })
    } else if (userMsg?.role === 'user' && fb.error_tags.length) {
      await recordErrors(fb.error_tags, userMsg.text)
    }
  }

  function send(text, { viaVoice = false, confidence = null } = {}) {
    const clean = text.trim()
    if (!clean || busy) return
    stopSpeaking()
    const history = [...messages, { role: 'user', text: clean, viaVoice, confidence }]
    setMessages(history)
    setInput('')
    runTurn(history)
  }

  function retry() {
    runTurn(messages)
  }

  // ── Mikrofon ────────────────────────────────────────────────
  const mic = useSpeechRecognition((text, confidence) => {
    if (settings.autoSend) send(text, { viaVoice: true, confidence })
    else setInput(text)
  })

  // ── Gespräch beenden → Auswertung ───────────────────────────
  async function finish() {
    stopSpeaking()
    const userTurns = messages.filter((m) => m.role === 'user').length
    if (userTurns < 2) {
      await db.conversations.delete(convIdRef.current) // zu kurz → nicht speichern
      onExit()
      return
    }
    setSummarizing(true)
    setError('')
    try {
      const result = await summarize({ system: buildSummaryPrompt({ scenario }), history: messages, schema: SUMMARY_SCHEMA })
      result.score = Math.max(0, Math.min(100, result.score))
      for (const p of result.key_phrases) {
        await addCard({ front: p.en, back: p.de, type: 'phrase', sourceConvId: convIdRef.current })
      }
      await db.conversations.update(convIdRef.current, { summary: result, finishedAt: Date.now() })
      setSummary(result)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setSummarizing(false)
    }
  }

  const lastAi = [...messages].reverse().find((m) => m.role === 'ai')
  const lastIsUser = messages[messages.length - 1]?.role === 'user'

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Kopfzeile */}
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button onClick={() => { stopSpeaking(); onExit() }} className="px-2 py-1 text-2xl text-slate-500" aria-label="Zurück">‹</button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-semibold text-slate-800">{scenario.emoji} {scenario.title}</p>
          <p className="text-xs text-slate-400">{difficulty.label}</p>
        </div>
        <button
          onClick={() => setListenMode((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${listenMode ? 'bg-brand-700 text-white ring-brand-700' : 'text-slate-600 ring-slate-300'}`}
          title="Hörmodus: Text der KI ausblenden, um Hörverstehen zu trainieren"
        >
          👂 Hörmodus
        </button>
        {!summary && (
          <button onClick={finish} disabled={busy || summarizing} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-40">
            Beenden
          </button>
        )}
      </header>

      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-3 px-3 py-4">
          <p className="mx-auto max-w-sm rounded-xl bg-brand-50 px-3 py-2 text-center text-xs text-brand-700">🎯 {scenario.goal}</p>

          {messages.map((m, i) =>
            m.role === 'ai' ? (
              <AiBubble key={i} msg={m} listenMode={listenMode} rate={difficulty.ttsRate} voiceName={settings.voiceName} />
            ) : (
              <UserBubble key={i} msg={m} />
            ),
          )}

          {busy && <TypingIndicator />}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
              {lastIsUser && !busy && (
                <button onClick={retry} className="ml-2 font-semibold underline">Nochmal versuchen</button>
              )}
            </div>
          )}

          {goalReached && !summary && !summarizing && (
            <div className="rounded-xl bg-green-50 p-3 text-center text-sm text-green-800 ring-1 ring-green-200">
              🎉 Ziel erreicht! Du kannst weiterreden oder
              <button onClick={finish} className="ml-1 font-semibold underline">die Auswertung ansehen</button>.
            </div>
          )}

          {summarizing && <p className="text-center text-sm text-slate-500">Auswertung wird erstellt …</p>}
          {summary && <SummaryView summary={summary} onExit={onExit} />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Eingabebereich */}
      {!summary && (
        <footer className="border-t border-slate-200 bg-white px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl">
            {showHelp && lastAi?.suggestions?.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {lastAi.suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-xl bg-brand-50 px-3 py-2 text-left text-sm text-brand-900">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {mic.listening && (
              <p className="mb-2 min-h-5 text-center text-sm italic text-slate-500">{mic.interim || 'Ich höre zu … sprich jetzt'}</p>
            )}
            {mic.error && <p className="mb-2 text-center text-xs text-red-600">{mic.error}</p>}

            <form
              onSubmit={(e) => { e.preventDefault(); send(input) }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className={`h-10 w-10 shrink-0 rounded-full text-lg ring-1 ${showHelp ? 'bg-brand-100 ring-brand-600' : 'ring-slate-300'}`}
                title="Antwortvorschläge"
              >
                💡
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Antworte auf Englisch …"
                className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-brand-600"
                autoCapitalize="sentences"
                enterKeyHint="send"
              />
              {input.trim() ? (
                <button type="submit" disabled={busy} className="h-12 w-12 shrink-0 rounded-full bg-brand-700 text-xl text-white disabled:opacity-40" aria-label="Senden">
                  ➤
                </button>
              ) : (
                <button
                  type="button"
                  onClick={mic.listening ? mic.stop : mic.start}
                  disabled={busy || !canListen}
                  className={`h-12 w-12 shrink-0 rounded-full text-xl text-white disabled:opacity-40 ${mic.listening ? 'recording bg-accent' : 'bg-brand-700'}`}
                  aria-label={mic.listening ? 'Aufnahme stoppen' : 'Sprechen'}
                >
                  {mic.listening ? '■' : '🎤'}
                </button>
              )}
            </form>
          </div>
        </footer>
      )}
    </div>
  )
}

// ── Kleine Bausteine ──────────────────────────────────────────

function AiBubble({ msg, listenMode, rate, voiceName }) {
  const [revealed, setRevealed] = useState(false)
  const [showVocab, setShowVocab] = useState(false)
  const hidden = listenMode && !revealed

  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
        {hidden ? (
          <button onClick={() => setRevealed(true)} className="text-left text-slate-400">
            <span className="select-none blur-sm">{msg.text}</span>
            <span className="mt-1 block text-xs">Antippen, um den Text zu zeigen</span>
          </button>
        ) : (
          <p className="text-slate-800">{msg.text}</p>
        )}
        <div className="mt-1.5 flex gap-3 text-sm text-slate-400">
          <button onClick={() => speak(msg.text, { rate, voiceName })} aria-label="Vorlesen">🔊</button>
          <button onClick={() => speak(msg.text, { rate: 0.7, voiceName })} aria-label="Langsam vorlesen">🐢 langsam</button>
          {msg.vocab?.length > 0 && (
            <button onClick={() => setShowVocab((v) => !v)} className="ml-auto text-brand-600">
              + {msg.vocab.length} {msg.vocab.length === 1 ? 'Wort' : 'Wörter'}
            </button>
          )}
        </div>
      </div>
      {showVocab && (
        <ul className="mt-1 max-w-[85%] space-y-1 rounded-xl bg-brand-50 p-2 text-sm">
          {msg.vocab.map((v) => (
            <li key={v.en}>
              <span className="font-semibold text-brand-900">{v.en}</span> – {v.de}
              {v.example && <span className="block text-xs italic text-slate-500">{v.example}</span>}
            </li>
          ))}
          <li className="text-xs text-slate-400">✓ Im Vokabeltrainer gespeichert</li>
        </ul>
      )}
    </div>
  )
}

function UserBubble({ msg }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-700 px-4 py-2.5 text-white">
        {msg.viaVoice && <span className="mr-1 text-xs opacity-70">🎤</span>}
        {msg.text}
      </div>
      {msg.feedback && <FeedbackCard feedback={msg.feedback} />}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 px-2 py-3">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}
