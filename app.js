const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, "0");
const localISO = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const parseISO = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const addDaysISO = (s, days) => { const d = parseISO(s); d.setDate(d.getDate()+days); return localISO(d); };
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw";
const today = () => localISO();

const seed = {
  version: 2,
  settings: { scrollBudget: 45 },
  daily: { date: today(), energy: 3, scrollUsed: 15 },
  tasks: [
    { id: uid(), title: "Complete BA lesson", done: false, priority: "high", category: "Learning", date: today(), goalId: "goal-ba", estimatedMinutes: 45 },
    { id: uid(), title: "English practice — 30 min", done: true, priority: "high", category: "Learning", date: today(), goalId: "", estimatedMinutes: 30 },
    { id: uid(), title: "Workout", done: false, priority: "medium", category: "Health", date: today(), goalId: "", estimatedMinutes: 45 },
    { id: uid(), title: "Reply to important messages", done: false, priority: "low", category: "Personal", date: today(), goalId: "", estimatedMinutes: 20 }
  ],
  events: [
    { id: uid(), title: "English practice", date: today(), start: "09:30", end: "10:00", category: "Learning", goalId: "", sourceTaskId: "", fixed: false },
    { id: uid(), title: "BA deep work", date: today(), start: "10:15", end: "11:15", category: "Goal", goalId: "goal-ba", sourceTaskId: "", fixed: false },
    { id: uid(), title: "Lunch / reset", date: today(), start: "12:30", end: "13:15", category: "Fixed", goalId: "", sourceTaskId: "", fixed: true },
    { id: uid(), title: "Workout", date: today(), start: "18:00", end: "19:00", category: "Health", goalId: "", sourceTaskId: "", fixed: false }
  ],
  goals: [
    {
      id: "goal-ba",
      title: "Become job-ready as a Business Analyst",
      deadline: addDaysISO(today(), 180),
      area: "Career",
      measurableOutcome: "Be able to present a BA portfolio, explain core BA practices and confidently start applying for junior BA roles.",
      successDefinition: "Two portfolio cases, polished CV/LinkedIn and consistent interview practice.",
      milestones: [
        { id: uid(), title: "Finish BA foundations", targetDate: addDaysISO(today(), 35), successCriteria: "Agile, Scrum, requirements and user stories completed", done: true },
        { id: uid(), title: "Build portfolio case #1", targetDate: addDaysISO(today(), 70), successCriteria: "One end-to-end case is presentation-ready", done: false },
        { id: uid(), title: "Build portfolio case #2", targetDate: addDaysISO(today(), 105), successCriteria: "Second case demonstrates another problem type", done: false },
        { id: uid(), title: "Prepare job search package", targetDate: addDaysISO(today(), 140), successCriteria: "CV, LinkedIn and interview stories ready", done: false },
        { id: uid(), title: "Start applications", targetDate: addDaysISO(today(), 165), successCriteria: "Weekly application and interview routine started", done: false }
      ],
      weeklyRhythm: "4–5 focused sessions per week",
      fallbackPlan: "If a week slips, keep one 30-minute BA session and restart from the next available day."
    }
  ],
  focusSessions: [],
  history: []
};

function loadData() {
  try {
    const raw = localStorage.getItem("growth-os-ai-v2");
    if (!raw) return structuredClone(seed);
    const parsed = JSON.parse(raw);
    if (parsed.version !== 2) return structuredClone(seed);
    return parsed;
  } catch {
    return structuredClone(seed);
  }
}

let data = loadData();
let weekStart = startOfWeek(today());
let goalDraft = null;
let currentFocusTaskId = null;
let seconds = 25 * 60;
let running = false;
let timerId = null;
let lastTimerPreset = 25;

function save() { localStorage.setItem("growth-os-ai-v2", JSON.stringify(data)); }
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function startOfWeek(iso) { const d = parseISO(iso); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow); return localISO(d); }
function fmtDay(iso) { return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(parseISO(iso)); }
function fmtDateLong(iso) { return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(parseISO(iso)); }
function taskProgress(date=today()) { const list = data.tasks.filter(t=>t.date===date); return list.length ? Math.round(list.filter(t=>t.done).length/list.length*100) : 0; }
function allGoalMilestones() { return data.goals.flatMap(g => g.milestones.map(m => ({...m, goalTitle:g.title, goalId:g.id}))); }

