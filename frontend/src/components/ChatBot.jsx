import { useState, useRef, useEffect } from 'react';
import { getDoctors, getAppointments } from '../api';

// ── Offline Knowledge Base ────────────────────────────────────────────────────
const KB = [
  { patterns: [/^hi$|^hello$|^hey$|^hii+$|^hai$/i], responses: [
    "Hello! 👋 I'm MedBot, your health assistant. How can I help you today?",
    "Hi there! I'm here for any medical questions or just a friendly chat. What's on your mind?",
  ]},
  { patterns: [/how are you|how r u|how do you do/i], responses: [
    "I'm doing great, thank you for asking! 😊 More importantly, how are YOU feeling today?",
  ]},
  { patterns: [/good morning/i], responses: ["Good morning! ☀️ Hope you're feeling well today. Any health questions I can help with?"] },
  { patterns: [/good night|good nite/i], responses: ["Good night! 🌙 Sleep well — quality sleep is vital for good health. Rest up!"] },
  { patterns: [/good afternoon/i], responses: ["Good afternoon! 🌤️ How are you feeling? Any health concerns today?"] },
  { patterns: [/thank|thanks|thx|ty$/i], responses: [
    "You're very welcome! 😊 Stay healthy and take care!",
    "Happy to help! Don't hesitate to ask if you need anything else.",
  ]},
  { patterns: [/bye|goodbye|see you|take care/i], responses: [
    "Take care and stay healthy! 💙 Come back anytime!",
    "Goodbye! Remember — your health is your greatest wealth. 🌟",
  ]},
  { patterns: [/your name|who are you|what are you/i], responses: [
    "I'm MedBot 🤖 — your personal health assistant. I can help with symptoms, medicines, first aid, diet, mental health, and live hospital data. Just ask!",
  ]},
  { patterns: [/what can you do|help me|how can you help/i], responses: [
    "I can help you with:\n• 🤒 Symptoms & possible causes\n• 💊 Medicine info & dosage tips\n• 🩺 First aid guidance\n• 🍎 Diet & nutrition advice\n• 🧠 Mental health support\n• 🏥 Live hospital data — doctors & today's stats\n\nJust ask anything!",
  ]},

  { patterns: [/chest pain|heart attack|can't breathe|difficulty breathing|stroke|unconscious|seizure|severe bleeding/i], responses: [
    "🚨 EMERGENCY ALERT 🚨\nThis sounds serious. Please:\n1. Call emergency services (108 / 112) immediately\n2. Do NOT wait — go to the nearest hospital ER\n3. If heart attack: chew aspirin (if not allergic) & sit/lie comfortably\n\n⚠️ Do NOT rely on me for emergencies — call for help NOW!",
  ]},

  { patterns: [/fever|high temperature|temp.*high|body.*hot/i], responses: [
    "🌡️ For fever:\n• Normal temp is 36.5–37.5°C\n• Above 38°C = fever\n• Above 40°C = HIGH — seek medical help urgently\n\nRelief steps:\n✅ Rest and drink plenty of fluids\n✅ Paracetamol (500–1000mg every 6 hrs)\n✅ Wet cloth on forehead\n\nSee a doctor if fever lasts more than 3 days.",
  ]},
  { patterns: [/cold|runny nose|blocked nose|stuffy nose|sneezing|flu|influenza/i], responses: [
    "🤧 Common cold/flu:\n• Caused by viruses — antibiotics won't help\n\nRelief:\n✅ Rest well\n✅ Steam inhalation\n✅ Warm saline gargle\n✅ Paracetamol for body ache & fever\n\nSee a doctor if symptoms persist beyond 7–10 days.",
  ]},
  { patterns: [/cough|coughing|dry cough|wet cough|phlegm/i], responses: [
    "😮‍💨 Cough types:\n\n🔹 Dry cough: Honey + warm water, avoid dusty environments\n🔹 Wet cough: Expectorants, steam inhalation, stay hydrated\n\n⚠️ See a doctor if: cough with blood, lasting more than 3 weeks, or difficulty breathing.",
  ]},
  { patterns: [/headache|head.*pain|migraine|head.*ache/i], responses: [
    "🤕 Headache relief:\n\nTry these first:\n✅ Drink 2 glasses of water\n✅ Rest in a quiet, dark room\n✅ Cold/warm compress on forehead\n✅ Paracetamol or Ibuprofen\n\n🔴 See a doctor immediately if: sudden severe headache, fever + stiff neck, or after head injury.",
  ]},
  { patterns: [/stomach.*pain|stomachache|abdominal.*pain|gastric|acidity|bloating|indigestion/i], responses: [
    "🫃 Stomach pain:\n\nRelief:\n✅ Warm water or ginger tea\n✅ Antacids for acidity\n✅ Avoid spicy, oily, heavy foods\n✅ Small, frequent meals\n\n⚠️ See a doctor if: severe pain, pain with vomiting blood, or lasting more than 24 hours.",
  ]},
  { patterns: [/diarrhea|diarrhoea|loose motion|loose stool/i], responses: [
    "🚽 Diarrhea:\n\n⭐ Most important: Prevent dehydration!\n✅ Drink ORS frequently\n✅ Eat bland foods: plain rice, banana, toast\n✅ Probiotics help restore gut bacteria\n\n⚠️ Seek help if: blood in stool, signs of dehydration, or child with diarrhea.",
  ]},
  { patterns: [/vomit|vomiting|nausea|throwing up/i], responses: [
    "🤢 Nausea & Vomiting:\n\n✅ Sip small amounts of water slowly\n✅ Ginger tea helps nausea\n✅ Avoid solid food until vomiting stops\n✅ Gradually reintroduce bland foods\n\n⚠️ Seek help if: vomiting blood or cannot keep fluids down.",
  ]},
  { patterns: [/back.*pain|backache|lower back/i], responses: [
    "🔙 Back pain relief:\n\n✅ Hot/cold compress\n✅ Gentle stretching and walking\n✅ Ibuprofen or Diclofenac\n✅ Sleep on firm mattress\n\n⚠️ See a doctor if pain goes down your leg or there's numbness/weakness.",
  ]},
  { patterns: [/blood pressure|hypertension|bp.*high|high.*bp|low.*bp/i], responses: [
    "🩺 Blood Pressure:\n\nNormal: 120/80 mmHg\nHigh BP: ≥ 140/90\nLow BP: < 90/60\n\n🔴 High BP tips:\n✅ Reduce salt\n✅ Exercise 30 min daily\n✅ Manage stress\n\n🔵 Low BP tips:\n✅ Increase fluid intake\n✅ Rise slowly from sitting",
  ]},
  { patterns: [/diabetes|sugar|blood sugar|glucose|diabetic/i], responses: [
    "🍬 Diabetes management:\n\nNormal blood sugar:\n• Fasting: 70–100 mg/dL\n• After meals: < 140 mg/dL\n\n✅ Monitor blood sugar regularly\n✅ Low GI foods, less rice/sugar\n✅ Exercise 30 min daily\n\n⚠️ Low sugar (< 70): Drink fruit juice immediately.",
  ]},
  { patterns: [/stress|anxiety|anxious|panic/i], responses: [
    "🧠 Managing stress & anxiety:\n\n✅ Deep breathing: 4-7-8 technique\n   (Inhale 4s → Hold 7s → Exhale 8s)\n✅ Regular exercise — natural anxiety relief\n✅ Limit news/social media\n✅ Talk to a trusted friend\n\nI'm here if you want to talk 😊",
  ]},
  { patterns: [/depress|depression|feeling.*low|feel.*sad|hopeless/i], responses: [
    "💙 I hear you, and I'm glad you're talking about it.\n\nDepression is a real medical condition, not a weakness.\n\n🆘 If you're having thoughts of harming yourself:\n• iCall: 9152987821\n• Emergency: 112\n\nYou deserve care. Please consider seeing a doctor. 💙",
  ]},
  { patterns: [/diet|nutrition|healthy.*eat|weight.*loss/i], responses: [
    "🍎 Healthy eating basics:\n\n✅ Half your plate: vegetables & fruits\n✅ Quarter: whole grains\n✅ Quarter: protein\n✅ 8–10 glasses of water daily\n\nFor weight loss:\n• 500 cal deficit/day = ~0.5 kg/week\n• Don't skip meals — eat smaller portions",
  ]},
  { patterns: [/first aid|burn|cut.*deep|wound|fracture/i], responses: [
    "🩹 First Aid Guide:\n\n🔥 Burns: Cool under running water 10–20 min, no ice!\n✂️ Cuts: Pressure to stop bleeding, clean, cover\n🦴 Fracture: Immobilise, ice pack, go to hospital\n💧 Choking: 5 back blows + Heimlich manoeuvre",
  ]},
  { patterns: [/paracetamol|panadol|calpol/i], responses: [
    "💊 Paracetamol:\n• Adult dose: 500mg–1000mg every 4–6 hrs (max 4g/day)\n• Safe for: Most people including pregnant women\n• ⚠️ Do NOT exceed dose — liver damage risk\n• ⚠️ Avoid alcohol when taking",
  ]},
  { patterns: [/ibuprofen|brufen|advil/i], responses: [
    "💊 Ibuprofen:\n• Adult dose: 200–400mg every 6–8 hrs with food\n• Best for: Period pain, dental pain, inflammation\n• ⚠️ Take WITH food — can cause stomach upset\n• ⚠️ Avoid if: kidney disease or peptic ulcer",
  ]},
  { patterns: [/antibiotic/i], responses: [
    "💊 Antibiotics:\n• Only effective against BACTERIAL infections — not viruses\n• Always complete the full course\n• Never share antibiotics\n• ⚠️ Should be prescribed by a doctor. Overuse causes antibiotic resistance.",
  ]},
  { patterns: [/water|hydration|dehydrat/i], responses: [
    "💧 Hydration:\n\n• Adults need: 2.5–3.5 litres/day\n• Signs of dehydration: dark urine, dry mouth, fatigue, headache\n\n✅ Start mornings with 2 glasses of water\n✅ Keep a water bottle visible\n✅ ORS/electrolytes for exercise or illness",
  ]},
  { patterns: [/sleep|insomnia|can't sleep/i], responses: [
    "😴 Sleep tips:\n\nAdults need 7–9 hours per night\n\n✅ Same sleep/wake time every day\n✅ Dark, cool, quiet room\n✅ No screens 1 hour before bed\n✅ Avoid caffeine after 2 PM\n✅ Chamomile tea or warm milk",
  ]},
  { patterns: [/vitamin|supplement|deficiency/i], responses: [
    "💊 Common deficiencies:\n\n🔸 Vitamin D: Sunlight, fish, egg yolk\n🔸 Vitamin B12: Meat, eggs, dairy (vegans often need supplements)\n🔸 Iron: Spinach, lentils, red meat\n🔸 Calcium: Milk, yogurt, leafy greens\n\n💡 Get blood tests before taking supplements!",
  ]},
  { patterns: [/tired|fatigue|always.*tired|no energy/i], responses: [
    "😴 Fatigue causes: Poor sleep, dehydration, anemia, vitamin deficiency, stress\n\n✅ 7–9 hours quality sleep\n✅ Stay hydrated\n✅ Eat iron-rich foods: spinach, lentils\n✅ Vitamin B12 and D checks\n✅ Light exercise (boosts energy!)\n\nIf persistent — blood tests recommended.",
  ]},
];

