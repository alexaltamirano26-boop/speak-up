// ─────────────────────────────────────────────────────────────
// Auswertung am Ende eines Gesprächs
// ─────────────────────────────────────────────────────────────
import { speak } from '../lib/speech'
import { loadSettings } from '../lib/settings'

export default function SummaryView({ summary, onExit }) {
  const { voiceName } = loadSettings()
  const ready = summary.score >= 80
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-4">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${ready ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {summary.score}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{ready ? 'Bereit für die echte Situation!' : 'Guter Fortschritt – weiter üben!'}</p>
          <p className="mt-1 text-sm text-slate-600">{summary.verdict}</p>
        </div>
      </div>

      <Section title="👍 Das lief gut" items={summary.strengths} />
      <Section title="🎯 Daran arbeiten" items={summary.improve} />

      <h3 className="mt-4 text-sm font-semibold text-slate-800">⭐ Nützliche Sätze (im Trainer gespeichert)</h3>
      <ul className="mt-1 space-y-1">
        {summary.key_phrases.map((p) => (
          <li key={p.en}>
            <button onClick={() => speak(p.en, { voiceName, rate: 0.9 })} className="text-left text-sm">
              <span className="font-medium text-brand-900">🔊 {p.en}</span> <span className="text-slate-500">– {p.de}</span>
            </button>
          </li>
        ))}
      </ul>

      <button onClick={onExit} className="mt-5 w-full rounded-xl bg-brand-700 py-3 font-semibold text-white">
        Fertig
      </button>
    </div>
  )
}

function Section({ title, items }) {
  if (!items?.length) return null
  return (
    <>
      <h3 className="mt-4 text-sm font-semibold text-slate-800">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </>
  )
}