function rolloverDayIfNeeded() {
  if (data.daily.date === today()) return;
  snapshotDay(data.daily.date);
  data.daily = { date: today(), energy: 3, scrollUsed: 0 };
  save();
}

function snapshotDay(date=today()) {
  if (!date) return;
  const existing = data.history.findIndex(h=>h.date===date);
  const tasks = data.tasks.filter(t=>t.date===date);
  const focusMinutes = data.focusSessions.filter(f=>f.date===date).reduce((sum,f)=>sum+f.minutes,0);
  const snap = {
    date,
    taskTotal: tasks.length,
    taskDone: tasks.filter(t=>t.done).length,
    energy: date===data.daily.date ? data.daily.energy : 0,
    scrollUsed: date===data.daily.date ? data.daily.scrollUsed : 0,
    focusMinutes,
    goalMilestonesDone: allGoalMilestones().filter(m=>m.done).length
  };
  if (existing >= 0) data.history[existing] = snap; else data.history.push(snap);
  data.history = data.history.sort((a,b)=>a.date.localeCompare(b.date)).slice(-60);
}

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>el.classList.remove("show"),2200);
}

function setLoading(button, state, label="Working…") {
  if (!button) return;
  if (state) { button.dataset.old = button.textContent; button.textContent = label; button.disabled = true; }
  else { button.textContent = button.dataset.old || button.textContent; button.disabled = false; }
}

async function callAI(action, payload) {
  $("aiStatus").textContent = "AI thinking…";
  try {
    const response = await fetch("http://localhost:3001/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload: { ...payload, today: today(), timeZone } })
    });
    const json = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(json.error || "AI request failed");
    $("aiStatus").textContent = `AI connected · ${json.model || "OpenAI"}`;
    return json.data;
  } catch (err) {
    $("aiStatus").textContent = "AI not connected";
    throw err;
  }
}

function renderAll() {
  rolloverDayIfNeeded();
  snapshotDay(today());
  $("dateLabel").textContent = fmtDateLong(today());
  renderToday(); renderCalendar(); renderGoals(); renderFocus(); renderProgress();
  save();
}

function renderToday() {
  const quotes = [
    "Small steps, repeated, become a different life.",
    "Protect your attention. It is building your future.",
    "You don't need to feel ready. You need to begin.",
    "Plan less. Start faster. Finish what matters.",
    "Your next ten minutes still count."
  ];
  $("quote").textContent = `“${quotes[new Date().getDate()%quotes.length]}”`;
  const progress = taskProgress();
  $("ring").style.setProperty("--p", `${progress*3.6}deg`); $("ring").dataset.value = `${progress}%`;

  const rank = {high:3,medium:2,low:1};
  const open = data.tasks.filter(t=>t.date===today() && !t.done).sort((a,b)=>rank[b.priority]-rank[a.priority]);
  $("big3").innerHTML = open.slice(0,3).map((t,i)=>`<button class="big-item" data-focus="${t.id}"><span class="num">${i+1}</span><b>${esc(t.title)}</b><span>▶</span></button>`).join("") || `<div class="empty" style="min-height:90px">Everything important is done ✓</div>`;

  const events = data.events.filter(e=>e.date===today()).sort((a,b)=>a.start.localeCompare(b.start));
  $("timeline").innerHTML = events.map(e=>`<div class="event"><div class="time"><b>${esc(e.start)}</b><span>${esc(e.end)}</span></div><div class="eventbox"><div><b>${esc(e.title)}</b><small>${esc(e.category)}${e.fixed?" · fixed":""}</small></div><button class="x" data-remove-event="${e.id}">×</button></div></div>`).join("") || `<div class="hint">No time blocks yet.</div>`;

  const tasks = data.tasks.filter(t=>t.date===today());
  $("tasks").innerHTML = tasks.map(t=>`<div class="task ${t.done?"done":""}"><button class="check" data-toggle-task="${t.id}">${t.done?"✓":""}</button><div class="taskmain"><b>${esc(t.title)}</b><small>${esc(t.category)}${t.goalId?" · goal-linked":""}</small></div>${t.done?"":`<button class="focusbtn" data-focus="${t.id}">▶</button>`}</div>`).join("") || `<div class="hint">No tasks yet.</div>`;

  $("energy").value = data.daily.energy; $("energyValue").textContent = `${data.daily.energy}/5`;
  $("scrollUsed").max = Math.max(120, data.settings.scrollBudget*2); $("scrollUsed").value = data.daily.scrollUsed;
  $("scrollText").textContent = `${data.daily.scrollUsed}/${data.settings.scrollBudget} min`;
}

