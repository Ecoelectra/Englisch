// Topic pool. Every day a different selection is drawn from it (see dailyTopics).
// title: shown on the card and given to the AI, de: short German teaser.
export const TOPICS = [
  { emoji: "✈️", title: "Dream vacation", de: "Wohin würdest du reisen, wenn Geld keine Rolle spielt?" },
  { emoji: "🍕", title: "Favourite food", de: "Lieblingsgerichte, Kochen und Essen gehen" },
  { emoji: "🎬", title: "Movies & series", de: "Was du zuletzt gesehen hast und warum es dir gefiel" },
  { emoji: "🏃", title: "Sports & fitness", de: "Wie du dich fit hältst – oder es gerne würdest" },
  { emoji: "💼", title: "Your job", de: "Dein Arbeitsalltag, Aufgaben und Kollegen" },
  { emoji: "🎤", title: "Job interview", de: "Übe ein Bewerbungsgespräch auf Englisch" },
  { emoji: "🏡", title: "Your home town", de: "Erzähl von dem Ort, an dem du lebst" },
  { emoji: "📱", title: "Technology in daily life", de: "Smartphones, Apps und digitale Gewohnheiten" },
  { emoji: "🤖", title: "Artificial intelligence", de: "Chancen und Risiken von KI" },
  { emoji: "🌍", title: "Climate change", de: "Was können wir für die Umwelt tun?" },
  { emoji: "🐶", title: "Pets & animals", de: "Haustiere, Lieblingstiere und Tierschutz" },
  { emoji: "🎵", title: "Music", de: "Deine Lieblingsmusik, Konzerte und Instrumente" },
  { emoji: "📚", title: "Books & reading", de: "Ein Buch, das dich beeindruckt hat" },
  { emoji: "🛒", title: "Shopping", de: "Online oder im Laden? Deine Einkaufsgewohnheiten" },
  { emoji: "☕", title: "Ordering at a café", de: "Rollenspiel: Bestellen im Café" },
  { emoji: "🏨", title: "Checking into a hotel", de: "Rollenspiel: Hotel-Check-in und Beschwerden" },
  { emoji: "🧳", title: "At the airport", de: "Rollenspiel: Flughafen, Gepäck und Verspätungen" },
  { emoji: "🩺", title: "At the doctor's", de: "Rollenspiel: Symptome beschreiben" },
  { emoji: "🗺️", title: "Asking for directions", de: "Rollenspiel: Den Weg finden in einer fremden Stadt" },
  { emoji: "🎉", title: "Celebrations & holidays", de: "Feste, Traditionen und Feiertage" },
  { emoji: "👨‍👩‍👧", title: "Family & friends", de: "Die Menschen, die dir wichtig sind" },
  { emoji: "🧠", title: "Learning new skills", de: "Was du gerade lernst oder lernen möchtest" },
  { emoji: "🏫", title: "School memories", de: "Deine Schulzeit – gute und schlechte Erinnerungen" },
  { emoji: "🌱", title: "Healthy lifestyle", de: "Ernährung, Schlaf und Wohlbefinden" },
  { emoji: "🚗", title: "Transport & commuting", de: "Auto, Bahn, Fahrrad – wie kommst du voran?" },
  { emoji: "🏙️", title: "City vs. countryside", de: "Wo lebt es sich besser?" },
  { emoji: "💰", title: "Money & saving", de: "Sparen, Ausgeben und finanzielle Ziele" },
  { emoji: "🎮", title: "Games & hobbies", de: "Was du in deiner Freizeit machst" },
  { emoji: "📸", title: "Photography & social media", de: "Instagram, Fotos und das Teilen von Momenten" },
  { emoji: "🧑‍🍳", title: "A recipe you love", de: "Erkläre Schritt für Schritt ein Rezept" },
  { emoji: "🌦️", title: "Weather & seasons", de: "Deine Lieblingsjahreszeit und warum" },
  { emoji: "🚀", title: "Space exploration", de: "Mars, Mond und die Zukunft der Raumfahrt" },
  { emoji: "🏛️", title: "History", de: "Eine Epoche oder Person, die dich fasziniert" },
  { emoji: "🎨", title: "Art & creativity", de: "Kunst, Design und kreative Projekte" },
  { emoji: "⚽", title: "Football", de: "Lieblingsverein, große Turniere und Fans" },
  { emoji: "🧘", title: "Stress & relaxation", de: "Wie du nach einem langen Tag abschaltest" },
  { emoji: "🔮", title: "The world in 2050", de: "Wie sieht unsere Zukunft aus?" },
  { emoji: "🏠", title: "Your dream home", de: "Beschreibe dein perfektes Zuhause" },
  { emoji: "👗", title: "Fashion & style", de: "Kleidung, Trends und dein Stil" },
  { emoji: "🍷", title: "Eating out", de: "Rollenspiel: Im Restaurant bestellen und reklamieren" },
  { emoji: "📞", title: "Phone call with customer service", de: "Rollenspiel: Ein Problem am Telefon lösen" },
  { emoji: "🧑‍💻", title: "Working from home", de: "Homeoffice – Vor- und Nachteile" },
  { emoji: "🌐", title: "Languages & cultures", de: "Warum du Englisch lernst und andere Kulturen" },
  { emoji: "🎁", title: "Gifts", de: "Das beste Geschenk, das du je bekommen hast" },
  { emoji: "🏔️", title: "Outdoor adventures", de: "Wandern, Camping und Natur" },
  { emoji: "🧩", title: "Solving a problem", de: "Erzähl von einer Herausforderung, die du gemeistert hast" },
  { emoji: "📰", title: "News & current events", de: "Ein aktuelles Thema, das dich beschäftigt" },
  { emoji: "🎓", title: "Education system", de: "Wie sollte gute Bildung aussehen?" },
  { emoji: "🚲", title: "A day in your life", de: "Beschreibe einen typischen Tag" },
  { emoji: "😂", title: "Funny stories", de: "Das Lustigste, was dir passiert ist" },
  { emoji: "🦸", title: "Role models", de: "Wer inspiriert dich und warum?" },
  { emoji: "🏆", title: "Goals & dreams", de: "Was möchtest du in den nächsten Jahren erreichen?" },
  { emoji: "🍀", title: "Luck & superstitions", de: "Glaubst du an Glück oder Aberglauben?" },
  { emoji: "🛠️", title: "DIY & home improvement", de: "Heimwerken, Reparieren und Selbermachen" },
  { emoji: "🌮", title: "Food from around the world", de: "Welche Landesküche magst du am liebsten?" },
  { emoji: "🎢", title: "A memorable trip", de: "Eine Reise, die du nie vergessen wirst" },
  { emoji: "🏥", title: "Health care", de: "Gesundheitssysteme und Arztbesuche" },
  { emoji: "📺", title: "TV then and now", de: "Wie sich Fernsehen und Streaming verändert haben" },
  { emoji: "🧸", title: "Childhood", de: "Deine Kindheit und Lieblingsspielzeuge" },
  { emoji: "🌊", title: "Beach or mountains?", de: "Wo verbringst du lieber deinen Urlaub?" },
  { emoji: "🕹️", title: "Video games", de: "Spiele, die du liebst oder gar nicht verstehst" },
  { emoji: "🚆", title: "Travelling by train", de: "Zugreisen, Pünktlichkeit und Abenteuer" },
  { emoji: "🧾", title: "Negotiating a deal", de: "Rollenspiel: Preise und Bedingungen verhandeln" },
  { emoji: "🤝", title: "Meeting new people", de: "Small Talk und neue Kontakte knüpfen" },
  { emoji: "🏋️", title: "Motivation", de: "Was dich antreibt – und was dich bremst" },
  { emoji: "🎭", title: "Theatre & live events", de: "Konzerte, Theater, Festivals" },
  { emoji: "🌙", title: "Sleep & dreams", de: "Schlafgewohnheiten und seltsame Träume" },
  { emoji: "🍫", title: "Guilty pleasures", de: "Kleine Laster, die du dir gönnst" },
  { emoji: "🗳️", title: "Making decisions", de: "Wie triffst du wichtige Entscheidungen?" },
  { emoji: "💡", title: "Inventions", de: "Die wichtigste Erfindung aller Zeiten" },
  { emoji: "🧳", title: "Moving abroad", de: "Könntest du dir vorstellen, im Ausland zu leben?" },
  { emoji: "🐝", title: "Nature & environment", de: "Tiere, Pflanzen und Naturschutz" },
  { emoji: "🧑‍🤝‍🧑", title: "Teamwork", de: "Zusammenarbeit im Job oder im Verein" },
  { emoji: "📅", title: "Weekend plans", de: "Was hast du am Wochenende vor?" },
  { emoji: "🏪", title: "Complaining politely", de: "Rollenspiel: Eine Reklamation im Geschäft" },
  { emoji: "🎯", title: "Productivity", de: "Wie organisierst du deinen Alltag?" },
  { emoji: "🌋", title: "Natural wonders", de: "Orte der Welt, die du sehen möchtest" },
  { emoji: "🍔", title: "Fast food vs. home cooking", de: "Bequem oder gesund?" },
  { emoji: "🧪", title: "Science that amazes you", de: "Eine wissenschaftliche Entdeckung, die dich fasziniert" },
  { emoji: "🚙", title: "Road trip", de: "Plane mit der KI einen Roadtrip" },
  { emoji: "🛍️", title: "Buying a new phone", de: "Rollenspiel: Beratung im Elektronikladen" },
  { emoji: "🏘️", title: "Neighbours", de: "Gute und nervige Nachbarn" },
  { emoji: "📖", title: "Tell a story", de: "Erfinde gemeinsam mit der KI eine Geschichte" },
  { emoji: "🧭", title: "Would you rather…?", de: "Lustige Entweder-oder-Fragen" },
  { emoji: "🎤", title: "Giving a short presentation", de: "Stell ein Thema deiner Wahl kurz vor" },
  { emoji: "🌐", title: "Social media pros & cons", de: "Macht uns Social Media glücklicher?" },
  { emoji: "🍂", title: "Traditions in Germany", de: "Erkläre einem Ausländer deutsche Traditionen" },
  { emoji: "🧑‍🏫", title: "Your best teacher", de: "Wer hat dich am meisten geprägt?" },
  { emoji: "🛋️", title: "Perfect Sunday", de: "Wie sieht dein perfekter Sonntag aus?" },
  { emoji: "🧊", title: "Unpopular opinions", de: "Verteidige eine ungewöhnliche Meinung" },
];

// Mulberry32: tiny deterministic PRNG so every device shows the same topics on the same day.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailyTopics(count = 6, date = new Date()) {
  const seed = Number(todayKey(date).replaceAll("-", ""));
  const rand = mulberry32(seed);
  const pool = TOPICS.map((t, i) => ({ ...t, id: i }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function msUntilMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}
