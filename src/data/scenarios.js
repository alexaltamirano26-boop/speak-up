// ─────────────────────────────────────────────────────────────
// Szenario-Bibliothek
// Neues Szenario hinzufügen = einfach ein weiteres Objekt in die Liste.
//   role     → wen die KI spielt (auf Englisch, geht in den Prompt)
//   setting  → Ort & Situation (Englisch, geht in den Prompt)
//   aiTasks  → was die KI im Gespräch abfragen/einbauen soll
//   goal     → dein Ziel (Deutsch, wird dir angezeigt)
//   phrases  → Schlüsselsätze, die du vorher ansehen kannst
// ─────────────────────────────────────────────────────────────

export const DIFFICULTIES = [
  { level: 1, label: 'Langsam & einfach', ttsRate: 0.85,
    prompt: 'Speak slowly and clearly. Use short, simple sentences and common words. Be patient and helpful. Avoid slang.' },
  { level: 2, label: 'Normal', ttsRate: 1.0,
    prompt: 'Speak like a normal, friendly American would. Use everyday expressions and a little casual language.' },
  { level: 3, label: 'Echtes Tempo', ttsRate: 1.1,
    prompt: 'Speak at real-life American pace: casual, contractions (gonna, wanna, y\'all), some slang and idioms, occasionally ask a follow-up the learner did not expect. Do not simplify.' },
]