function renderCalendar() {
  const end = addDaysISO(weekStart,6);
  $("weekLabel").textContent = `${fmtDay(weekStart)} – ${fmtDay(end)}`;
  $("weekGrid").innerHTML = Array.from({length:7},(_,i)=>addDaysISO(weekStart,i)).map(date=>{
    const events = data.events.filter(e=>e.date===date).sort((a,b)=>a.start.localeCompare(b.start));
    return `<div class="day-col ${date===today()?"today-col":""}"><div class="day-head"><b>${esc(new Intl.DateTimeFormat("en",{weekday:"long"}).format(parseISO(date)))}</b><span>${esc(new Intl.DateTimeFormat("en",{day:"numeric",month:"short"}).format(parseISO(date)))}</span></div>${events.map(e=>`<div class="cal-event ${e.category==="Goal"?"goal":""}"><span>${esc(e.start)}–${esc(e.end)}</span><b>${esc(e.title)}</b></div>`).join("") || `<span class="hint">Open</span>`}</div>`;
  }).join("");
}

function renderGoals() {
  $("goalsList").innerHTML = data.goals.map(g=>{
    const done = g.milestones.filter(m=>m.done).length;
    const pct = g.milestones.length ? Math.round(done/g.milestones.length*100) : 0;
    const next = g.milestones.find(m=>!m.done);
    return `<div class="card"><div class="goal-head"><div><span class="eyebrow">${esc(g.area)}</span><h2>${esc(g.title)}</h2></div><div class="pct">${pct}%</div></div><p class="goal-outcome">${esc(g.measurableOutcome || "")}</p><div class="bar"><i style="width:${pct}%"></i></div><div class="goal-meta"><span>Deadline: ${esc(g.deadline||"Not set")}</span><span>Next: ${esc(next?next.title:"Completed")}</span></div><div>${g.milestones.map(m=>`<button class="goalstep ${m.done?"done":""}" data-goal-step="${g.id}|${m.id}">${m.done?"✓":"○"} ${esc(m.title)} <small>· ${esc(m.targetDate||"")}</small></button>`).join("")}</div></div>`;
  }).join("") || `<div class="card empty">Create your first 6-month goal.</div>`;
}

function renderFocus() {
  const open = data.tasks.filter(t=>t.date===today()&&!t.done);
  $("focusList").innerHTML = open.map(t=>`<button class="card focus-pick" data-focus="${t.id}"><span class="eyebrow">${esc(t.category)}</span><h2>${esc(t.title)}</h2><span class="hint">▶ Start focus · ${t.estimatedMinutes||25} min planned</span></button>`).join("") || `<div class="card empty">No open tasks for today.</div>`;
}

function renderProgress() {
  snapshotDay(today());
  const todayTasks = data.tasks.filter(t=>t.date===today());
  const steps = allGoalMilestones();
  const focusWeek = data.focusSessions.filter(f=>f.date>=addDaysISO(today(),-6)).reduce((s,f)=>s+f.minutes,0);
  const goalPct = steps.length ? Math.round(steps.filter(s=>s.done).length/steps.length*100) : 0;
  const stats = [
    ["TODAY'S TASKS", `${taskProgress()}%`, `${todayTasks.filter(t=>t.done).length}/${todayTasks.length} complete`],
    ["GOAL PROGRESS", `${goalPct}%`, `${steps.filter(s=>s.done).length}/${steps.length} milestones`],
    ["FOCUS · 7 DAYS", `${focusWeek}m`, "protected attention"],
    ["SCROLL LEFT", `${Math.max(data.settings.scrollBudget-data.daily.scrollUsed,0)}m`, "today's budget"]
  ];
  $("stats").innerHTML = stats.map(s=>`<div class="card stat"><span class="eyebrow">${s[0]}</span><strong>${s[1]}</strong><p>${s[2]}</p></div>`).join("");
  $("trajectory").innerHTML = data.goals.map(g=>{ const p=g.milestones.length?Math.round(g.milestones.filter(m=>m.done).length/g.milestones.length*100):0; return `<div class="trajectory-row"><div class="trajectory-head"><div><b>${esc(g.title)}</b><div class="hint">${esc(g.area)} · ${esc(g.deadline)}</div></div><strong>${p}%</strong></div><div class="bar"><i style="width:${p}%"></i></div></div>`; }).join("");

  const days = Array.from({length:7},(_,i)=>addDaysISO(today(),i-6));
  const snaps = days.map(date=> data.history.find(h=>h.date===date) || {date,taskTotal:0,taskDone:0});
  $("historyBars").innerHTML = `<div class="history-bars">${snaps.map(h=>{const p=h.taskTotal?Math.round(h.taskDone/h.taskTotal*100):0;return `<div class="history-day"><div class="history-track"><div class="history-fill" style="height:${Math.max(p,2)}%"></div></div><small>${new Intl.DateTimeFormat("en",{weekday:"short"}).format(parseISO(h.date))}<br>${p}%</small></div>`}).join("")}</div>`;
}

