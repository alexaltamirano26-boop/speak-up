// ─────────────────────────────────────────────────────────────
// Wörter: alles, was aus deinen Gesprächen gesammelt wurde.
// (Der Spaced-Repetition-Trainer kommt im nächsten Bauschritt hierher.)
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { speak } from '../lib/speech'
import { ERROR_TAGS } from '../lib/prompts'

export default function WordsScreen({ settings }) {
  const [filter, setFilter] = useState('phrase')
  const cards = useLiveQuery(() => db.cards.orderBy('createdAt').reverse().toArray(), [], [])
  const errors = useLiveQuery(() => db.errors.orderBy('count').reverse().limit(5).toArray(), [], [])
  const shown = cards.filter((c) => c.type === filter || (filter === 'phrase' && c.type === 'word'))

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900">Meine Wörter</h1>
      <p className="mt-1 text-sm text-slate-500">
        {cards.length} Einträge, automatisch aus deinen Gesprächen gesammelt. Der Wiederholungs-Trainer kommt als Nächstes.
      </p>

      {errors.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-800">Deine häufigsten Fehler</p>
          <ul className="mt-2 space-y-1 text-sm">
            {errors.map((e) => (
              <li key={e.tag} className="flex justify-between">
                <span>{ERROR_TAGS[e.tag] ?? e.tag}</span>
                <span className="font-semibold text-slate-500">{e.count}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {[['phrase', 'Wörter & Sätze'], ['mistake', 'Meine Fehler']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${filter === id ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-600 ring-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-400">Noch leer – führe ein Gespräch, dann füllt sich die Liste.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((c) => (
            <li key={c.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              {c.type === 'mistake' ? (
                <>
                  <p className="text-sm text-red-700 line-through decoration-red-300">{c.front}</p>
                  <button onClick={() => speak(c.back, { voiceName: settings.voiceName, rate: 0.9 })} className="text-left font-medium text-slate-900">🔊 {c.back}</button>
                  {c.example && <p className="mt-1 text-xs text-slate-500">{c.example}</p>}
                </>
              ) : (
                <>
                  <button onClick={() => speak(c.front, { voiceName: settings.voiceName, rate: 0.9 })} className="text-left font-medium text-slate-900">🔊 {c.front}</button>
                  <p className="text-sm text-slate-500">{c.back}</p>
                  {c.example && <p className="mt-1 text-xs italic text-slate-400">{c.example}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