export const SCENARIOS = [
  {
    id: 'immigration',
    emoji: '🛂',
    title: 'Einreise (Immigration)',
    category: 'Flughafen',
    role: 'a U.S. Customs and Border Protection (CBP) officer at the passport control booth at Dallas/Fort Worth International Airport (DFW)',
    setting: 'The traveler just arrived on an international flight and steps up to your booth.',
    aiTasks: [
      'Ask for the passport',
      'Ask the purpose of the trip',
      'Ask how long they will stay and where',
      'Ask about return ticket or what they do for a living / study',
      'Ask if they bring any food or more than $10,000',
      'Finish with fingerprints/photo instructions and "Welcome to the United States"',
    ],
    goal: 'Beantworte die Fragen des Grenzbeamten klar und sicher.',
    phrases: [
      ["I'm here on vacation.", 'Ich bin im Urlaub hier.'],
      ["I'll be staying for two weeks.", 'Ich bleibe zwei Wochen.'],
      ["I'm staying at a hotel in Dallas.", 'Ich übernachte in einem Hotel in Dallas.'],
      ["I'm a student.", 'Ich bin Student.'],
      ['Nothing to declare.', 'Nichts zu verzollen.'],
    ],
  },
  {
    id: 'lost-luggage',
    emoji: '🧳',
    title: 'Gepäck verloren',
    category: 'Notfall',
    role: 'an airline baggage service agent at the baggage claim office',
    setting: 'The traveler\'s suitcase did not arrive on the carousel.',
    aiTasks: [
      'Ask for the baggage claim tag and flight number',
      'Ask the traveler to describe the bag (color, size, brand, special features)',
      'Ask what is inside and where they are staying',
      'Ask for a phone number',
      'Explain next steps: delivery, reference number, essentials allowance',
    ],
    goal: 'Melde deinen verlorenen Koffer und beschreibe ihn genau.',
    phrases: [
      ["My bag didn't come out.", 'Mein Koffer ist nicht gekommen.'],
      ["It's a large black suitcase with a red ribbon.", 'Ein großer schwarzer Koffer mit rotem Band.'],
      ['Can you deliver it to my hotel?', 'Können Sie ihn ins Hotel liefern?'],
      ["What's my reference number?", 'Was ist meine Vorgangsnummer?'],
    ],
  },
  {
    id: 'hotel',
    emoji: '🏨',
    title: 'Hotel Check-in',
    category: 'Unterkunft',
    role: 'a friendly front desk agent at a mid-range hotel in downtown Dallas',
    setting: 'The guest arrives in the evening to check in.',
    aiTasks: [
      'Ask for the name on the reservation and an ID',
      'Ask for a credit card for incidentals and explain the hold',
      'Mention breakfast times, Wi-Fi, parking fee or a "resort fee"',
      'Offer help and react naturally if the guest asks for something (late checkout, quiet room, etc.)',
    ],
    goal: 'Check ein, frag nach Frühstück & WLAN und kläre eine Sonderbitte.',
    phrases: [
      ['I have a reservation under …', 'Ich habe eine Reservierung auf den Namen …'],
      ['What time is checkout?', 'Wann ist Check-out?'],
      ['Is breakfast included?', 'Ist Frühstück inklusive?'],
      ['Could I get a late checkout?', 'Könnte ich später auschecken?'],
    ],
  },
  {
    id: 'restaurant',
    emoji: '🍔',
    title: 'Restaurant & Trinkgeld',
    category: 'Essen',
    role: 'an energetic server at a Texas BBQ and Tex-Mex restaurant',
    setting: 'The guest has just been seated.',
    aiTasks: [
      'Greet, introduce yourself by name and ask for drinks ("Can I get you started with something to drink?")',
      'Take the order, ask typical follow-ups (sides, how the meat is cooked, dressing, "anything else?")',
      'Check in during the meal ("How is everything?")',
      'Bring the check, handle questions about splitting, paying by card and tipping (customary 18–20%)',
      'Use typical phrases like "Are you still working on that?" and "Do you want a box for that?"',
    ],
    goal: 'Bestelle Essen, reagiere auf Rückfragen und bezahle inkl. Trinkgeld.',
    phrases: [
      ["I'll have the brisket, please.", 'Ich nehme das Brisket.'],
      ['Could we get the check, please?', 'Die Rechnung bitte.'],
      ['Can we split the check?', 'Können wir getrennt zahlen?'],
      ['Could I get a box for this?', 'Kann ich den Rest mitnehmen?'],
    ],
  },
  {
    id: 'coffee',
    emoji: '☕',
    title: 'Café & Fast Food',
    category: 'Essen',
    role: 'a fast-talking barista at a busy coffee chain',
    setting: 'The customer steps up to the counter during the morning rush.',
    aiTasks: [
      'Ask what they would like, then size, milk type, hot or iced',
      'Ask "For here or to go?" and the name for the cup',
      'Offer a pastry or upsell',
      'Tell the total and ask about paying (card, tap)',
    ],
    goal: 'Bestelle schnell und verstehe die typischen Rückfragen.',
    phrases: [
      ["Can I get a medium iced latte with oat milk?", 'Einen mittleren Eis-Latte mit Hafermilch, bitte.'],
      ['To go, please.', 'Zum Mitnehmen, bitte.'],
      ["That's it, thanks.", 'Das wär’s, danke.'],
    ],
  },
  {
    id: 'shopping',
    emoji: '🛍️',
    title: 'Einkaufen',
    category: 'Alltag',
    role: 'a helpful sales associate in a clothing store in a Dallas mall',
    setting: 'The customer is looking around.',
    aiTasks: [
      'Ask "Can I help you find anything?"',
      'Help with sizes (US sizes differ) and the fitting room',
      'Mention a sale ("buy one get one 50% off")',
      'At checkout: ask about a rewards card, explain that sales tax is added at the register, ask about a bag and the receipt',
    ],
    goal: 'Frag nach Größen, anprobieren und kläre den Preis an der Kasse.',
    phrases: [
      ["I'm just looking, thanks.", 'Ich schaue nur, danke.'],
      ['Do you have this in a medium?', 'Haben Sie das in M?'],
      ['Where are the fitting rooms?', 'Wo sind die Umkleiden?'],
      ['Why is the price higher than on the tag?', 'Warum ist der Preis höher als auf dem Etikett?'],
    ],
  },
  {
    id: 'directions',
    emoji: '🗺️',
    title: 'Nach dem Weg fragen',
    category: 'Alltag',
    role: 'a local Dallas resident waiting at a crosswalk downtown',
    setting: 'A tourist approaches you on the street.',
    aiTasks: [
      'Give directions to a place the tourist asks for (or suggest Dealey Plaza / Reunion Tower / a DART train station)',
      'Use real direction phrases: "Go down two blocks", "Hang a left", "It\'s kitty-corner from…", "You can\'t miss it"',
      'Mention that walking is far and suggest an Uber or the DART light rail',
      'Ask where they are from and make a friendly comment',
    ],
    goal: 'Frag nach dem Weg und verstehe die Wegbeschreibung.',
    phrases: [
      ['Excuse me, how do I get to …?', 'Entschuldigung, wie komme ich zu …?'],
      ['Is it within walking distance?', 'Kann man da hinlaufen?'],
      ['Could you say that again, please?', 'Könnten Sie das wiederholen?'],
    ],
  },
  {
    id: 'smalltalk',
    emoji: '🤠',
    title: 'Smalltalk mit Texanern',
    category: 'Leute',
    role: 'a talkative, friendly Texan in their 30s sitting next to the traveler at a sports bar while a Dallas Cowboys game is on',
    setting: 'You strike up a conversation with the stranger next to you.',
    aiTasks: [
      'Start small talk ("Where y\'all from?")',
      'Ask about their trip, their home country, what they study',
      'Share something about Texas (food, football, weather, "everything is bigger in Texas")',
      'Recommend something to do in Dallas',
      'Use natural American reactions ("No way!", "That\'s awesome", "For real?")',
    ],
    goal: 'Führe ein lockeres Gespräch: erzähl von dir und stell Gegenfragen.',
    phrases: [
      ["I'm from …, and I'm a student.", 'Ich komme aus … und bin Student.'],
      ['What do you recommend doing around here?', 'Was empfiehlst du hier in der Gegend?'],
      ["That's awesome!", 'Das ist super!'],
      ['How about you?', 'Und du?'],
    ],
  },
  {
    id: 'doctor',
    emoji: '🏥',
    title: 'Beim Arzt (Urgent Care)',
    category: 'Notfall',
    role: 'a receptionist and then a doctor at an urgent care clinic',
    setting: 'The traveler walks in feeling sick.',
    aiTasks: [
      'As receptionist: ask for ID and travel insurance, have them fill out a form',
      'As doctor: ask about symptoms, since when, pain scale 1–10, allergies, medication',
      'Give a simple diagnosis and explain the prescription and the pharmacy (CVS/Walgreens)',
    ],
    goal: 'Beschreibe deine Symptome und verstehe die Anweisungen des Arztes.',
    phrases: [
      ["I've had a sore throat since yesterday.", 'Ich habe seit gestern Halsschmerzen.'],
      ["I'm allergic to penicillin.", 'Ich bin allergisch gegen Penicillin.'],
      ['I have travel insurance.', 'Ich habe eine Reiseversicherung.'],
      ['How often should I take it?', 'Wie oft soll ich es nehmen?'],
    ],
  },
]

export const getScenario = (id) => SCENARIOS.find((s) => s.id === id)
export const getDifficulty = (level) => DIFFICULTIES.find((d) => d.level === level) ?? DIFFICULTIES[1]
