import{r,j as e}from"./vendor-react-bYbXmgvo.js";import{g as v,a as k}from"./index-CKDXB5h9.js";import{a as j}from"./vendor-router-CC6cNi32.js";import"./vendor-axios-DZ_Kha3d.js";const N=[{patterns:[/^hi$|^hello$|^hey$|^hii+$|^hai$/i],responses:["Hello! 👋 I'm MedBot, your health assistant. How can I help you today?","Hi there! I'm here for any medical questions or just a friendly chat. What's on your mind?"]},{patterns:[/how are you|how r u|how do you do/i],responses:["I'm doing great, thank you for asking! 😊 More importantly, how are YOU feeling today?"]},{patterns:[/good morning/i],responses:["Good morning! ☀️ Hope you're feeling well today. Any health questions I can help with?"]},{patterns:[/good night|good nite/i],responses:["Good night! 🌙 Sleep well — quality sleep is vital for good health. Rest up!"]},{patterns:[/good afternoon/i],responses:["Good afternoon! 🌤️ How are you feeling? Any health concerns today?"]},{patterns:[/thank|thanks|thx|ty$/i],responses:["You're very welcome! 😊 Stay healthy and take care!","Happy to help! Don't hesitate to ask if you need anything else."]},{patterns:[/bye|goodbye|see you|take care/i],responses:["Take care and stay healthy! 💙 Come back anytime!","Goodbye! Remember — your health is your greatest wealth. 🌟"]},{patterns:[/your name|who are you|what are you/i],responses:["I'm MedBot 🤖 — your personal health assistant. I can help with symptoms, medicines, first aid, diet, mental health, and live hospital data. Just ask!"]},{patterns:[/what can you do|help me|how can you help/i],responses:[`I can help you with:
• 🤒 Symptoms & possible causes
• 💊 Medicine info & dosage tips
• 🩺 First aid guidance
• 🍎 Diet & nutrition advice
• 🧠 Mental health support
• 🏥 Live hospital data — doctors & today's stats

Just ask anything!`]},{patterns:[/chest pain|heart attack|can't breathe|difficulty breathing|stroke|unconscious|seizure|severe bleeding/i],responses:[`🚨 EMERGENCY ALERT 🚨
This sounds serious. Please:
1. Call emergency services (108 / 112) immediately
2. Do NOT wait — go to the nearest hospital ER
3. If heart attack: chew aspirin (if not allergic) & sit/lie comfortably

⚠️ Do NOT rely on me for emergencies — call for help NOW!`]},{patterns:[/fever|high temperature|temp.*high|body.*hot/i],responses:[`🌡️ For fever:
• Normal temp is 36.5–37.5°C
• Above 38°C = fever
• Above 40°C = HIGH — seek medical help urgently

Relief steps:
✅ Rest and drink plenty of fluids
✅ Paracetamol (500–1000mg every 6 hrs)
✅ Wet cloth on forehead

See a doctor if fever lasts more than 3 days.`]},{patterns:[/cold|runny nose|blocked nose|stuffy nose|sneezing|flu|influenza/i],responses:[`🤧 Common cold/flu:
• Caused by viruses — antibiotics won't help

Relief:
✅ Rest well
✅ Steam inhalation
✅ Warm saline gargle
✅ Paracetamol for body ache & fever

See a doctor if symptoms persist beyond 7–10 days.`]},{patterns:[/cough|coughing|dry cough|wet cough|phlegm/i],responses:[`😮‍💨 Cough types:

🔹 Dry cough: Honey + warm water, avoid dusty environments
🔹 Wet cough: Expectorants, steam inhalation, stay hydrated

⚠️ See a doctor if: cough with blood, lasting more than 3 weeks, or difficulty breathing.`]},{patterns:[/headache|head.*pain|migraine|head.*ache/i],responses:[`🤕 Headache relief:

Try these first:
✅ Drink 2 glasses of water
✅ Rest in a quiet, dark room
✅ Cold/warm compress on forehead
✅ Paracetamol or Ibuprofen

🔴 See a doctor immediately if: sudden severe headache, fever + stiff neck, or after head injury.`]},{patterns:[/stomach.*pain|stomachache|abdominal.*pain|gastric|acidity|bloating|indigestion/i],responses:[`🫃 Stomach pain:

Relief:
✅ Warm water or ginger tea
✅ Antacids for acidity
✅ Avoid spicy, oily, heavy foods
✅ Small, frequent meals

⚠️ See a doctor if: severe pain, pain with vomiting blood, or lasting more than 24 hours.`]},{patterns:[/diarrhea|diarrhoea|loose motion|loose stool/i],responses:[`🚽 Diarrhea:

⭐ Most important: Prevent dehydration!
✅ Drink ORS frequently
✅ Eat bland foods: plain rice, banana, toast
✅ Probiotics help restore gut bacteria

⚠️ Seek help if: blood in stool, signs of dehydration, or child with diarrhea.`]},{patterns:[/vomit|vomiting|nausea|throwing up/i],responses:[`🤢 Nausea & Vomiting:

✅ Sip small amounts of water slowly
✅ Ginger tea helps nausea
✅ Avoid solid food until vomiting stops
✅ Gradually reintroduce bland foods

⚠️ Seek help if: vomiting blood or cannot keep fluids down.`]},{patterns:[/back.*pain|backache|lower back/i],responses:[`🔙 Back pain relief:

✅ Hot/cold compress
✅ Gentle stretching and walking
✅ Ibuprofen or Diclofenac
✅ Sleep on firm mattress

⚠️ See a doctor if pain goes down your leg or there's numbness/weakness.`]},{patterns:[/blood pressure|hypertension|bp.*high|high.*bp|low.*bp/i],responses:[`🩺 Blood Pressure:

Normal: 120/80 mmHg
High BP: ≥ 140/90
Low BP: < 90/60

🔴 High BP tips:
✅ Reduce salt
✅ Exercise 30 min daily
✅ Manage stress

🔵 Low BP tips:
✅ Increase fluid intake
✅ Rise slowly from sitting`]},{patterns:[/diabetes|sugar|blood sugar|glucose|diabetic/i],responses:[`🍬 Diabetes management:

Normal blood sugar:
• Fasting: 70–100 mg/dL
• After meals: < 140 mg/dL

✅ Monitor blood sugar regularly
✅ Low GI foods, less rice/sugar
✅ Exercise 30 min daily

⚠️ Low sugar (< 70): Drink fruit juice immediately.`]},{patterns:[/stress|anxiety|anxious|panic/i],responses:[`🧠 Managing stress & anxiety:

✅ Deep breathing: 4-7-8 technique
   (Inhale 4s → Hold 7s → Exhale 8s)
✅ Regular exercise — natural anxiety relief
✅ Limit news/social media
✅ Talk to a trusted friend

I'm here if you want to talk 😊`]},{patterns:[/depress|depression|feeling.*low|feel.*sad|hopeless/i],responses:[`💙 I hear you, and I'm glad you're talking about it.

Depression is a real medical condition, not a weakness.

🆘 If you're having thoughts of harming yourself:
• iCall: 9152987821
• Emergency: 112

You deserve care. Please consider seeing a doctor. 💙`]},{patterns:[/diet|nutrition|healthy.*eat|weight.*loss/i],responses:[`🍎 Healthy eating basics:

✅ Half your plate: vegetables & fruits
✅ Quarter: whole grains
✅ Quarter: protein
✅ 8–10 glasses of water daily

For weight loss:
• 500 cal deficit/day = ~0.5 kg/week
• Don't skip meals — eat smaller portions`]},{patterns:[/first aid|burn|cut.*deep|wound|fracture/i],responses:[`🩹 First Aid Guide:

🔥 Burns: Cool under running water 10–20 min, no ice!
✂️ Cuts: Pressure to stop bleeding, clean, cover
🦴 Fracture: Immobilise, ice pack, go to hospital
💧 Choking: 5 back blows + Heimlich manoeuvre`]},{patterns:[/paracetamol|panadol|calpol/i],responses:[`💊 Paracetamol:
• Adult dose: 500mg–1000mg every 4–6 hrs (max 4g/day)
• Safe for: Most people including pregnant women
• ⚠️ Do NOT exceed dose — liver damage risk
• ⚠️ Avoid alcohol when taking`]},{patterns:[/ibuprofen|brufen|advil/i],responses:[`💊 Ibuprofen:
• Adult dose: 200–400mg every 6–8 hrs with food
• Best for: Period pain, dental pain, inflammation
• ⚠️ Take WITH food — can cause stomach upset
• ⚠️ Avoid if: kidney disease or peptic ulcer`]},{patterns:[/antibiotic/i],responses:[`💊 Antibiotics:
• Only effective against BACTERIAL infections — not viruses
• Always complete the full course
• Never share antibiotics
• ⚠️ Should be prescribed by a doctor. Overuse causes antibiotic resistance.`]},{patterns:[/water|hydration|dehydrat/i],responses:[`💧 Hydration:

• Adults need: 2.5–3.5 litres/day
• Signs of dehydration: dark urine, dry mouth, fatigue, headache

✅ Start mornings with 2 glasses of water
✅ Keep a water bottle visible
✅ ORS/electrolytes for exercise or illness`]},{patterns:[/sleep|insomnia|can't sleep/i],responses:[`😴 Sleep tips:

Adults need 7–9 hours per night

✅ Same sleep/wake time every day
✅ Dark, cool, quiet room
✅ No screens 1 hour before bed
✅ Avoid caffeine after 2 PM
✅ Chamomile tea or warm milk`]},{patterns:[/vitamin|supplement|deficiency/i],responses:[`💊 Common deficiencies:

🔸 Vitamin D: Sunlight, fish, egg yolk
🔸 Vitamin B12: Meat, eggs, dairy (vegans often need supplements)
🔸 Iron: Spinach, lentils, red meat
🔸 Calcium: Milk, yogurt, leafy greens

💡 Get blood tests before taking supplements!`]},{patterns:[/tired|fatigue|always.*tired|no energy/i],responses:[`😴 Fatigue causes: Poor sleep, dehydration, anemia, vitamin deficiency, stress

✅ 7–9 hours quality sleep
✅ Stay hydrated
✅ Eat iron-rich foods: spinach, lentils
✅ Vitamin B12 and D checks
✅ Light exercise (boosts energy!)

If persistent — blood tests recommended.`]}];function S(t){const n=t.trim().toLowerCase();for(const o of N)for(const a of o.patterns)if(a.test(n)){const s=o.responses;return s[Math.floor(Math.random()*s.length)]}return null}const I=/revenue|income|earning|profit|collection|total.*fee|fee.*total|fee.*amount|amount.*fee|payment.*total|total.*payment|consultation.*fee|fee.*consult|how much.*doctor|doctor.*charge|patient.*detail|patient.*address|patient.*phone|patient.*personal|patient.*info|patient.*record|patient.*data|financial|billing.*report|report.*billing|money.*collect|collect.*money/i;async function A(t){const n=t.toLowerCase();if(I.test(n))return"Hey, I totally get the curiosity 😊 but that kind of info is private and I'm not able to share it. Is there anything else I can help you with?";if(/doctor.*list|list.*doctor|available.*doctor|doctor.*available|who.*doctor|our.*doctor|show.*doctor|all.*doctor/i.test(n))try{const{data:o}=await v();return o.length?`Here are our doctors! 👨‍⚕️

${o.map(s=>`• Dr. ${s.name} — ${s.specialization}`).join(`
`)}

Head to Reception to grab a slot with any of them 🙌`:"Hmm, no doctors are listed yet! Try reaching out to the reception desk 😊"}catch{return"Couldn't pull the doctor list right now — try checking with Reception directly 😊"}if(/today.*patient|patient.*today|how many patient|appointment.*today|today.*appointment|today.*stat|stat.*today|count.*patient|busy.*today|queue.*today/i.test(n))try{const o=new Date().toISOString().split("T")[0],{data:a}=await k({date:o}),s=a.length,c=a.filter(l=>l.status==="completed").length,d=a.filter(l=>l.status==="waiting").length,h=a.filter(l=>l.status==="in_progress").length;return`Today's quick snapshot 📊

• Total appointments: ${s}
• ✅ Done: ${c}
• ⏳ Waiting: ${d}
• 🔄 With doctor: ${h}

Live from the system! 🚀`}catch{return"Can't grab today's stats at the moment — the system might be busy. Try again in a bit! 😊"}return/book.*appointment|make.*appointment|appointment.*book|schedule.*appointment/i.test(n)?`Sure! Here's how to book 📋

1. Go to Reception
2. Search for the patient (or register if first visit)
3. Pick a doctor and a free slot
4. Confirm — token gets generated instantly!

Super easy 😊 Let me know if you need help!`:/register.*patient|new.*patient|add.*patient/i.test(n)?`Easy peasy! To add a new patient 🆕

1. Head to Reception
2. Hit 'Register New Patient'
3. Fill in name, phone, age, gender
4. Scan Aadhaar/ID for auto-fill (optional)
5. Done — then book an appointment!

Any other questions? 😊`:null}function C({msg:t}){const n=t.from==="bot";return e.jsxs("div",{className:`flex gap-2 items-end ${n?"justify-start":"justify-end"}`,children:[n&&e.jsx("div",{className:"w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mb-0.5",children:"AI"}),e.jsxs("div",{className:`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
          ${n?"bg-white text-gray-800 rounded-bl-sm border border-gray-100":"bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-br-sm"}`,children:[t.text,e.jsx("div",{className:`text-[10px] mt-1 ${n?"text-gray-400":"text-white/60"} text-right`,children:t.time})]})]})}function H(){return e.jsxs("div",{className:"flex gap-2 items-end",children:[e.jsx("div",{className:"w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0",children:"AI"}),e.jsx("div",{className:"bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm",children:e.jsxs("div",{className:"flex gap-1 items-center",children:[e.jsx("span",{className:"w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),e.jsx("span",{className:"w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),e.jsx("span",{className:"w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]})})]})}const x=()=>new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});function M(){const[t,n]=r.useState(!1),[o,a]=r.useState([{from:"bot",text:`Hey! 👋 I'm MedBot — think of me as your friendly health buddy!

Ask me anything — symptoms, medicines, first aid, diet, mental health, or even who's available today. I've got you 😊

What's on your mind?`,time:x()}]),[s,c]=r.useState(""),[d,h]=r.useState(!1),[l,p]=r.useState(0),g=r.useRef(),f=r.useRef();r.useEffect(()=>{t&&(p(0),setTimeout(()=>{var i;return(i=f.current)==null?void 0:i.focus()},100))},[t]),r.useEffect(()=>{var i;(i=g.current)==null||i.scrollIntoView({behavior:"smooth"})},[o,d]);const y=async i=>{const m=s.trim();if(!m)return;c(""),a(u=>[...u,{from:"user",text:m,time:x()}]),h(!0),await new Promise(u=>setTimeout(u,400+Math.random()*400));let b=await A(m);b||(b=S(m)??`Hmm, I'm not quite sure about that one 😅 But I'm always learning!

You can ask me about symptoms, medicines, first aid, diet, sleep, stress — or hospital stuff like the doctor list or today's appointments. Just try me! 😊`),h(!1),a(u=>[...u,{from:"bot",text:b,time:x()}]),t||p(u=>u+1)},w=i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),y())};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"fixed bottom-5 right-5 z-50",children:[!t&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping"}),e.jsx("span",{className:"absolute inset-0 rounded-full bg-blue-500 opacity-15 animate-ping",style:{animationDelay:"0.4s"}})]}),e.jsx("button",{onClick:()=>n(i=>!i),className:"relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-2xl shadow-blue-700/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center","aria-label":"Open MedBot",children:t?e.jsx("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2.5,d:"M6 18L18 6M6 6l12 12"})}):e.jsxs(e.Fragment,{children:[e.jsx("svg",{className:"w-6 h-6",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.4 2.798H4.198c-1.43 0-2.4-1.798-1.4-2.798L4.2 15.3"})}),l>0&&e.jsx("span",{className:"absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce",children:l})]})})]}),t&&e.jsxs("div",{className:"fixed bottom-24 right-4 z-50 w-[92vw] xs:w-[380px] sm:w-[400px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-white/20 animate-scale-in",children:[e.jsxs("div",{className:"flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-700 to-cyan-600 flex-shrink-0",children:[e.jsxs("div",{className:"relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs border border-white/30",children:["AI",e.jsx("span",{className:"absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"})]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"font-bold text-white text-sm leading-tight",children:"MedBot"}),e.jsx("div",{className:"text-blue-200 text-[10px]",children:"Hospital AI Assistant • Online"})]}),e.jsx("button",{onClick:()=>n(!1),className:"text-white/70 hover:text-white transition p-1",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2.5,d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50",style:{minHeight:240,maxHeight:"52vh"},children:[o.map((i,m)=>e.jsx(C,{msg:i},m)),d&&e.jsx(H,{}),e.jsx("div",{ref:g})]}),e.jsxs("div",{className:"flex items-end gap-2 px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0",children:[e.jsx("textarea",{ref:f,rows:1,className:"flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 max-h-24",placeholder:"Ask about health or hospital data...",value:s,onChange:i=>c(i.target.value),onKeyDown:w,style:{lineHeight:"1.4"}}),e.jsx("button",{onClick:()=>y(),disabled:!s.trim()||d,className:"w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex-shrink-0",children:e.jsx("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2.5,d:"M12 19l9 2-9-18-9 18 9-2zm0 0v-8"})})})]})]})]})}const D=[{value:"500+",label:"Patients Served Daily",num:500,suffix:"+"},{value:"98%",label:"Appointment Accuracy",num:98,suffix:"%"},{value:"24/7",label:"System Availability",num:null},{value:"0s",label:"Manual Paperwork",num:null}];function L(t,n=1400){const[o,a]=r.useState(0),s=r.useRef(),c=r.useRef(!1);return r.useEffect(()=>{if(!t)return;const d=new IntersectionObserver(([h])=>{if(!h.isIntersecting||c.current)return;c.current=!0;const l=performance.now(),p=g=>{const f=Math.min((g-l)/n,1),y=1-Math.pow(1-f,3);a(Math.floor(y*t)),f<1?requestAnimationFrame(p):a(t)};requestAnimationFrame(p)},{threshold:.5});return s.current&&d.observe(s.current),()=>d.disconnect()},[t,n]),[o,s]}function R({stat:t}){const[n,o]=L(t.num,1400),a=t.num!==null?`${n}${t.suffix}`:t.value;return e.jsxs("div",{ref:o,className:"text-center",children:[e.jsx("div",{className:"text-2xl sm:text-3xl font-black text-white tabular-nums",children:a}),e.jsx("div",{className:"text-xs text-white/65 mt-0.5 leading-tight",children:t.label})]})}function E(){const t=j(),[n,o]=r.useState(!1);r.useEffect(()=>{const s=setTimeout(()=>o(!0),60);return()=>clearTimeout(s)},[]);const a=(s=0)=>`transition-all duration-700 ${n?"opacity-100 translate-y-0":"opacity-0 translate-y-5"} delay-[${s}ms]`;return e.jsxs("div",{className:"relative flex flex-col text-white min-h-[calc(100vh-3.5rem)]",children:[e.jsx("div",{className:"bg-zoom fixed inset-0 -z-20",style:{backgroundImage:"url(/hero-bg.jpg)",backgroundSize:"cover",backgroundPosition:"center",backgroundRepeat:"no-repeat"}}),e.jsx("div",{className:"fixed inset-0 -z-10 bg-gradient-to-b from-slate-950/95 via-blue-950/93 to-slate-950/96"}),e.jsxs("section",{className:"flex-1 flex flex-col items-center justify-center text-center px-5 pt-12 pb-10 sm:pt-20 sm:pb-14",children:[e.jsxs("h1",{className:`text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-black leading-[1.08] mb-5 ${a(80)}`,children:["Delivering Care",e.jsx("br",{}),e.jsx("span",{className:"bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent",children:"with Precision"})]}),e.jsx("p",{className:`text-white/80 text-sm sm:text-lg max-w-2xl leading-relaxed mb-10 ${a(160)}`,children:"A comprehensive hospital operations platform — from patient arrival to prescription, every step is streamlined, trackable, and effortless for your clinical team."}),e.jsx("div",{className:`flex flex-col xs:flex-row items-center gap-3 mb-14 ${a(220)}`,children:e.jsxs("button",{onClick:()=>t("/login"),className:"group flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-bold text-sm sm:text-base shadow-2xl shadow-blue-800/50 hover:shadow-blue-600/50 active:scale-[0.97] transition-all",children:["Access Portal",e.jsx("svg",{className:"w-5 h-5 group-hover:translate-x-0.5 transition-transform",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2.2,d:"M13 7l5 5m0 0l-5 5m5-5H6"})})]})}),e.jsx("div",{className:`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-2xl mb-14 ${a(280)}`,children:D.map(s=>e.jsx(R,{stat:s},s.label))})]}),e.jsx(M,{})]})}export{E as default};