function showPage(page) {
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  if (page === "calendar") renderCalendar();
  if (page === "progress") renderProgress();
}

function bindDelegatedClicks() {
  document.addEventListener("click", (e)=>{
    const focus = e.target.closest("[data-focus]"); if (focus) { openFocus(focus.dataset.focus); return; }
    const toggle = e.target.closest("[data-toggle-task]"); if (toggle) { const id=toggle.dataset.toggleTask; data.tasks=data.tasks.map(t=>t.id===id?{...t,done:!t.done}:t); renderAll(); return; }
    const remove = e.target.closest("[data-remove-event]"); if (remove) { data.events=data.events.filter(x=>x.id!==remove.dataset.removeEvent); renderAll(); return; }
    const step = e.target.closest("[data-goal-step]"); if (step) { const [gid,mid]=step.dataset.goalStep.split("|"); data.goals=data.goals.map(g=>g.id===gid?{...g,milestones:g.milestones.map(m=>m.id===mid?{...m,done:!m.done}:m)}:g); renderAll(); return; }
    const saveGoal = e.target.closest("#saveGoalDraft"); if (saveGoal) saveGoalDraft();
    const addAiPlan = e.target.closest("#addAiPlan"); if (addAiPlan) addDailyPlanToCalendar();
    const addReplan = e.target.closest("#applyReplan"); if (addReplan) applyReplan();
  });
}

function openFocus(id) {
  const task = data.tasks.find(t=>t.id===id); if (!task) return;
  currentFocusTaskId=id; $("focusTitle").textContent=task.title; $("focusOverlay").classList.add("show"); $("rescueResult").innerHTML=""; setTimer(25);
}
function setTimer(min) { lastTimerPreset=min; running=false; clearInterval(timerId); seconds=min*60; renderTimer(); $("startPause").textContent="Start"; }
function renderTimer(){ $("timer").textContent=`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`; }
function finishSession() { if (!currentFocusTaskId) return; data.focusSessions.push({id:uid(),date:today(),taskId:currentFocusTaskId,minutes:lastTimerPreset}); snapshotDay(today()); save(); renderProgress(); toast(`+${lastTimerPreset} focus minutes`); }

let latestDailyPlan = null;
let latestReplan = null;

async function buildDailyPlan() {
  const btn=$("buildPlan"); setLoading(btn,true,"AI is planning…"); $("dailyPlanResult").innerHTML=`<div class="loading">Looking at priorities, goals, energy and existing time blocks…</div>`;
  try {
    latestDailyPlan = await callAI("daily_plan", {
      note: $("plannerText").value.trim(),
      energy: data.daily.energy,
      scrollBudgetMinutes: data.settings.scrollBudget,
      scrollUsedMinutes: data.daily.scrollUsed,
      tasks: data.tasks.filter(t=>t.date===today()),
      existingEvents: data.events.filter(e=>e.date===today()),
      goals: data.goals
    });
    const r=latestDailyPlan;
    $("dailyPlanResult").innerHTML=`<div class="ai-output"><span class="eyebrow">${esc(r.headline)}</span><h3>“${esc(r.affirmation)}”</h3><p>${esc(r.rationale)}</p><div class="mini-grid">${r.big_three.map((x,i)=>`<div class="mini-card"><small>BIG ${i+1}</small><b>${esc(x.title)}</b><div class="hint">${esc(x.why)}</div></div>`).join("")}</div><div class="plan-list">${r.schedule.map(s=>`<div class="plan-row"><small>${esc(s.date)} · ${esc(s.start)}–${esc(s.end)}</small><b>${esc(s.title)}</b><div class="hint">${esc(s.note)}</div></div>`).join("")}</div><div class="callout"><b>When resistance hits</b>${esc(r.anti_procrastination_tip)}</div><div class="callout"><b>Scroll rule</b>${esc(r.scroll_rule)}</div><button class="primary" id="addAiPlan" style="margin-top:14px">Add AI plan to calendar</button></div>`;
  } catch(err) { $("dailyPlanResult").innerHTML=renderAIError(err); }
  finally { setLoading(btn,false); }
}

