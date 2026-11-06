// ─────────────────────────────────────────────────────────────
// Einstellungen (API-Key, Modell, Sprache) – gespeichert im localStorage.
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'

const KEY = 'speakup-settings'

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 – beste Qualität (ca. 1,5 Cent pro Nachricht)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 – schnell & gut (ca. 0,8 Cent)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 – sehr günstig (unter 0,1 Cent)' },
]

const DEFAULTS = {
  apiKey: '',
  model: 'claude-opus-5-5',
  autoSpeak: true, // KI-Antworten automatisch vorlesen
  autoSend: true, // Spracheingabe nach dem Sprechen direkt absenden
  voiceName: '', // leer = beste US-Stimme automatisch wählen
}

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
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
