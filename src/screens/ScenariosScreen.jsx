// ─────────────────────────────────────────────────────────────
// Szenario-Bibliothek: Liste aller Situationen + Detailansicht zum Starten
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { SCENARIOS, DIFFICULTIES } from '../data/scenarios'
import { speak, unlockSpeech } from '../lib/speech'
import { loadSettings } from '../lib/settings'

export default function ScenariosScreen({ hasKey, onStart, onGoSettings }) {
  const [selected, setSelected] = useState(null)

  // Bestes Ergebnis pro Szenario aus der Datenbank (aktualisiert sich automatisch).
  const best = useLiveQuery(async () => {
    const convs = await db.conversations.toArray()
    const map = {}
    for (const c of convs) {
      if (c.summary) map[c.scenarioId] = Math.max(map[c.scenarioId] ?? 0, c.summary.score)
    }
    return map
  }, [], {})

  if (selected) {
    return <ScenarioDetail scenario={selected} best={best[selected.id]} onBack={() => setSelected(null)} onStart={onStart} hasKey={hasKey} onGoSettings={onGoSettings} />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">Gespräche üben</h1>
      <p className="mt-1 text-sm text-slate-500">Wähle eine Situation, die du in den USA erleben wirst.</p>

      {!hasKey && (
        <button onClick={onGoSettings} className="mt-4 w-full rounded-xl bg-amber-50 p-3 text-left text-sm text-amber-800 ring-1 ring-amber-200">
          ⚠️ Zuerst brauchst du einen Claude-API-Key → <span className="underline">Einstellungen</span>
        </button>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:scale-[0.98] transition"
          >
            <span className="text-3xl">{s.emoji}</span>
            <span className="flex-1">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">{s.category}</span>
              <span className="block font-semibold text-slate-800">{s.title}</span>
            </span>
            <ScoreBadge score={best[s.id]} />
          </button>
        ))}
      </div>
    </div>
  )
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const mastered = score >= 80
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${mastered ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
      {mastered ? '✓ ' : ''}{score}
    </span>
  )
}

function ScenarioDetail({ scenario, best, onBack, onStart, hasKey, onGoSettings }) {
  const [difficulty, setDifficulty] = useState(2)
  const { voiceName } = loadSettings()

  return (
    <div>
      <button onClick={onBack} className="text-sm font-medium text-brand-600">← Alle Szenarien</button>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-5xl">{scenario.emoji}</span>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{scenario.title}</h1>
          {best != null && <p className="text-sm text-slate-500">Bestes Ergebnis: {best}/100</p>}
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-brand-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Dein Ziel</p>
        <p className="mt-1 text-slate-800">{scenario.goal}</p>
      </div>

      <h2 className="mt-6 font-semibold text-slate-800">Nützliche Sätze <span className="font-normal text-slate-400">(antippen zum Anhören)</span></h2>
      <ul className="mt-2 space-y-2">
        {scenario.phrases.map(([en, de]) => (
          <li key={en}>
            <button onClick={() => speak(en, { voiceName, rate: 0.9 })} className="w-full rounded-xl bg-white p-3 text-left ring-1 ring-slate-200">
              <span className="block font-medium text-slate-800">🔊 {en}</span>
              <span className="block text-sm text-slate-500">{de}</span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-semibold text-slate-800">Schwierigkeit</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.level}
            onClick={() => setDifficulty(d.level)}
            className={`rounded-xl px-2 py-3 text-sm font-medium ring-1 ${
              difficulty === d.level ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {hasKey ? (
        <button
          onClick={() => { unlockSpeech(); onStart(scenario.id, difficulty) }}
          className="mt-6 w-full rounded-2xl bg-brand-700 py-4 text-lg font-semibold text-white shadow active:bg-brand-900"
        >
          Gespräch starten
        </button>
      ) : (
        <button onClick={onGoSettings} className="mt-6 w-full rounded-2xl bg-slate-200 py-4 font-semibold text-slate-600">
          Erst API-Key eintragen →
        </button>
      )}
    </div>
  )
}