// ── Bot engine ────────────────────────────────────────────────────────────────
function matchKB(text) {
  const lower = text.trim().toLowerCase();
  for (const entry of KB) {
    for (const pattern of entry.patterns) {
      if (pattern.test(lower)) {
        const list = entry.responses;
        return list[Math.floor(Math.random() * list.length)];
      }
    }
  }
  return null;
}

// ── Sensitive info guard ──────────────────────────────────────────────────────
const SENSITIVE = /revenue|income|earning|profit|collection|total.*fee|fee.*total|fee.*amount|amount.*fee|payment.*total|total.*payment|consultation.*fee|fee.*consult|how much.*doctor|doctor.*charge|patient.*detail|patient.*address|patient.*phone|patient.*personal|patient.*info|patient.*record|patient.*data|financial|billing.*report|report.*billing|money.*collect|collect.*money/i;

// ── Live data handlers ────────────────────────────────────────────────────────
async function getLiveReply(text) {
  const t = text.toLowerCase();

  // Block sensitive queries
  if (SENSITIVE.test(t)) {
    return "Hey, I totally get the curiosity 😊 but that kind of info is private and I'm not able to share it. Is there anything else I can help you with?";
  }

  // Doctors list
  if (/doctor.*list|list.*doctor|available.*doctor|doctor.*available|who.*doctor|our.*doctor|show.*doctor|all.*doctor/i.test(t)) {
    try {
      const { data } = await getDoctors();
      if (!data.length) return "Hmm, no doctors are listed yet! Try reaching out to the reception desk 😊";
      const list = data.map((d) => `• Dr. ${d.name} — ${d.specialization}`).join('\n');
      return `Here are our doctors! 👨‍⚕️\n\n${list}\n\nHead to Reception to grab a slot with any of them 🙌`;
    } catch {
      return "Couldn't pull the doctor list right now — try checking with Reception directly 😊";
    }
  }

  // Today's appointment counts (no patient names/details)
  if (/today.*patient|patient.*today|how many patient|appointment.*today|today.*appointment|today.*stat|stat.*today|count.*patient|busy.*today|queue.*today/i.test(t)) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await getAppointments({ date: today });
      const total     = data.length;
      const completed = data.filter((a) => a.status === 'completed').length;
      const waiting   = data.filter((a) => a.status === 'waiting').length;
      const progress  = data.filter((a) => a.status === 'in_progress').length;
      return `Today's quick snapshot 📊\n\n• Total appointments: ${total}\n• ✅ Done: ${completed}\n• ⏳ Waiting: ${waiting}\n• 🔄 With doctor: ${progress}\n\nLive from the system! 🚀`;
    } catch {
      return "Can't grab today's stats at the moment — the system might be busy. Try again in a bit! 😊";
    }
  }

  // Book appointment
  if (/book.*appointment|make.*appointment|appointment.*book|schedule.*appointment/i.test(t)) {
    return "Sure! Here's how to book 📋\n\n1. Go to Reception\n2. Search for the patient (or register if first visit)\n3. Pick a doctor and a free slot\n4. Confirm — token gets generated instantly!\n\nSuper easy 😊 Let me know if you need help!";
  }

  // Register patient
  if (/register.*patient|new.*patient|add.*patient/i.test(t)) {
    return "Easy peasy! To add a new patient 🆕\n\n1. Head to Reception\n2. Hit 'Register New Patient'\n3. Fill in name, phone, age, gender\n4. Scan Aadhaar/ID for auto-fill (optional)\n5. Done — then book an appointment!\n\nAny other questions? 😊";
  }

  return null;
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isBot = msg.from === 'bot';
  return (
    <div className={`flex gap-2 items-end ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mb-0.5">
          AI
        </div>
      )}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
          ${isBot
            ? 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
            : 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-br-sm'
          }`}
      >
        {msg.text}
        <div className={`text-[10px] mt-1 ${isBot ? 'text-gray-400' : 'text-white/60'} text-right`}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">AI</div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ── Main ChatBot ──────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hey! 👋 I'm MedBot — think of me as your friendly health buddy!\n\nAsk me anything — symptoms, medicines, first aid, diet, mental health, or even who's available today. I've got you 😊\n\nWhat's on your mind?", time: nowTime() },
  ]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText) return;
    setInput('');

    setMessages((prev) => [...prev, { from: 'user', text: userText, time: nowTime() }]);
    setTyping(true);

    // Small natural delay
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

    // Try live data first, then offline KB
    let reply = await getLiveReply(userText);
    if (!reply) {
      reply = matchKB(userText) ?? "Hmm, I'm not quite sure about that one 😅 But I'm always learning!\n\nYou can ask me about symptoms, medicines, first aid, diet, sleep, stress — or hospital stuff like the doctor list or today's appointments. Just try me! 😊";
    }

    setTyping(false);
    setMessages((prev) => [...prev, { from: 'bot', text: reply, time: nowTime() }]);
    if (!open) setUnread((n) => n + 1);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* ── Floating button with pulse ring ── */}
      <div className="fixed bottom-5 right-5 z-50">
        {/* Pulse ring — only when closed */}
        {!open && (
          <>
            <span className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-blue-500 opacity-15 animate-ping" style={{ animationDelay: '0.4s' }} />
          </>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-2xl shadow-blue-700/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Open MedBot"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.4 2.798H4.198c-1.43 0-2.4-1.798-1.4-2.798L4.2 15.3" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unread}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* ── Chat window ── */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[92vw] xs:w-[380px] sm:w-[400px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-white/20 animate-scale-in">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-700 to-cyan-600 flex-shrink-0">
            <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs border border-white/30">
              AI
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm leading-tight">MedBot</div>
              <div className="text-blue-200 text-[10px]">Hospital AI Assistant • Online</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50" style={{ minHeight: 240, maxHeight: '52vh' }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 max-h-24"
              placeholder="Ask about health or hospital data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              style={{ lineHeight: '1.4' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