function addDailyPlanToCalendar() {
  if (!latestDailyPlan) return;
  const existingKey = new Set(data.events.map(e=>`${e.date}|${e.start}|${e.title}`));
  for (const s of latestDailyPlan.schedule) {
    const key=`${s.date}|${s.start}|${s.title}`; if(existingKey.has(key)) continue;
    data.events.push({id:uid(),title:s.title,date:s.date,start:s.start,end:s.end,category:s.category||"AI",goalId:s.goal_id||"",sourceTaskId:s.source_task_id||"",fixed:false});
  }
  renderAll(); toast("AI plan added to calendar"); showPage("calendar");
}

async function breakGoal() {
  const wish=$("wish").value.trim(); if(!wish){toast("Write your goal first");return;}
  const btn=$("breakGoal"); setLoading(btn,true,"AI is building the path…"); $("goalDraft").innerHTML=`<div class="loading">Working backward from your deadline and available time…</div>`;
  try {
    goalDraft=await callAI("goal_breakdown",{
      wish,
      deadline:$("goalDeadline").value || addDaysISO(today(),180),
      intensity:$("intensity").value,
      availableHoursPerWeek:Number($("hoursPerWeek").value||5),
      preferredTime:$("preferredTime").value,
      dayOff:$("dayOff").value,
      existingEvents:data.events.filter(e=>e.date>=today()&&e.date<=addDaysISO(today(),14)),
      currentGoals:data.goals.map(g=>({id:g.id,title:g.title,deadline:g.deadline}))
    });
    const g=goalDraft;
    $("goalDraft").innerHTML=`<div class="section-head"><div><span class="eyebrow">AI GOAL MAP · ${esc(g.area)}</span><h2>${esc(g.title)}</h2></div><span>◎</span></div><p class="goal-outcome"><b>Outcome:</b> ${esc(g.measurable_outcome)}</p><p class="goal-outcome"><b>Strategy:</b> ${esc(g.strategy)}</p><div class="steps">${g.milestones.map((m,i)=>`<div class="step"><span>${pad(i+1)}</span><div><b>${esc(m.title)}</b><div class="hint">By ${esc(m.target_date)} · ${esc(m.success_criteria)}</div></div></div>`).join("")}</div><div class="callout"><b>Weekly rhythm</b>${esc(g.weekly_rhythm)}</div><div class="callout"><b>If motivation drops</b>${esc(g.fallback_plan)}</div><div class="plan-list">${g.first_actions.map(a=>`<div class="plan-row"><small>${esc(a.date)} · ${esc(a.start)}–${esc(a.end)}</small><b>${esc(a.title)}</b><div class="hint">${esc(a.why)}</div></div>`).join("")}</div><button class="primary" id="saveGoalDraft">Save goal + schedule first actions</button>`;
  } catch(err) { $("goalDraft").innerHTML=renderAIError(err); }
  finally { setLoading(btn,false); }
}

function saveGoalDraft() {
  if(!goalDraft)return;
  const gid=uid();
  data.goals.push({
    id:gid,title:goalDraft.title,deadline:$("goalDeadline").value||goalDraft.milestones.at(-1)?.target_date||"",area:goalDraft.area,
    measurableOutcome:goalDraft.measurable_outcome,successDefinition:goalDraft.success_definition,weeklyRhythm:goalDraft.weekly_rhythm,fallbackPlan:goalDraft.fallback_plan,
    milestones:goalDraft.milestones.map(m=>({id:uid(),title:m.title,targetDate:m.target_date,successCriteria:m.success_criteria,done:false}))
  });
  for(const a of goalDraft.first_actions){
    data.events.push({id:uid(),title:a.title,date:a.date,start:a.start,end:a.end,category:"Goal",goalId:gid,sourceTaskId:"",fixed:false});
    data.tasks.push({id:uid(),title:a.title,done:false,priority:"high",category:"Goal",date:a.date,goalId:gid,estimatedMinutes:a.duration_minutes});
  }
  goalDraft=null; $("wish").value=""; $("goalDraft").innerHTML=`<div class="empty">Saved. Your goal is now connected to your calendar.</div>`; renderAll(); toast("Goal created");
}

