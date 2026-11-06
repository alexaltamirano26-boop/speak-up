// ─────────────────────────────────────────────────────────────
// Sprache: Spracherkennung (Mikrofon → Text) und Sprachausgabe (Text → Stimme)
// Beides über die Web Speech API, die im Browser eingebaut ist.
// Läuft in Safari (iPhone), Chrome und Edge – nicht in Firefox.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react'

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const canListen = Boolean(Recognition)
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// ── Sprachausgabe ───────────────────────────────────────────

// Liefert die verfügbaren US-Stimmen (werden im Browser verzögert geladen).
export function useVoices() {
  const [voices, setVoices] = useState([])
  useEffect(() => {
    if (!canSpeak) return
    const load = () => setVoices(speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('en-US')))
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  return voices
}

// Bevorzugte natürliche Stimmen (iPhone: Samantha/Siri-Stimmen, Chrome: Google US English)
const PREFERRED = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Alex']

function pickVoice(voiceName) {
  const all = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('en-US'))
  if (voiceName) {
    const chosen = all.find((v) => v.name === voiceName)
    if (chosen) return chosen
  }
  for (const name of PREFERRED) {
    const v = all.find((x) => x.name.includes(name))
    if (v) return v
  }
  return all[0] ?? null
}

export function speak(text, { rate = 1, voiceName = '', onEnd } = {}) {
  if (!canSpeak || !text) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  const voice = pickVoice(voiceName)
  if (voice) u.voice = voice
  if (onEnd) u.onend = onEnd
  speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (canSpeak) speechSynthesis.cancel()
}

// iPhone-Eigenheit: Sprachausgabe funktioniert erst, nachdem sie einmal
// direkt durch einen Tipp ausgelöst wurde. Diese Funktion "entsperrt" sie.
export function unlockSpeech() {
  if (!canSpeak) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  speechSynthesis.speak(u)
}

// ── Spracherkennung ─────────────────────────────────────────
// Hook: { listening, interim, start, stop, error }
// onFinal(text, confidence) wird aufgerufen, wenn du fertig gesprochen hast.
export function useSpeechRecognition(onFinal) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const start = useCallback(() => {
    if (!Recognition) {
      setError('Spracherkennung wird von diesem Browser nicht unterstützt. Nutze Safari oder Chrome.')
      return
    }
    stopSpeaking() // sonst hört das Mikrofon die KI-Stimme
    setError('')
    setInterim('')
    const rec = new Recognition()
    rec.lang = 'en-US'
    rec.interimResults = true // Zwischenergebnisse live anzeigen
    rec.continuous = false // stoppt automatisch nach einer Sprechpause
    rec.maxAlternatives = 1

    let finalText = ''
    let confidence = null
    rec.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          finalText += r[0].transcript
          confidence = r[0].confidence || null // iPhone liefert oft 0 → unbekannt
        } else live += r[0].transcript
      }
      setInterim((finalText + ' ' + live).trim())
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
        setError('Mikrofon-Zugriff verweigert. Erlaube ihn in den Browser-Einstellungen.')
      else if (e.error === 'no-speech') setError('Nichts gehört – versuch es nochmal.')
      else if (e.error !== 'aborted') setError(`Spracherkennung: ${e.error}`)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
      const text = finalText.trim()
      if (text) onFinalRef.current?.(text, confidence)
    }
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [])

  const stop = useCallback(() => recRef.current?.stop(), [])

  useEffect(() => () => recRef.current?.abort(), [])

  return { listening, interim, error, start, stop }
}
