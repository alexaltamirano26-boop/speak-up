// ─────────────────────────────────────────────────────────────
// Feedback zu deinem Satz: Korrektur + Erklärung + "So sagt's ein Amerikaner"
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { speak } from '../lib/speech'
import { loadSettings } from '../lib/settings'

const STYLES = {
  perfect: { icon: '✅', label: 'Perfekt', box: 'bg-green-50 ring-green-200', title: 'text-green-800' },
  minor: { icon: '💡', label: 'Geht noch natürlicher', box: 'bg-amber-50 ring-amber-200', title: 'text-amber-800' },
  error: { icon: '✏️', label: 'Korrektur', box: 'bg-red-50 ring-red-200', title: 'text-red-800' },
}

export default function FeedbackCard({ feedback }) {
  const style = STYLES[feedback.status]
  // Fehler sind direkt aufgeklappt, "Perfekt" nur als kleine Zeile
  const [open, setOpen] = useState(feedback.status === 'error')
  if (!style) return null
  const { voiceName } = loadSettings()

  return (
    <div className={`mt-1 w-[85%] rounded-xl p-3 text-sm ring-1 ${style.box}`}>
      <button onClick={() => setOpen((v) => !v)} className={`flex w-full items-center gap-1.5 font-semibold ${style.title}`}>
        <span>{style.icon}</span>
        <span>{style.label}</span>
        <span className="ml-auto text-xs font-normal opacity-60">{open ? 'weniger' : 'mehr'}</span>
      </button>

      {feedback.status !== 'perfect' && feedback.corrected && feedback.corrected !== feedback.natural && open && (
        <p className="mt-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Korrekt:</span><br />
          {feedback.corrected}
        </p>
      )}

      {feedback.natural && (
        <div className="mt-2">
          <span className="text-xs font-semibold uppercase text-slate-500">🇺🇸 So sagt&apos;s ein Amerikaner:</span>
          <button onClick={() => speak(feedback.natural, { rate: 0.9, voiceName })} className="block text-left font-medium text-slate-900">
            „{feedback.natural}“ <span className="text-slate-400">🔊</span>
          </button>
        </div>
      )}

      {open && feedback.explanation && <p className="mt-2 text-slate-700">{feedback.explanation}</p>}

      {feedback.pronunciation_tip && (
        <p className="mt-2 rounded-lg bg-white/70 p-2 text-slate-700">
          <span className="font-semibold">🗣️ Aussprache:</span> {feedback.pronunciation_tip}
        </p>
      )}
    </div>
  )
}