async function replanWeek() {
  const btn=$("replanWeek"); setLoading(btn,true,"AI is reorganizing…"); $("replanResult").innerHTML=`<div class="loading">Protecting high-value work and existing commitments…</div>`;
  try {
    latestReplan=await callAI("replan_week",{
      energy:data.daily.energy,
      goals:data.goals,
      tasks:data.tasks.filter(t=>t.date>=today()&&t.date<=addDaysISO(today(),7)),
      existingEvents:data.events.filter(e=>e.date>=today()&&e.date<=addDaysISO(today(),7)),
      missedTasks:data.tasks.filter(t=>t.date<today()&&!t.done),
      instruction:"Rebuild only flexible work. Preserve events where fixed=true."
    });
    const r=latestReplan;
    $("replanResult").innerHTML=`<div class="card ai-output"><span class="eyebrow">REPLAN</span><h3>${esc(r.message)}</h3><div class="bullet-list">${r.changes.map(x=>`<div class="bullet"><span>→</span><span>${esc(x)}</span></div>`).join("")}</div><div class="plan-list">${r.schedule.map(s=>`<div class="plan-row"><small>${esc(s.date)} · ${esc(s.start)}–${esc(s.end)}</small><b>${esc(s.title)}</b><div class="hint">${esc(s.note)}</div></div>`).join("")}</div><button class="primary" id="applyReplan">Apply this week</button></div>`;
  } catch(err){ $("replanResult").innerHTML=renderAIError(err); }
  finally{ setLoading(btn,false); }
}

function applyReplan(){
  if(!latestReplan)return;
  const through=addDaysISO(today(),7);
  data.events=data.events.filter(e=>!(e.date>=today()&&e.date<=through&&!e.fixed&&(e.category==="Goal"||e.category==="AI")));
  for(const s of latestReplan.schedule) data.events.push({id:uid(),title:s.title,date:s.date,start:s.start,end:s.end,category:s.category||"AI",goalId:s.goal_id||"",sourceTaskId:s.source_task_id||"",fixed:false});
  latestReplan=null; $("replanResult").innerHTML=""; renderAll(); toast("Week replanned");
}

async function rescueCurrentTask() {
  const task=data.tasks.find(t=>t.id===currentFocusTaskId); if(!task)return;
  const btn=$("rescueTask"); setLoading(btn,true,"Making it smaller…");
  try{
    const r=await callAI("procrastination_rescue",{task,goal:data.goals.find(g=>g.id===task.goalId)||null,energy:data.daily.energy});
    $("rescueResult").innerHTML=`<div class="callout"><span class="eyebrow">10-MINUTE RESCUE</span><h3>${esc(r.reframed_task)}</h3><p><b>First tiny step:</b> ${esc(r.first_tiny_step)}</p><div class="bullet-list">${r.ten_minute_plan.map((x,i)=>`<div class="bullet"><span>${i+1}.</span><span>${esc(x)}</span></div>`).join("")}</div><p><b>Remove friction:</b> ${esc(r.remove_friction)}</p><p class="hint">${esc(r.closing_line)}</p></div>`;
    setTimer(10);
  }catch(err){$("rescueResult").innerHTML=renderAIError(err)}finally{setLoading(btn,false)}
}

