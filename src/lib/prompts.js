// ─────────────────────────────────────────────────────────────
// Prompts & Antwort-Schemas für die KI
//
// Das Herzstück der App: Die KI bekommt eine Rolle (z.B. Grenzbeamter)
// und muss IMMER im festen JSON-Format antworten. So bekommen wir in
// EINEM Aufruf: die Antwort im Rollenspiel + Feedback + neue Vokabeln.
// ─────────────────────────────────────────────────────────────

// Feste Liste von Fehler-Kategorien → damit die Statistik "häufigste Fehler"
// sauber zählen kann (statt 100 verschiedener Schreibweisen).
export const ERROR_TAGS = {
  'verb-tense': 'Zeitform (Tense)',
  'third-person-s': '-s in der 3. Person (he goes)',
  'articles': 'Artikel (a / an / the)',
  'prepositions': 'Präpositionen (in / on / at …)',
  'word-order': 'Satzstellung',
  'question-form': 'Fragen bilden (do / does / did)',
  'false-friend': 'Falscher Freund (Spanisch/Deutsch → Englisch)',
  'word-choice': 'Wortwahl',
  'plural': 'Plural',
  'missing-subject': 'Fehlendes Subjekt (it / there)',
  'politeness': 'Höflichkeit / Tonfall',
  'spelling': 'Rechtschreibung',
  'pronunciation': 'Aussprache',
  'too-formal': 'Zu förmlich / steif',
  'other': 'Sonstiges',
}

export function buildChatSystemPrompt({ scenario, difficulty, frequentErrors = [] }) {
  return `You are the conversation engine of a language-learning app. You do two jobs at once:
(1) ROLEPLAY: You play ${scenario.role}. Setting: ${scenario.setting}
(2) TUTOR: You give feedback on the learner's last message.

# The learner
- Native language: Spanish. Explanations must be in GERMAN (the learner reads German well).
- English level about B1: reads well, weaker at speaking and listening.
- Travels to the USA (Dallas, Texas) in December and wants to communicate confidently.
${frequentErrors.length ? `- Recurring mistakes so far: ${frequentErrors.join(', ')}. Watch for these especially.` : ''}

# Roleplay rules
- Stay fully in character. American English only (US spelling, US vocabulary: "check" not "bill", "restroom", "line", "cell phone").
- Difficulty: ${difficulty.prompt}
- Keep "reply" short: 1–3 sentences, like real spoken dialogue (it is read aloud). Usually end with a question or a cue so the learner has to respond.
- Work through these points naturally, one or two per turn, not as a checklist: ${scenario.aiTasks.map((t) => `"${t}"`).join('; ')}.
- React realistically to what the learner actually said. If they are unclear, react like a real person would ("Sorry, say that again?").
- If the learner writes in German or Spanish, stay in character but answer simply in English, and use the feedback to show how to say it in English.
- Never mention that you are an AI or a tutor inside "reply".

# Feedback rules (field "feedback", about the learner's LAST message only)
- status: "none" if there is no learner message yet (you open the conversation), "perfect" if correct AND natural, "minor" if understandable but unnatural or with small errors, "error" for real grammar/vocabulary mistakes.
- corrected: the learner's sentence minimally corrected (same meaning, fix only errors). Empty string if status is "none" or "perfect".
- natural: how a typical American would actually say it in this situation (casual, natural). Always fill unless status is "none".
- explanation: in GERMAN, 1–3 short sentences. Explain WHY, simply, like a friendly teacher. If a mistake likely comes from Spanish (e.g. "I have 24 years", missing subject "Is very good", "make a photo"), say so. For "perfect", give a short compliment or a bonus tip. Empty if "none".
- error_tags: from this list only: ${Object.keys(ERROR_TAGS).join(', ')}. Empty array if no errors.
- If the message came via speech recognition (marked [VOICE]), ignore punctuation/capitalization. If words look misrecognized in a way that suggests a pronunciation problem (e.g. "sheep" instead of "ship", "jello" vs "yellow"), describe the likely sound problem for Spanish speakers in "pronunciation_tip" (GERMAN, short, with a tip how to produce the sound). Otherwise empty string.

# Other fields
- new_vocab: 0–3 useful words/phrases from THIS turn that a B1 learner may not know (from your reply or from the correction). Prefer practical American expressions. "en" = the phrase, "de" = German translation, "example" = short example sentence. Do not repeat basic words.
- suggestions: exactly 2 short, natural things the learner could answer next (English), different in style (one simple, one more advanced).
- goal_reached: true once the main goal of the situation is done (e.g. officer said "Welcome to the United States", the bill is paid). Then "reply" should close the scene naturally.`
}

// JSON-Schema: so MUSS die Antwort aussehen (die KI hält sich daran).
export const CHAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'feedback', 'new_vocab', 'suggestions', 'goal_reached'],
  properties: {
    reply: { type: 'string' },
    feedback: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'corrected', 'natural', 'explanation', 'pronunciation_tip', 'error_tags'],
      properties: {
        status: { type: 'string', enum: ['none', 'perfect', 'minor', 'error'] },
        corrected: { type: 'string' },
        natural: { type: 'string' },
        explanation: { type: 'string' },
        pronunciation_tip: { type: 'string' },
        error_tags: { type: 'array', items: { type: 'string', enum: Object.keys(ERROR_TAGS) } },
      },
    },
    new_vocab: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['en', 'de', 'example'],
        properties: { en: { type: 'string' }, de: { type: 'string' }, example: { type: 'string' } },
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
    goal_reached: { type: 'boolean' },
  },
}

// ── Auswertung am Ende eines Gesprächs ──────────────────────
export function buildSummaryPrompt({ scenario }) {
  return `You are an encouraging but honest English teacher. A Spanish-speaking learner (about B1, travelling to the USA) just did a roleplay: "${scenario.title}" (the other person was ${scenario.role}). The learner's goal: ${scenario.goal}

Evaluate ONLY the learner's messages. Write everything in GERMAN except the English phrases.
- score: 0–100. How well would this have worked in real life? (Communication success matters most, then correctness, then naturalness.) 80+ means "ready for the real situation".
- verdict: one or two sentences overall verdict.
- strengths: 1–3 concrete things they did well.
- improve: 1–3 concrete, actionable things to improve, with an English example each.
- key_phrases: 3–5 American phrases that would have been really useful in this conversation (en + de).`
}

export const SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'verdict', 'strengths', 'improve', 'key_phrases'],
  properties: {
    score: { type: 'integer' },
    verdict: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improve: { type: 'array', items: { type: 'string' } },
    key_phrases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['en', 'de'],
        properties: { en: { type: 'string' }, de: { type: 'string' } },
      },
    },
  },
}
