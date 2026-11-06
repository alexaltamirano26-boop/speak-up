// ─────────────────────────────────────────────────────────────
// Einstellungen (Gemini-Key, Modell, Sprache) – gespeichert im localStorage.
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'

const KEY = 'speakup-settings'

const DEFAULTS = {
  apiKey: '', // Gemini-Key von aistudio.google.com
  model: 'gemini-2.5-flash',
  availableModels: [], // wird beim Speichern des Keys von Google abgefragt
  autoSpeak: true, // KI-Antworten automatisch vorlesen
  autoSend: true, // Spracheingabe nach dem Sprechen direkt absenden
  voiceName: '', // leer = beste US-Stimme automatisch wählen
}

export function loadSettings() {
  try {
    const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    // Alte Claude-Einstellungen aus der ersten Version verwerfen
    if (s.apiKey.startsWith('sk-ant') || s.model.startsWith('claude')) {
      s.apiKey = ''
      s.model = DEFAULTS.model
    }
    return s
  } catch {
    return { ...DEFAULTS }
  }
}

// React-Hook: liefert die Einstellungen + eine Funktion zum Ändern.
export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)
  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* privater Modus o.ä. – dann eben nur für diese Sitzung */
      }
      return next
    })
  }, [])
  return [settings, update]
}