async function runCoach() {
  snapshotDay(today());
  const btn=$("runCoach"); setLoading(btn,true,"AI is reviewing…"); $("coachResult").innerHTML=`<div class="loading">Looking for useful patterns without overreacting to one bad day…</div>`;
  try{
    const r=await callAI("weekly_coach",{
      history:data.history.filter(h=>h.date>=addDaysISO(today(),-6)),
      tasks:data.tasks.filter(t=>t.date>=addDaysISO(today(),-6)&&t.date<=today()),
      focusSessions:data.focusSessions.filter(f=>f.date>=addDaysISO(today(),-6)),
      goals:data.goals,
      currentEnergy:data.daily.energy,
      scrollBudget:data.settings.scrollBudget
    });
    $("coachResult").innerHTML=`<div class="coach-output"><div class="card"><span class="eyebrow">${esc(r.headline)}</span><h2>${esc(r.summary)}</h2><div class="callout"><b>Main bottleneck</b>${esc(r.bottleneck)}</div><div class="callout"><b>Coach note</b>${esc(r.encouragement)}</div></div><div class="card"><span class="eyebrow">PATTERNS</span><div class="bullet-list">${r.patterns.map(x=>`<div class="bullet"><span>→</span><span>${esc(x)}</span></div>`).join("")}</div><span class="eyebrow" style="display:block;margin-top:18px">NEXT WEEK RULES</span><div class="bullet-list">${r.next_week_rules.map(x=>`<div class="bullet"><span>✓</span><span>${esc(x)}</span></div>`).join("")}</div><span class="eyebrow" style="display:block;margin-top:18px">BIG 3</span><div class="bullet-list">${r.recommended_big_three.map((x,i)=>`<div class="bullet"><span>${i+1}.</span><b>${esc(x)}</b></div>`).join("")}</div></div></div>`;
  }catch(err){$("coachResult").innerHTML=renderAIError(err)}finally{setLoading(btn,false)}
}

function renderAIError(err){
  return `<div class="error"><b>AI isn't connected yet.</b><br>${esc(err.message)}<br><span class="hint">Deploy the project and add OPENAI_API_KEY in the server environment. Your key never needs to be placed in the browser.</span></div>`;
}

// Navigation
for(const n of document.querySelectorAll(".nav")) n.addEventListener("click",()=>showPage(n.dataset.page));
$("goCalendar").addEventListener("click",()=>showPage("calendar"));
$("prevWeek").addEventListener("click",()=>{weekStart=addDaysISO(weekStart,-7);renderCalendar()});
$("nextWeek").addEventListener("click",()=>{weekStart=addDaysISO(weekStart,7);renderCalendar()});

// Manual additions
$("addTask").addEventListener("click",()=>{const title=$("taskText").value.trim();if(!title)return;data.tasks.push({id:uid(),title,done:false,priority:"medium",category:"Personal",date:today(),goalId:"",estimatedMinutes:25});$("taskText").value="";renderAll()});
$("taskText").addEventListener("keydown",e=>{if(e.key==="Enter")$("addTask").click()});
$("addEvent").addEventListener("click",()=>{const title=$("eventTitle").value.trim();if(!title)return;data.events.push({id:uid(),title,date:today(),start:$("eventStart").value,end:$("eventEnd").value,category:"Personal",goalId:"",sourceTaskId:"",fixed:false});$("eventTitle").value="";renderAll()});
$("energy").addEventListener("input",e=>{data.daily.energy=Number(e.target.value);renderAll()});
$("scrollUsed").addEventListener("input",e=>{data.daily.scrollUsed=Number(e.target.value);renderAll()});

// AI actions
$("buildPlan").addEventListener("click",buildDailyPlan);
$("breakGoal").addEventListener("click",breakGoal);
$("replanWeek").addEventListener("click",replanWeek);
$("runCoach").addEventListener("click",runCoach);
$("rescueTask").addEventListener("click",rescueCurrentTask);

// Focus timer
$("closeFocus").addEventListener("click",()=>{$("focusOverlay").classList.remove("show");running=false;clearInterval(timerId)});
for(const b of document.querySelectorAll(".duration")) b.addEventListener("click",()=>setTimer(Number(b.dataset.min)));
$("startPause").addEventListener("click",()=>{
  running=!running; $("startPause").textContent=running?"Pause":"Start";
  if(running){clearInterval(timerId);timerId=setInterval(()=>{seconds--;if(seconds<=0){seconds=0;running=false;clearInterval(timerId);$("startPause").textContent="Done";finishSession()}renderTimer()},1000)} else clearInterval(timerId);
});
$("completeFocus").addEventListener("click",()=>{if(currentFocusTaskId)data.tasks=data.tasks.map(t=>t.id===currentFocusTaskId?{...t,done:true}:t);finishSession();$("focusOverlay").classList.remove("show");running=false;clearInterval(timerId);renderAll()});

bindDelegatedClicks();
renderAll();
