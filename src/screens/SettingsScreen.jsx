// ─────────────────────────────────────────────────────────────
// Einstellungen: API-Key, Modell, Stimme, Spracheingabe
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { listModels, pickDefaultModel } from '../lib/ai'
import { useVoices, speak, canListen, canSpeak, unlockSpeech } from '../lib/speech'
import { db } from '../lib/db'

export default function SettingsScreen({ settings, update }) {
  const voices = useVoices()
  const [keyDraft, setKeyDraft] = useState(settings.apiKey)
  const [status, setStatus] = useState({ state: 'idle', msg: '' }) // idle | checking | ok | error

  // Key speichern UND direkt bei Google prüfen. Dabei erfahren wir auch,
  // welche Modelle dein Key benutzen darf.
  async function saveKey() {
    const key = keyDraft.trim()
    if (!key) return
    setStatus({ state: 'checking', msg: '' })
    try {
      const models = await listModels(key)
      const model = models.includes(settings.model) ? settings.model : pickDefaultModel(models)
      update({ apiKey: key, availableModels: models, model })
      setStatus({ state: 'ok', msg: `✓ Key funktioniert – Modell: ${model}` })
    } catch (err) {
      setStatus({ state: 'error', msg: err.message })
    }
  }

  async function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      conversations: await db.conversations.toArray(),
      cards: await db.cards.toArray(),
      errors: await db.errors.toArray(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `speakup-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">Einstellungen</h1>

      <Card title="Gemini API-Key (kostenlos)">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Öffne <a className="text-brand-600 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> und melde dich mit deinem Google-Konto an.</li>
          <li>Tippe auf <b>„API-Schlüssel erstellen“</b> (bzw. „Create API key“).</li>
          <li>Kopiere den Schlüssel (beginnt mit <code>AIza…</code>) und füge ihn hier ein.</li>
        </ol>
        <input
          type="password"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          placeholder="AIza…"
          className="mt-3 w-full rounded-xl bg-slate-100 px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-brand-600"
          autoComplete="off"
        />
        <button onClick={saveKey} disabled={status.state === 'checking'} className="mt-2 w-full rounded-xl bg-brand-700 py-2.5 font-semibold text-white disabled:opacity-60">
          {status.state === 'checking' ? 'Prüfe …' : 'Speichern & prüfen'}
        </button>
        {status.msg && (
          <p className={`mt-2 text-sm ${status.state === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{status.msg}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Der Key wird nur auf diesem Gerät gespeichert. Kostenlos, solange du kein Abrechnungskonto hinterlegst.
          Im Gratis-Modus kann Google die Texte zur Verbesserung nutzen – schreib also nichts Privates.
        </p>
      </Card>

      {settings.availableModels?.length > 0 && (
        <Card title="KI-Modell">
          <select
            value={settings.model}
            onChange={(e) => update({ model: e.target.value })}
            className="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm"
          >
            {settings.availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-400">
            „flash“ = bessere Qualität, „flash-lite“ = höheres Gratis-Limit. Ist das Tageslimit erreicht,
            wechselt die App automatisch auf ein anderes Modell.
          </p>
        </Card>
      )}

      <Card title="Stimme (Sprachausgabe)">
        {!canSpeak ? (
          <p className="text-sm text-red-600">Dieser Browser unterstützt keine Sprachausgabe.</p>
        ) : (
          <>
            <select
              value={settings.voiceName}
              onChange={(e) => update({ voiceName: e.target.value })}
              className="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm"
            >
              <option value="">Automatisch (beste US-Stimme)</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
            <button
              onClick={() => { unlockSpeech(); speak("Hi there! Welcome to Texas. How's it going?", { voiceName: settings.voiceName }) }}
              className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-brand-700 ring-1 ring-brand-600"
            >
              🔊 Stimme testen
            </button>
            <p className="mt-2 text-xs text-slate-400">
              iPhone-Tipp: Bessere Stimmen unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch (USA) laden (z.B. „Ava (Premium)“).
            </p>
            <Toggle label="KI-Antworten automatisch vorlesen" checked={settings.autoSpeak} onChange={(v) => update({ autoSpeak: v })} />
          </>
        )}
      </Card>

      <Card title="Spracheingabe (Mikrofon)">
        {canListen ? (
          <Toggle label="Nach dem Sprechen automatisch senden" checked={settings.autoSend} onChange={(v) => update({ autoSend: v })} />
        ) : (
          <p className="text-sm text-red-600">Dieser Browser unterstützt keine Spracherkennung. Nutze Safari (iPhone) oder Chrome.</p>
        )}
      </Card>

      <Card title="Daten">
        <p className="text-sm text-slate-500">Alle Daten liegen nur auf diesem Gerät. Mach ab und zu ein Backup.</p>
        <button onClick={exportData} className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300">
          ⬇️ Backup herunterladen
        </button>
      </Card>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-2 font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-700">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-brand-700" />
    </label>
  )
}
