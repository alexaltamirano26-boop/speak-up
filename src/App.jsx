// ─────────────────────────────────────────────────────────────
// App-Gerüst: entscheidet, welcher Screen gerade angezeigt wird.
// Statt eines Routers merken wir uns den Screen einfach im State –
// das ist simpel und funktioniert problemlos auf GitHub Pages.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import ScenariosScreen from './screens/ScenariosScreen'
import ChatScreen from './screens/ChatScreen'
import WordsScreen from './screens/WordsScreen'
import SettingsScreen from './screens/SettingsScreen'
import { useSettings } from './lib/settings'

const TABS = [
  { id: 'scenarios', label: 'Gespräche', icon: '💬' },
  { id: 'words', label: 'Wörter', icon: '📚' },
  { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
]

export default function App() {
  const [settings, updateSettings] = useSettings()
  const [tab, setTab] = useState(settings.apiKey ? 'scenarios' : 'settings')
  const [chat, setChat] = useState(null) // { scenarioId, difficulty } während eines Gesprächs

  // Ein laufendes Gespräch bekommt den ganzen Bildschirm (ohne Tab-Leiste).
  if (chat) {
    return <ChatScreen {...chat} settings={settings} onExit={() => setChat(null)} />
  }

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
          {tab === 'scenarios' && (
            <ScenariosScreen
              hasKey={Boolean(settings.apiKey)}
              onGoSettings={() => setTab('settings')}
              onStart={(scenarioId, difficulty) => setChat({ scenarioId, difficulty })}
            />
          )}
          {tab === 'words' && <WordsScreen settings={settings} />}
          {tab === 'settings' && <SettingsScreen settings={settings} update={updateSettings} />}
        </div>
      </main>

      <nav className="border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                tab === t.id ? 'text-brand-700' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
