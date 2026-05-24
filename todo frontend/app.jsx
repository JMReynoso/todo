const { useState, useEffect, useMemo, useRef, useLayoutEffect } = React;

// Responsive: returns true under ~720px wide. Single source of truth.
function useIsMobile(bp = 720) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const m = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const on = (e) => setMobile(e.matches);
    setMobile(m.matches);
    if (m.addEventListener) m.addEventListener("change", on); else m.addListener(on);
    return () => { if (m.removeEventListener) m.removeEventListener("change", on); else m.removeListener(on); };
  }, [bp]);
  // Mirror onto the html element so pure-CSS rules can branch too.
  useEffect(() => { document.documentElement.dataset.mobile = mobile ? "true" : "false"; }, [mobile]);
  return mobile;
}

/* ============================================================
   THEME
   ============================================================ */
// Keyed by hex hero so TweakColor swatches render real chips.
const ACCENTS = {
  "#c97a3c": {
    accent: "oklch(0.62 0.14 55)",
    soft: "oklch(0.94 0.04 65)",
    ink: "oklch(0.42 0.12 50)",
    label: "Amber",
  },
  "#3d3a35": {
    accent: "oklch(0.30 0.02 60)",
    soft: "oklch(0.92 0.01 60)",
    ink: "oklch(0.22 0.02 60)",
    label: "Ink",
  },
  "#6a8c5d": {
    accent: "oklch(0.55 0.10 145)",
    soft: "oklch(0.93 0.04 145)",
    ink: "oklch(0.38 0.08 145)",
    label: "Moss",
  },
  "#4a76b8": {
    accent: "oklch(0.55 0.13 250)",
    soft: "oklch(0.94 0.04 245)",
    ink: "oklch(0.38 0.10 250)",
    label: "Cobalt",
  },
};

const CADENCES = [
  { id: "daily", label: "Daily", note: "today" },
  { id: "weekly", label: "Weekly", note: "this week" },
  { id: "monthly", label: "Monthly", note: "this month" },
  { id: "quarterly", label: "Quarterly", note: "this quarter" },
];

const PEOPLE = [
  { id: "me", name: "You", initials: "Y", color: "oklch(0.62 0.14 55)" },
  { id: "maya", name: "Maya O.", initials: "MO", color: "oklch(0.58 0.12 200)" },
  { id: "devon", name: "Devon L.", initials: "DL", color: "oklch(0.55 0.14 290)" },
  { id: "sam", name: "Sam P.", initials: "SP", color: "oklch(0.62 0.14 20)" },
  { id: "nina", name: "Nina K.", initials: "NK", color: "oklch(0.55 0.12 145)" },
];
const personById = (id) => PEOPLE.find((p) => p.id === id) || null;

// Settings context — avoids prop-drilling streak threshold etc through 5 layers.
const SettingsCtx = React.createContext({
  profile: { name: "You", email: "", color: "#c97a3c" },
  scoring: { streakThreshold: 3, includeDaily: true, includeWeekly: true, includeMonthly: false, includeQuarterly: false, includeOnce: false },
});
const MobileCtx = React.createContext(false);
const useMobile = () => React.useContext(MobileCtx);

// Merge live profile (name/color/photo) into the "me" entry so every avatar
// of "me" across the app reflects current settings.
function useResolvedPeople() {
  const settings = React.useContext(SettingsCtx);
  const p = settings?.profile || {};
  return React.useMemo(() => PEOPLE.map((person) => {
    if (person.id !== "me") return person;
    const initial = (p.name || "Y").trim().slice(0, 1).toUpperCase();
    return {
      ...person,
      name: p.name || person.name,
      color: p.color || person.color,
      photo: p.photo || null,
      initials: initial,
    };
  }), [p.name, p.color, p.photo]);
}
function useResolvedPerson(id) {
  const people = useResolvedPeople();
  return React.useMemo(() => people.find((x) => x.id === id) || null, [people, id]);
}

// Period label that shows in each cadence section's eyebrow — "May 24",
// "May 19 – 25", "May", "Q2 · Apr – Jun" — so users see exactly which window
// they're looking at.
// When a recurring task is checked off, this is when it resets back to "open".
// 0..1 urgency for in-progress tasks based on how close we are to the end of
// the cadence window. Daily ramps from 4pm to midnight; weekly over the last
// 60h; monthly the last 5d; quarterly the last 2w; one-offs the last 48h.
function endOfWindow(task) {
  const now = new Date();
  if (task.cadence === "once") {
    if (!task.dueOn) return null;
    const d = new Date(task.dueOn + "T23:59:59");
    return isNaN(d.getTime()) ? null : d;
  }
  if (task.cadence === "daily") {
    const eod = new Date(now); eod.setHours(23, 59, 59, 999);
    return eod;
  }
  if (task.cadence === "weekly") {
    const daysToSun = (7 - now.getDay()) % 7;
    const end = new Date(now); end.setDate(now.getDate() + daysToSun);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (task.cadence === "monthly") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  if (task.cadence === "quarterly") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
  }
  return null;
}
const URGENCY_WINDOW_HOURS = { daily: 8, weekly: 60, monthly: 120, quarterly: 336, once: 48 };
function taskUrgency(task) {
  if (task.done) return 0;
  const end = endOfWindow(task);
  if (!end) return 0;
  const hoursLeft = (end - new Date()) / 3600000;
  if (hoursLeft <= 0) return 1;
  const win = URGENCY_WINDOW_HOURS[task.cadence];
  if (!win || hoursLeft >= win) return 0;
  return Math.max(0, Math.min(1, 1 - hoursLeft / win));
}

function nextResetLabel(cadence) {
  const d = new Date();
  if (cadence === "daily") {
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return next.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase();
  }
  if (cadence === "weekly") {
    const daysUntilSun = (7 - d.getDay()) % 7 || 7;
    const next = new Date(d); next.setDate(d.getDate() + daysUntilSun);
    return next.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
  }
  if (cadence === "monthly") {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return next.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
  }
  if (cadence === "quarterly") {
    const q = Math.floor(d.getMonth() / 3);
    const next = new Date(d.getFullYear() + (q === 3 ? 1 : 0), ((q + 1) % 4) * 3, 1);
    return next.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
  }
  return null;
}

function cadencePeriodLabel(id) {
  const d = new Date();
  if (id === "daily") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (id === "weekly") {
    const start = new Date(d); start.setDate(d.getDate() - d.getDay()); // Sunday
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const fmt = (x) => x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    // ISO 8601 week number
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
    return `${fmt(start)} – ${fmt(end).split(" ").pop()} · wk ${wk}/52`;
  }
  if (id === "monthly") return d.toLocaleDateString(undefined, { month: "long" });
  if (id === "quarterly") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    const months = ["Jan", "Apr", "Jul", "Oct"];
    const ends = ["Mar", "Jun", "Sep", "Dec"];
    return `Q${q} · ${months[q - 1]} – ${ends[q - 1]}`;
  }
  return "";
}

/* ============================================================
   SAMPLE DATA
   ============================================================ */
const uid = () => Math.random().toString(36).slice(2, 9);

const seed = () => [
  // DAILY
  { id: uid(), cadence: "daily", title: "Morning pages — 3 longhand", done: false,
    priority: "high", due: "today", tags: ["focus"], streak: 14, assignee: "me",
    notes: "Stream-of-consciousness, no editing. Burn after if it helps.",
    subtasks: [{ id: uid(), title: "Pen, journal on desk by 6:45a", done: true }, { id: uid(), title: "Phone in drawer", done: false }] },
  { id: uid(), cadence: "daily", title: "20-min walk before 11a", done: true,
    priority: "med", due: "today", tags: ["body"], streak: 6,
    notes: "Without podcasts. Just notice things.", subtasks: [] },
  { id: uid(), cadence: "daily", title: "Inbox to zero (unread only)", done: false,
    priority: "med", due: "today", tags: ["work"], streak: 3, assignee: "me",
    notes: "Triage, don't reply. Archive aggressively.", subtasks: [] },
  { id: uid(), cadence: "daily", title: "Read 10 pages", done: false,
    priority: "low", due: "today", tags: ["mind"], streak: 22,
    notes: "Currently: Patrick Leigh Fermor, A Time of Gifts.", subtasks: [] },
  { id: uid(), cadence: "daily", title: "Daily standup notes", done: true,
    priority: "med", due: "9:30a", tags: ["work"], streak: 0, assignee: "devon",
    notes: "Three lines: yesterday / today / blockers.", subtasks: [] },
  { id: uid(), cadence: "daily", title: "Hydration — 2L", done: false,
    priority: "low", due: "today", tags: ["body"], streak: 41,
    notes: "", subtasks: [{ id: uid(), title: "Bottle #1 by lunch", done: false }, { id: uid(), title: "Bottle #2 by 5p", done: false }] },

  // WEEKLY
  { id: uid(), cadence: "weekly", title: "Submit timesheet", done: false,
    priority: "high", due: "Fri", tags: ["work"], streak: 11, assignee: "me",
    notes: "Pull hours from calendar Mon/Wed. Don't trust memory on Friday.", subtasks: [] },
  { id: uid(), cadence: "weekly", title: "1:1 with Maya", done: false,
    priority: "med", due: "Thu 2p", tags: ["work"], streak: 8, assignee: "maya",
    notes: "Topics: Q3 hiring, design review cadence, onboarding doc.",
    subtasks: [{ id: uid(), title: "Pre-read draft of hiring plan", done: true }, { id: uid(), title: "Followups from last week", done: false }] },
  { id: uid(), cadence: "weekly", title: "Plan next week — Fri block", done: false,
    priority: "high", due: "Fri 3p", tags: ["focus"], streak: 5,
    notes: "90 min, no calls. Review goals, queue Monday's deep-work block.", subtasks: [] },
  { id: uid(), cadence: "weekly", title: "Long run, 6mi+", done: true,
    priority: "med", due: "Sat", tags: ["body"], streak: 4,
    notes: "Easy pace. Negative split if it feels good.", subtasks: [] },
  { id: uid(), cadence: "weekly", title: "Grocery + meal prep", done: false,
    priority: "low", due: "Sun", tags: ["home"], streak: 9,
    notes: "Two lunches + one dinner. Sheet-pan whatever.", subtasks: [] },
  { id: uid(), cadence: "weekly", title: "Call mom", done: false,
    priority: "med", due: "Sun", tags: ["home"], streak: 12,
    notes: "", subtasks: [] },

  // MONTHLY
  { id: uid(), cadence: "monthly", title: "Pay rent", done: true,
    priority: "high", due: "1st", tags: ["money"], streak: 36,
    notes: "Set the reminder for the 28th of the prior month.", subtasks: [] },
  { id: uid(), cadence: "monthly", title: "Review subscriptions", done: false,
    priority: "med", due: "by the 10th", tags: ["money"], streak: 4,
    notes: "Anything I didn't use last month — cancel.",
    subtasks: [{ id: uid(), title: "Export statement", done: false }, { id: uid(), title: "Flag candidates", done: false }, { id: uid(), title: "Cancel + log savings", done: false }] },
  { id: uid(), cadence: "monthly", title: "Backup laptop → SSD", done: false,
    priority: "med", due: "last Sun", tags: ["work"], streak: 7,
    notes: "Time Machine + manual copy of /projects.", subtasks: [] },
  { id: uid(), cadence: "monthly", title: "Q-board review prep", done: false,
    priority: "high", due: "3rd Thu", tags: ["work"], streak: 2, assignee: "nina",
    notes: "Slide 1: metrics. Slide 2: bets. Slide 3: asks. That's it.", subtasks: [] },
  { id: uid(), cadence: "monthly", title: "Budget reconciliation", done: false,
    priority: "med", due: "5th", tags: ["money"], streak: 11,
    notes: "Categorize, compare to envelope, adjust.", subtasks: [] },

  // QUARTERLY
  { id: uid(), cadence: "quarterly", title: "OKR retrospective + next-Q plan", done: false,
    priority: "high", due: "last 2wk of Q", tags: ["work", "focus"], streak: 6, assignee: "me",
    notes: "Honest scoring. Then 3 objectives max for next quarter. Anything more is a wishlist.",
    subtasks: [{ id: uid(), title: "Score this quarter's KRs", done: true }, { id: uid(), title: "Draft next-Q objectives", done: false }, { id: uid(), title: "Share for review", done: false }] },
  { id: uid(), cadence: "quarterly", title: "Therapist follow-up", done: false,
    priority: "med", due: "month 1 of Q", tags: ["mind"], streak: 4,
    notes: "", subtasks: [] },
  { id: uid(), cadence: "quarterly", title: "Renew domain + cert audit", done: true,
    priority: "high", due: "month 2", tags: ["work"], streak: 8, assignee: "sam",
    notes: "List all TLS certs, expirations, autorenew status.", subtasks: [] },
  { id: uid(), cadence: "quarterly", title: "Tax checkpoint", done: false,
    priority: "med", due: "end of Q", tags: ["money"], streak: 5,
    notes: "Estimated payments + receipts folder hygiene.", subtasks: [] },
  { id: uid(), cadence: "quarterly", title: "Closet purge", done: false,
    priority: "low", due: "anytime", tags: ["home"], streak: 3,
    notes: "If you haven't worn it this season and last, it goes.", subtasks: [] },
];

/* ============================================================
   ATOMS
   ============================================================ */
function Check({ checked, onChange, size = 18 }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: size, height: size, minWidth: size,
        borderRadius: size * 0.28,
        border: `1.25px solid ${checked ? "var(--accent)" : "var(--line-strong)"}`,
        background: checked ? "var(--accent)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "background 160ms ease, border-color 160ms ease, transform 120ms ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
    >
      {checked && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2 5 8.5 9.5 3.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function Pill({ children, tone = "neutral", size = "sm" }) {
  const palette = {
    neutral: { bg: "var(--bg-sunken)", fg: "var(--ink-2)", bd: "transparent" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", bd: "transparent" },
    danger: { bg: "oklch(0.95 0.04 25)", fg: "var(--danger)", bd: "transparent" },
    ghost: { bg: "transparent", fg: "var(--ink-3)", bd: "var(--line)" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: "var(--mono)", fontSize: size === "sm" ? 10.5 : 11.5,
      letterSpacing: "0.02em",
      padding: size === "sm" ? "2px 7px" : "3px 9px",
      borderRadius: 999,
      background: palette.bg, color: palette.fg,
      border: `0.5px solid ${palette.bd}`,
      textTransform: "lowercase", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function PriorityDot({ priority }) {
  const c = priority === "high" ? "var(--accent)" : priority === "med" ? "var(--ink-3)" : "var(--ink-4)";
  return <span style={{ width: 6, height: 6, borderRadius: 999, background: c, flex: "none" }} />;
}

function Icon({ name, size = 16, stroke = 1.5, color = "currentColor" }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "close": return <svg {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "more": return <svg {...props}><circle cx="5" cy="12" r="1" fill={color} /><circle cx="12" cy="12" r="1" fill={color} /><circle cx="19" cy="12" r="1" fill={color} /></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "filter": return <svg {...props}><path d="M3 6h18M6 12h12M10 18h4" /></svg>;
    case "flame": return <svg {...props}><path d="M12 3s4 4 4 8a4 4 0 1 1-8 0c0-1.5.6-2.7 1.4-3.6C9 7 10 5.5 12 3z" /></svg>;
    case "calendar": return <svg {...props}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>;
    case "tag": return <svg {...props}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="7.5" r="1.2" fill={color} /></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" /></svg>;
    case "chevron": return <svg {...props}><path d="M6 9l6 6 6-6" /></svg>;
    case "chart": return <svg {...props}><path d="M4 20V10M10 20V4M16 20V14M22 20H2" /></svg>;
    case "back": return <svg {...props}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
    case "gear": return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.21.5.65.91 1.18 1.07.16.05.34.08.51.08H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></svg>;
    case "list": return <svg {...props}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>;
    case "columns": return <svg {...props}><rect x="3.5" y="4" width="4.5" height="16" rx="1" /><rect x="9.75" y="4" width="4.5" height="16" rx="1" /><rect x="16" y="4" width="4.5" height="16" rx="1" /></svg>;
    case "tabs": return <svg {...props}><path d="M3.5 9h6V5h11v14H3.5V9z" /><path d="M3.5 9h6" /></svg>;
    case "stacked": return <svg {...props}><rect x="3.5" y="4.5" width="17" height="4" rx="1" /><rect x="3.5" y="10" width="17" height="4" rx="1" /><rect x="3.5" y="15.5" width="17" height="4" rx="1" /></svg>;
    case "arrow": return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "trash": return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>;
    default: return null;
  }
}

/* ============================================================
   APP
   ============================================================ */
function App() {
  const [tweaks, setTweak] = window.useTweaks(window.__TWEAK_DEFAULTS__);

  const [tasks, setTasks] = useState(seed);
  const [active, setActive] = useState("daily");
  const [openId, setOpenId] = useState(null);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();
  const [page, setPage] = useState("home"); // "home" | "performance"
  const [homeKey, setHomeKey] = useState(0); // bump to retrigger entrance animation
  const goHome = () => { setPage("home"); setHomeKey((k) => k + 1); };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    profile: { name: "You", email: "you@todo.app", color: "#c97a3c" },
    scoring: {
      includeDaily: true,
      includeWeekly: true,
      includeMonthly: false,
      includeQuarterly: false,
      includeOnce: false,
      streakThreshold: 3,
    },
  });
  const patchSettings = (section, patch) => setSettings((s) => ({ ...s, [section]: { ...s[section], ...patch } }));

  // apply accent
  useEffect(() => {
    const a = ACCENTS[tweaks.accent] || ACCENTS["#c97a3c"];
    const r = document.documentElement.style;
    r.setProperty("--accent", a.accent);
    r.setProperty("--accent-soft", a.soft);
    r.setProperty("--accent-ink", a.ink);
  }, [tweaks.accent]);

  // density
  useEffect(() => {
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.density]);

  const [draft, setDraft] = useState(null);
  const openTask = useMemo(
    () => draft || tasks.find((x) => x.id === openId) || null,
    [draft, tasks, openId]
  );

  const updateTask = (id, patch) => setTasks((xs) => xs.map((x) => x.id === id ? { ...x, ...patch } : x));
  const toggleTask = (id) => updateTask(id, { done: !tasks.find((x) => x.id === id).done });
  const addTask = (cadence, title) => {
    if (!title.trim()) return;
    setTasks((xs) => [...xs, { id: uid(), cadence, title: title.trim(), done: false, priority: "med", due: "", tags: [], subtasks: [], notes: "", streak: 0, assignee: null }]);
  };
  // Patch whichever task the detail modal is currently showing — draft or saved.
  const patchOpen = (patch) => {
    if (draft) setDraft((d) => ({ ...d, ...patch }));
    else if (openTask) updateTask(openTask.id, patch);
  };
  const toggleOpen = () => { if (openTask) patchOpen({ done: !openTask.done }); };
  // Hover-+ creates a DRAFT (not yet committed). Modal "Save" commits it.
  const createOnDate = (date) => {
    const iso = isoDate(date);
    setDraft({
      id: uid(), cadence: "once", date: iso,
      title: "", done: false, priority: "med",
      due: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      tags: [], subtasks: [], notes: "", streak: 0, assignee: null,
      isDraft: true,
    });
  };
  // Click an "Add to ..." composer → spawn a draft for that cadence (no date)
  // and open the detail modal. Mirrors createOnDate so save/discard works the same.
  const createDraftFor = (cadence) => {
    setDraft({
      id: uid(), cadence,
      title: "", done: false, priority: "med",
      due: "", tags: [], subtasks: [], notes: "", streak: 0, assignee: null,
      isDraft: true,
    });
  };
  const saveDraft = () => {
    if (!draft) return;
    const { isDraft, ...committed } = draft;
    setTasks((xs) => [...xs, committed]);
    setDraft(null);
    setOpenId(null);
    setClosing(false);
  };
  const deleteTask = (id) => { setOpenId(null); setDraft(null); setTasks((xs) => xs.filter((x) => x.id !== id)); };

  const requestClose = () => {
    setClosing(true);
    setTimeout(() => {
      setOpenId(null);
      setDraft(null); // discard any unsaved draft
      setClosing(false);
    }, 280);
  };

  // ESC to close detail
  useEffect(() => {
    const isOpen = !!openId || !!draft;
    const onKey = (e) => { if (e.key === "Escape" && isOpen) requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, draft]);

  return (
    <SettingsCtx.Provider value={settings}>
    <MobileCtx.Provider value={isMobile}>
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar query={query} setQuery={setQuery} layout={tweaks.layout} setLayout={(v) => setTweak("layout", v)} page={page} setPage={(p) => p === "home" ? goHome() : setPage(p)} onOpenSettings={() => setSettingsOpen(true)} />
      {page === "performance" ? (
        <PerformancePage tasks={tasks} onBack={goHome} settings={settings} />
      ) : tweaks.layout === "calendar" ? (
        <CalendarView key={`cal-${homeKey}`} tasks={tasks} onOpen={setOpenId} onToggle={toggleTask} onAdd={addTask} onCreateOnDate={createOnDate} query={query} />
      ) : (
        <StackedView key={`stk-${homeKey}`} tasks={tasks} onOpen={setOpenId} onToggle={toggleTask} onAdd={createDraftFor} query={query} hairlines={tweaks.showHairlines} settings={settings} />
      )}

      {/* Detail sheet */}
      {(openId || draft) && openTask && (
        <DetailSheet
          task={openTask}
          closing={closing}
          onClose={requestClose}
          onChange={patchOpen}
          onToggle={toggleOpen}
          onDelete={() => deleteTask(openTask.id)}
          onSave={saveDraft}
        />
      )}

      {settingsOpen && (
        <SettingsModal settings={settings} patch={patchSettings} onClose={() => setSettingsOpen(false)} />
      )}

      <window.TweaksPanel title="Tweaks">
        <window.TweakRadio
          label="Layout"
          value={tweaks.layout}
          onChange={(v) => setTweak("layout", v)}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "calendar", label: "Calendar" },
          ]}
        />
        <window.TweakColor
          label="Accent"
          value={tweaks.accent}
          onChange={(v) => setTweak("accent", v)}
          options={Object.keys(ACCENTS)}
        />
        <window.TweakRadio
          label="Density"
          value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[{ value: "comfortable", label: "Cozy" }, { value: "compact", label: "Compact" }]}
        />
        <window.TweakToggle
          label="Hairlines"
          value={tweaks.showHairlines}
          onChange={(v) => setTweak("showHairlines", v)}
        />
      </window.TweaksPanel>
    </div>
    </MobileCtx.Provider>
    </SettingsCtx.Provider>
  );
}

/* ============================================================
   TOP BAR
   ============================================================ */
function TopBar({ query, setQuery, layout, setLayout, page, setPage, onOpenSettings }) {
  const isMobile = useMobile();
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const dayShort = now.toLocaleDateString(undefined, { weekday: "short" });
  const dateShort = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const views = [
    { id: "stacked", icon: "stacked", title: "Stacked" },
    { id: "calendar", icon: "calendar", title: "Calendar" },
  ];
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header style={{
      padding: isMobile ? "12px 16px 10px" : "22px 36px 18px",
      display: "flex", alignItems: "center", gap: isMobile ? 8 : 24,
      borderBottom: "1px solid var(--line)",
      background: "var(--bg)",
      position: "sticky", top: 0, zIndex: 5,
      flexWrap: isMobile ? "wrap" : "nowrap",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{
          fontFamily: "var(--display)",
          fontWeight: 500,
          fontSize: isMobile ? 22 : 26, lineHeight: 1, color: "var(--ink)",
          letterSpacing: "-0.02em",
        }}>todo<span style={{ color: "var(--accent)" }}>.</span></span>
        {!isMobile && (
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>· a cadence</span>
        )}
      </div>
      <div style={{ flex: 1 }} />
      {/* Page nav */}
      {setPage && (
        page === "performance" ? (
          <button
            onClick={() => setPage("home")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: isMobile ? "7px 12px" : "7px 14px", borderRadius: 999,
              border: "1px solid var(--line)", background: "var(--bg-elev)",
              color: "var(--ink-2)", fontSize: 13, letterSpacing: "-0.005em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elev)")}
          >
            <Icon name="back" size={13} stroke={1.6} />
            {!isMobile && <span>back to todo</span>}
          </button>
        ) : (
          <button
            onClick={() => setPage("performance")}
            title="Performance"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: isMobile ? "7px 10px" : "7px 14px", borderRadius: 999,
              border: "1px solid var(--line)", background: "var(--bg-elev)",
              color: "var(--ink-2)", fontSize: 13, letterSpacing: "-0.005em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elev)")}
          >
            <Icon name="chart" size={13} stroke={1.6} />
            {!isMobile && <span>performance</span>}
          </button>
        )
      )}
      {/* View switcher */}
      {setLayout && page !== "performance" && (
        <div style={{ display: "flex", alignItems: "center", padding: 3, background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 999 }}>
          {views.map((v) => {
            const active = layout === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setLayout(v.id)}
                title={v.title}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 28, borderRadius: 999,
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--bg)" : "var(--ink-3)",
                  transition: "background 140ms ease, color 140ms ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--ink-3)"; }}
              >
                <Icon name={v.icon} size={15} stroke={1.6} />
              </button>
            );
          })}
        </div>
      )}
      {/* Search: collapsed icon-only on mobile, expands when focused */}
      {isMobile ? (
        <>
          <button
            onClick={() => setSearchOpen((o) => !o)}
            title="Search"
            style={{
              width: 34, height: 34, borderRadius: 999,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-elev)", border: "1px solid var(--line)",
              color: "var(--ink-2)",
            }}
          >
            <Icon name="search" size={14} stroke={1.6} />
          </button>
          {searchOpen && (
            <div style={{
              order: 99, // wrap to next row
              flex: "1 0 100%",
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--bg-elev)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              marginTop: 4,
            }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search tasks…"
                style={{ width: "100%", fontSize: 14 }}
              />
              {query && (
                <button onClick={() => setQuery("")} style={{ color: "var(--ink-3)" }}>
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px",
          background: "var(--bg-elev)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          flex: "0 1 220px", minWidth: 140, marginLeft: 12,
        }}>
          <Icon name="search" size={14} color="var(--ink-3)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search tasks…"
            style={{ width: "100%", fontSize: 13.5 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ color: "var(--ink-3)" }}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      )}
      {/* Date — abbreviated on mobile */}
      {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18, lineHeight: 1, letterSpacing: "-0.02em" }}>{day}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{date}</span>
        </div>
      )}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            width: 34, height: 34, borderRadius: 999,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-elev)", border: "1px solid var(--line)",
            color: "var(--ink-2)", marginLeft: isMobile ? 0 : 4,
            transition: "background 140ms ease, transform 200ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; e.currentTarget.style.transform = "rotate(30deg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elev)"; e.currentTarget.style.transform = "rotate(0deg)"; }}
        >
          <Icon name="gear" size={15} stroke={1.5} />
        </button>
      )}
    </header>
  );
}

/* ============================================================
   TABS VIEW (primary)
   ============================================================ */
function TabsView({ tasks, active, setActive, onOpen, onToggle, onAdd, query, hairlines }) {
  const counts = useMemo(() => {
    const m = {};
    CADENCES.forEach((c) => {
      const xs = tasks.filter((t) => t.cadence === c.id);
      m[c.id] = { total: xs.length, done: xs.filter((t) => t.done).length };
    });
    return m;
  }, [tasks]);

  const filtered = tasks.filter((t) => t.cadence === active && (!query || t.title.toLowerCase().includes(query.toLowerCase())));
  const open = filtered.filter((t) => !t.done);
  const done = filtered.filter((t) => t.done);
  const activeCadence = CADENCES.find((c) => c.id === active);

  return (
    <main style={{ flex: 1, padding: "0 36px 80px", maxWidth: 920, width: "100%", margin: "0 auto" }}>
      {/* Tabs */}
      <nav style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--line)",
        marginBottom: 32,
        position: "sticky", top: 73, zIndex: 4,
        background: "var(--bg)",
      }}>
        {CADENCES.map((c) => {
          const isActive = c.id === active;
          const { total, done } = counts[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              style={{
                padding: "16px 0",
                marginRight: 32,
                display: "flex", alignItems: "baseline", gap: 8,
                borderBottom: `1.5px solid ${isActive ? "var(--ink)" : "transparent"}`,
                marginBottom: -1,
                transition: "border-color 160ms ease",
              }}
            >
              <span style={{
                fontFamily: "var(--serif)",
                fontStyle: isActive ? "italic" : "normal",
                fontSize: 22,
                color: isActive ? "var(--ink)" : "var(--ink-3)",
                letterSpacing: "-0.01em",
              }}>{c.label}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10.5,
                color: isActive ? "var(--ink-2)" : "var(--ink-4)",
                letterSpacing: "0.04em",
              }}>{done}/{total}</span>
            </button>
          );
        })}
      </nav>

      {/* Section heading */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--serif)", fontStyle: "italic",
            fontSize: 56, lineHeight: 1.0, margin: 0,
            color: "var(--ink)", letterSpacing: "-0.02em",
          }}>
            {activeCadence.label.toLowerCase()}<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <p style={{
            fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)",
            letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 10, marginBottom: 0,
          }}>
            {open.length} open · {done.length} complete · {activeCadence.note}
          </p>
        </div>
        <Progress done={done.length} total={filtered.length} />
      </div>

      {/* Task list */}
      <TaskList tasks={open} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} />

      {/* Composer */}
      <Composer cadence={active} onAdd={onAdd} />

      {/* Completed */}
      {done.length > 0 && (
        <details style={{ marginTop: 48 }}>
          <summary style={{
            cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--ink-3)",
            padding: "10px 0", listStyle: "none", outline: 0,
          }}>
            Completed · {done.length}
          </summary>
          <div style={{ marginTop: 8, opacity: 0.78 }}>
            <TaskList tasks={done} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} />
          </div>
        </details>
      )}
    </main>
  );
}

/* ============================================================
   STACKED VIEW (all cadences, top → bottom)
   ============================================================ */
function ScheduledSection({ sectionRef, tasks, onOpen, onToggle, onAdd, hairlines, mounted }) {
  const isMobile = useMobile();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const groups = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const k = t.date || "~"; // "~" sorts after ISO dates so undated appears last in calendar context
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(t);
    }
    // Undated first, then by date ascending
    return [...m.entries()].sort((a, b) => {
      if (a[0] === "~" && b[0] !== "~") return -1;
      if (a[0] !== "~" && b[0] === "~") return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [tasks]);
  return (
    <section
      ref={sectionRef}
      style={{
        paddingBottom: 64, marginBottom: 64, borderBottom: "1px solid var(--line)",
        opacity: mounted === false ? 0 : 1,
        transform: mounted === false ? "translateY(16px)" : "translateY(0)",
        transition: "opacity 600ms ease 60ms, transform 700ms cubic-bezier(.22,.61,.36,1) 60ms",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          00 — one-time, not scored
        </div>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 500,
          fontSize: isMobile ? 44 : 64, lineHeight: 0.95, margin: 0,
          color: "var(--ink)", letterSpacing: "-0.04em",
        }}>
          one-offs<span style={{ color: "var(--accent)" }}>.</span>
        </h2>
        <p style={{
          fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)",
          letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 12, marginBottom: 0,
        }}>
          {open.length} open · {done.length} complete · doesn't count toward your score
        </p>
      </div>
      {groups.length === 0 && (
        <div style={{
          padding: "12px 0 0",
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: 17, color: "var(--ink-3)", letterSpacing: "-0.015em",
        }}>
          nothing one-off yet. add something below — no date needed.
        </div>
      )}
      {groups.map(([dateKey, items]) => {
        const d = new Date(dateKey + "T00:00:00");
        const label = dateKey === "~" || isNaN(d.getTime())
          ? "anytime"
          : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        return (
          <div key={dateKey} style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)",
              letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "10px 4px 4px",
            }}>{label}</div>
            <TaskList tasks={items} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} />
          </div>
        );
      })}
      {/* Composer for undated one-offs */}
      <Composer cadence="once" onAdd={onAdd} />
    </section>
  );
}

function StackedView({ tasks, onOpen, onToggle, onAdd, query, hairlines }) {
  const sectionRefs = useRef({});
  const [activeAnchor, setActiveAnchor] = useState("daily");
  const [mounted, setMounted] = useState(false);
  const isMobile = useMobile();
  useEffect(() => { const t = setTimeout(() => setMounted(true), 20); return () => clearTimeout(t); }, []);

  const onceTasks = useMemo(() => tasks
    .filter((t) => t.cadence === "once" && (!query || (t.title || "").toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => String(a.date).localeCompare(String(b.date))), [tasks, query]);

  const sections = useMemo(() => {
    const out = [{ id: "scheduled", label: "One-offs", note: "one-time, not scored" }];
    return out.concat(CADENCES);
  }, []);

  const counts = useMemo(() => {
    const m = { scheduled: { total: onceTasks.length, done: onceTasks.filter((t) => t.done).length } };
    CADENCES.forEach((c) => {
      const xs = tasks.filter((t) => t.cadence === c.id);
      m[c.id] = { total: xs.length, done: xs.filter((t) => t.done).length };
    });
    return m;
  }, [tasks, onceTasks]);

  // Scrollspy: highlight whichever section's heading is nearest the top
  useEffect(() => {
    const onScroll = () => {
      const probe = window.scrollY + 200;
      let current = sections[0]?.id || "daily";
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (el && el.offsetTop <= probe) current = s.id;
      }
      setActiveAnchor(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const jumpTo = (id) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - 110, behavior: "smooth" });
  };

  return (
    <main style={{
      flex: 1,
      display: isMobile ? "block" : "grid",
      gridTemplateColumns: isMobile ? "none" : "180px 1fr",
      gap: isMobile ? 0 : 64,
      maxWidth: 1160, width: "100%", margin: "0 auto",
      padding: isMobile ? "0 18px 80px" : "0 36px 120px",
    }}>
      {/* Mobile: horizontal scrollable pill bar at top */}
      {isMobile && (
        <nav style={{
          position: "sticky",
          top: 56, // below mobile topbar
          background: "var(--bg)",
          margin: "0 -18px",
          padding: "10px 16px",
          borderBottom: "1px solid var(--line)",
          overflowX: "auto", overflowY: "hidden",
          display: "flex", gap: 6,
          zIndex: 4,
          WebkitOverflowScrolling: "touch",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 400ms ease, transform 500ms ease",
        }}>
          {sections.map((s) => {
            const active = activeAnchor === s.id;
            const { total, done } = counts[s.id];
            return (
              <button
                key={s.id}
                onClick={() => jumpTo(s.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 14px",
                  borderRadius: 999, whiteSpace: "nowrap",
                  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  background: active ? "var(--ink)" : "var(--bg-elev)",
                  color: active ? "var(--bg)" : "var(--ink-2)",
                  fontFamily: "var(--display)", fontWeight: 500, fontSize: 14,
                  letterSpacing: "-0.01em",
                }}
              >
                <span>{s.label.toLowerCase()}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10,
                  color: active ? "var(--bg)" : "var(--ink-4)",
                  letterSpacing: "0.04em", opacity: 0.7,
                }}>{done}/{total}</span>
              </button>
            );
          })}
        </nav>
      )}
      {/* Sticky side anchors (desktop only) */}
      {!isMobile && (
      <aside style={{
        position: "sticky", top: 96, alignSelf: "start", paddingTop: 56, height: "fit-content",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : "translateX(-12px)",
        transition: "opacity 500ms ease, transform 600ms cubic-bezier(.22,.61,.36,1)",
      }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 14 }}>
          jump to
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map((c) => {
            const active = activeAnchor === c.id;
            const { total, done } = counts[c.id];
            return (
              <li key={c.id}>
                <button
                  onClick={() => jumpTo(c.id)}
                  style={{
                    width: "100%", textAlign: "left",
                    display: "flex", alignItems: "baseline", justifyContent: "space-between",
                    padding: "6px 10px 6px 12px",
                    borderLeft: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    marginLeft: -1.5,
                    color: active ? "var(--ink)" : "var(--ink-3)",
                    transition: "border-color 160ms ease, color 160ms ease",
                  }}
                >
                  <span style={{ fontFamily: "var(--display)", fontWeight: active ? 600 : 400, fontSize: 15, letterSpacing: "-0.02em" }}>
                    {c.label.toLowerCase()}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em" }}>{done}/{total}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      )}

      {/* Stacked sections */}
      <div style={{ paddingTop: isMobile ? 16 : 40 }}>
        <ScheduledSection
          sectionRef={(el) => (sectionRefs.current["scheduled"] = el)}
          tasks={onceTasks}
          onOpen={onOpen}
          onToggle={onToggle}
          onAdd={onAdd}
          hairlines={hairlines}
          mounted={mounted}
        />
        {CADENCES.map((c, idx) => {
          const all = tasks.filter((t) => t.cadence === c.id && (!query || t.title.toLowerCase().includes(query.toLowerCase())));
          const open = all.filter((t) => !t.done);
          const done = all.filter((t) => t.done);
          return (
            <section
              key={c.id}
              ref={(el) => (sectionRefs.current[c.id] = el)}
              style={{
                paddingBottom: 64,
                marginBottom: 64,
                borderBottom: idx < CADENCES.length - 1 ? "1px solid var(--line)" : "none",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 600ms ease ${80 + idx * 110}ms, transform 700ms cubic-bezier(.22,.61,.36,1) ${80 + idx * 110}ms`,
              }}
            >
              {/* Heading */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                    {String(idx + 1).padStart(2, "0")} — {c.note}
                    <span style={{ color: "var(--ink-4)" }}> · {cadencePeriodLabel(c.id)}</span>
                  </div>
                  <h2 style={{
                    fontFamily: "var(--display)", fontWeight: 500,
                    fontSize: isMobile ? 44 : 64, lineHeight: 0.95, margin: 0,
                    color: "var(--ink)", letterSpacing: "-0.04em",
                  }}>
                    {c.label.toLowerCase()}<span style={{ color: "var(--accent)" }}>.</span>
                  </h2>
                  <p style={{
                    fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)",
                    letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 12, marginBottom: 0,
                  }}>
                    {open.length} open · {done.length} complete
                  </p>
                </div>
                <Progress done={done.length} total={all.length} />
              </div>

              {/* List */}
              <TaskList tasks={open} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} />

              {/* Composer */}
              <Composer cadence={c.id} onAdd={onAdd} />

              {/* Completed */}
              {done.length > 0 && (
                <details style={{ marginTop: 28 }}>
                  <summary style={{
                    cursor: "pointer",
                    fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: "var(--ink-3)",
                    padding: "10px 0", listStyle: "none", outline: 0,
                  }}>
                    Completed · {done.length}
                    {nextResetLabel(c.id) && (
                      <span style={{ color: "var(--ink-4)" }}> · resets {nextResetLabel(c.id)}</span>
                    )}
                  </summary>
                  <div style={{ marginTop: 8, opacity: 0.78 }}>
                    <TaskList tasks={done} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} />
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

/* ============================================================
   COLUMNS VIEW
   ============================================================ */
function ColumnsView({ tasks, onOpen, onToggle, onAdd, query, hairlines }) {
  return (
    <main style={{ flex: 1, padding: "28px 28px 80px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, alignItems: "start" }}>
      {CADENCES.map((c) => {
        const xs = tasks.filter((t) => t.cadence === c.id && (!query || t.title.toLowerCase().includes(query.toLowerCase())));
        const open = xs.filter((t) => !t.done);
        const done = xs.filter((t) => t.done);
        return (
          <section key={c.id} style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: "18px 16px 14px",
            minHeight: 320,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, letterSpacing: "-0.01em" }}>{c.label.toLowerCase()}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{done.length}/{xs.length}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {open.map((task, i) => (
                <CompactRow key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} last={i === open.length - 1} />
              ))}
              {done.length > 0 && open.length > 0 && <div style={{ height: 8 }} />}
              {done.map((task, i) => (
                <CompactRow key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} last={i === done.length - 1} muted />
              ))}
            </div>
            <Composer cadence={c.id} onAdd={onAdd} compact />
          </section>
        );
      })}
    </main>
  );
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function parseWeekday(s) {
  if (!s) return 5; // default Friday
  const m = String(s).toLowerCase().match(/(sun|mon|tue|wed|thu|fri|sat)/);
  return m ? WEEKDAYS.indexOf(m[1]) : 5;
}
function parseMonthDay(s) {
  if (!s) return 1;
  const lower = String(s).toLowerCase();
  if (lower.includes("last")) return -1; // last day of month sentinel
  const m = lower.match(/(\d{1,2})/);
  return m ? Math.min(28, parseInt(m[1], 10)) : 1;
}
function tasksOnDate(tasks, date) {
  const wd = date.getDay();
  const dm = date.getDate();
  const month = date.getMonth();
  const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate();
  const iso = isoDate(date);
  const out = [];
  for (const t of tasks) {
    if (t.cadence === "once") { if (t.date === iso) out.push(t); }
    else if (t.cadence === "daily") out.push(t);
    else if (t.cadence === "weekly") { if (parseWeekday(t.due) === wd) out.push(t); }
    else if (t.cadence === "monthly") {
      const n = parseMonthDay(t.due);
      const target = n === -1 ? lastDay : n;
      if (target === dm) out.push(t);
    }
    else if (t.cadence === "quarterly") {
      // place on the 15th of the first month of each quarter
      if (dm === 15 && [0, 3, 6, 9].includes(month)) out.push(t);
    }
  }
  return out;
}

function DayCell({ date, dayTasks, isToday, isWeekend, onOpen, onAdd, cadenceTint, cadenceInk }) {
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useMobile();
  const popRef = useRef(null);
  useEffect(() => {
    if (!expanded) return;
    const onClick = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setExpanded(false); };
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [expanded]);
  const visible = dayTasks.slice(0, 4);
  const overflow = dayTasks.length - visible.length;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isWeekend ? "var(--bg)" : "var(--bg-elev)",
        minHeight: isMobile ? 64 : 124,
        padding: isMobile ? "5px 4px 6px" : "8px 8px 10px",
        display: "flex", flexDirection: "column", gap: isMobile ? 2 : 4,
        position: "relative",
        outline: hover ? "1px solid var(--line-strong)" : "1px solid transparent",
        outlineOffset: -1,
        transition: "outline-color 120ms ease",
      }}
    >
      {/* Date number + add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: isMobile ? 10.5 : 11.5,
          color: isToday ? "#fff" : "var(--ink-2)",
          background: isToday ? "var(--accent)" : "transparent",
          padding: isToday ? "2px 6px" : "2px 0",
          borderRadius: 999,
          fontWeight: isToday ? 600 : 400,
          letterSpacing: "0.02em",
        }}>{date.getDate()}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Hover + button */}
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(date); }}
            title={`Add a task on ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            style={{
              width: 20, height: 20, borderRadius: 999,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: "var(--ink)", color: "var(--bg)",
              opacity: hover ? 1 : 0,
              transform: hover ? "scale(1)" : "scale(0.85)",
              transition: "opacity 140ms ease, transform 140ms ease, background 140ms ease",
              pointerEvents: hover ? "auto" : "none",
              boxShadow: "0 4px 10px -3px rgba(20,16,10,0.25)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ink)")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>
      {/* Tasks: mobile shows dots only, desktop shows chips */}
      {isMobile ? (
        dayTasks.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              display: "flex", flexWrap: "wrap", gap: 3, alignSelf: "flex-start",
              padding: "2px 0",
              background: "transparent", border: 0,
            }}
            title={`${dayTasks.length} ${dayTasks.length === 1 ? "task" : "tasks"}`}
          >
            {dayTasks.slice(0, 4).map((t) => (
              <span key={t.id} style={{
                width: 5, height: 5, borderRadius: 999, flex: "none",
                background: cadenceInk[t.cadence] || cadenceInk.once,
                opacity: t.done ? 0.4 : 1,
              }} />
            ))}
            {dayTasks.length > 4 && (
              <span style={{
                fontFamily: "var(--mono)", fontSize: 8.5,
                color: "var(--ink-3)", letterSpacing: "0.04em",
                marginLeft: 2,
              }}>+{dayTasks.length - 4}</span>
            )}
          </button>
        )
      ) : visible.map((t) => (
        <button
          key={t.id}
          onClick={() => onOpen(t.id)}
          title={t.title || "Untitled"}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 7px 3px 6px", borderRadius: 5,
            background: cadenceTint[t.cadence] || cadenceTint.once,
            color: cadenceInk[t.cadence] || cadenceInk.once,
            fontSize: 11.5, lineHeight: 1.2,
            textAlign: "left",
            borderLeft: `2px solid ${cadenceInk[t.cadence] || cadenceInk.once}`,
            textDecoration: t.done ? "line-through" : "none",
            textDecorationColor: cadenceInk[t.cadence] || cadenceInk.once,
            opacity: t.done ? 0.55 : 1,
            fontStyle: t.title ? "normal" : "italic",
          }}
        >
          <span style={{
            width: 5, height: 5, borderRadius: 999, flex: "none",
            background: t.priority === "high" ? "var(--accent)" : "transparent",
            border: t.priority === "high" ? "none" : `1px solid ${cadenceInk[t.cadence] || cadenceInk.once}`,
            opacity: t.priority === "low" ? 0.45 : 1,
          }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title || "untitled"}</span>
        </button>
      ))}
      {!isMobile && overflow > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{
            alignSelf: "flex-start",
            fontFamily: "var(--mono)", fontSize: 10,
            color: "var(--ink-3)", letterSpacing: "0.04em",
            padding: "2px 6px", borderRadius: 4,
            transition: "background 120ms ease, color 120ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; e.currentTarget.style.color = "var(--ink)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-3)"; }}
        >+{overflow} more</button>
      )}
      {expanded && (
        <div
          ref={popRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: -6, left: -6, right: -6,
            zIndex: 30,
            background: "var(--bg-elev)",
            border: "1px solid var(--line-strong)",
            borderRadius: 10,
            padding: "10px 10px 12px",
            boxShadow: "0 18px 44px -16px rgba(20,16,10,0.25), 0 4px 10px -4px rgba(20,16,10,0.10)",
            display: "flex", flexDirection: "column", gap: 4,
            minHeight: 124,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11.5,
                color: isToday ? "#fff" : "var(--ink)",
                background: isToday ? "var(--accent)" : "transparent",
                padding: isToday ? "2px 7px" : "0",
                borderRadius: 999, fontWeight: 600,
              }}>{date.getDate()}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {date.toLocaleDateString(undefined, { weekday: "short", month: "short" })}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => { setExpanded(false); onAdd(date); }}
                title="Add task on this day"
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "var(--ink)", color: "var(--bg)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button
                onClick={() => setExpanded(false)}
                title="Close"
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "var(--ink-3)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>
          {dayTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => { setExpanded(false); onOpen(t.id); }}
              title={t.title || "untitled"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 8px 5px 7px", borderRadius: 5,
                background: cadenceTint[t.cadence] || cadenceTint.once,
                color: cadenceInk[t.cadence] || cadenceInk.once,
                fontSize: 12, lineHeight: 1.3,
                textAlign: "left",
                borderLeft: `2px solid ${cadenceInk[t.cadence] || cadenceInk.once}`,
                textDecoration: t.done ? "line-through" : "none",
                textDecorationColor: cadenceInk[t.cadence] || cadenceInk.once,
                opacity: t.done ? 0.55 : 1,
                fontStyle: t.title ? "normal" : "italic",
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: 999, flex: "none",
                background: t.priority === "high" ? "var(--accent)" : "transparent",
                border: t.priority === "high" ? "none" : `1px solid ${cadenceInk[t.cadence] || cadenceInk.once}`,
                opacity: t.priority === "low" ? 0.45 : 1,
              }} />
              <span style={{ whiteSpace: "normal" }}>{t.title || "untitled"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarView({ tasks, onOpen, onToggle, onCreateOnDate, query }) {
  const today = new Date();
  const isMobile = useMobile();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 20); return () => clearTimeout(t); }, []);
  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const filtered = tasks.filter((t) => !query || t.title.toLowerCase().includes(query.toLowerCase()));
  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

  const cadenceTint = {
    daily: "oklch(0.95 0.02 60)",
    weekly: "oklch(0.94 0.05 200)",
    monthly: "oklch(0.93 0.05 290)",
    quarterly: "oklch(0.94 0.06 30)",
    once: "oklch(0.96 0.005 60)",
  };
  const cadenceInk = {
    daily: "oklch(0.40 0.06 60)",
    weekly: "oklch(0.40 0.10 220)",
    monthly: "oklch(0.40 0.10 290)",
    quarterly: "oklch(0.40 0.12 30)",
    once: "oklch(0.30 0.02 60)",
  };

  return (
    <main style={{ flex: 1, padding: isMobile ? "16px 14px 60px" : "20px 36px 80px", maxWidth: 1280, width: "100%", margin: "0 auto", boxSizing: "border-box", minWidth: 0 }}>
      {/* Calendar header */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 500ms ease, transform 600ms cubic-bezier(.22,.61,.36,1)",
      }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            calendar — recurring view
          </div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 500,
            fontSize: isMobile ? 32 : 48, lineHeight: 0.98, margin: 0, color: "var(--ink)", letterSpacing: "-0.035em",
          }}>{monthLabel.toLowerCase()}<span style={{ color: "var(--accent)" }}>.</span></h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Cadence legend — hidden on mobile */}
          {!isMobile && (
          <div style={{ display: "flex", gap: 12, marginRight: 18 }}>
            {CADENCES.map((c) => (
              <div key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: cadenceTint[c.id], border: `0.5px solid ${cadenceInk[c.id]}` }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{c.label}</span>
              </div>
            ))}
          </div>
          )}
          <button
            onClick={() => setView(new Date(year, month - 1, 1))}
            style={navBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elev)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button
            onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))}
            style={{
              padding: "6px 14px", borderRadius: 999,
              background: "var(--bg-elev)", border: "1px solid var(--line)",
              fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)",
            }}
          >Today</button>
          <button
            onClick={() => setView(new Date(year, month + 1, 1))}
            style={navBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elev)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1, marginBottom: 1, paddingLeft: 1, paddingRight: 1 }}>
        {(isMobile ? ["S", "M", "T", "W", "T", "F", "S"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((d, i) => (
          <div key={i} style={{
            padding: isMobile ? "8px 4px" : "10px 12px", fontFamily: "var(--mono)", fontSize: isMobile ? 10 : 10.5,
            color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: isMobile ? "center" : "left",
          }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        background: "var(--line)", gap: 1,
        border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(14px) scale(0.985)",
        transition: "opacity 600ms ease 120ms, transform 700ms cubic-bezier(.22,.61,.36,1) 120ms",
      }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ background: "var(--bg-sunken)", minHeight: isMobile ? 64 : 124 }} />;
          return (
            <DayCell
              key={i}
              date={d}
              dayTasks={tasksOnDate(filtered, d)}
              isToday={sameDay(d, today)}
              isWeekend={d.getDay() === 0 || d.getDay() === 6}
              onOpen={onOpen}
              onAdd={onCreateOnDate}
              cadenceTint={cadenceTint}
              cadenceInk={cadenceInk}
            />
          );
        })}
      </div>

      {/* Footnote */}
      <p style={{
        fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)",
        letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 16, textAlign: "center",
      }}>
        recurrence inferred from each task's cadence + when. click any chip to open detail.
      </p>
    </main>
  );
}

const navBtnStyle = {
  width: 32, height: 32, borderRadius: 999,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "var(--bg-elev)", border: "1px solid var(--line)",
  color: "var(--ink-2)",
  transition: "background 140ms ease",
};

/* ============================================================
   PERFORMANCE PAGE
   ============================================================ */
function buildHistory(tasks) {
  // Stable pseudo-random per call so re-renders don't reshuffle bars.
  let seed = (tasks.length * 9301 + 49297) & 0x7fffffff;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const sim = (total) => Math.max(0, Math.min(total, Math.round(total * (0.42 + rng() * 0.55))));

  const totalDaily = Math.max(1, tasks.filter((t) => t.cadence === "daily").length);
  const totalWeekly = Math.max(1, tasks.filter((t) => t.cadence === "weekly").length);
  const totalMonthly = Math.max(1, tasks.filter((t) => t.cadence === "monthly").length);
  const totalQuarterly = Math.max(1, tasks.filter((t) => t.cadence === "quarterly").length);

  const doneNow = (c) => tasks.filter((t) => t.cadence === c && t.done).length;

  const today = new Date();

  // Daily: 7 days
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const label = d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3).toLowerCase();
    daily.push({
      label,
      done: i === 0 ? doneNow("daily") : sim(totalDaily),
      total: totalDaily,
      current: i === 0,
    });
  }

  // Weekly: 4 weeks
  const weekly = [];
  for (let i = 3; i >= 0; i--) {
    weekly.push({
      label: i === 0 ? "this wk" : `wk -${i}`,
      done: i === 0 ? doneNow("weekly") : sim(totalWeekly),
      total: totalWeekly,
      current: i === 0,
    });
  }

  // Monthly: 12 months
  const monthLabels = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthly = [];
  const curMonth = today.getMonth();
  for (let i = 11; i >= 0; i--) {
    const mIdx = (curMonth - i + 12) % 12;
    monthly.push({
      label: monthLabels[mIdx],
      done: i === 0 ? doneNow("monthly") : sim(totalMonthly),
      total: totalMonthly,
      current: i === 0,
    });
  }

  // Quarterly: 4 quarters
  const quarterly = [];
  const curQ = Math.floor(curMonth / 3);
  for (let i = 3; i >= 0; i--) {
    const qIdx = (curQ - i + 4) % 4;
    quarterly.push({
      label: `q${qIdx + 1}`,
      done: i === 0 ? doneNow("quarterly") : sim(totalQuarterly),
      total: totalQuarterly,
      current: i === 0,
    });
  }

  return { daily, weekly, monthly, quarterly };
}

function PerformancePage({ tasks, settings }) {
  const isMobile = useMobile();
  const [phase, setPhase] = useState("score"); // "score" | "graphs"
  // What counts is configurable in Settings → Performance scoring.
  const scoring = settings?.scoring || { includeDaily: true, includeWeekly: true, includeMonthly: false, includeQuarterly: false, includeOnce: false };
  const counts = (t) => {
    if (t.cadence === "once") return scoring.includeOnce;
    if (t.cadence === "daily") return scoring.includeDaily;
    if (t.cadence === "weekly") return scoring.includeWeekly;
    if (t.cadence === "monthly") return scoring.includeMonthly;
    if (t.cadence === "quarterly") return scoring.includeQuarterly;
    return false;
  };
  const todayTasks = useMemo(
    () => tasksOnDate(tasks, new Date()).filter(counts),
    [tasks, scoring.includeDaily, scoring.includeWeekly, scoring.includeMonthly, scoring.includeQuarterly, scoring.includeOnce]
  );
  const doneToday = todayTasks.filter((t) => t.done).length;
  const totalToday = todayTasks.length;
  const score = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);
  const history = useMemo(() => buildHistory(tasks), []);
  return (
    <main style={{ flex: 1, padding: isMobile ? "0 18px 60px" : "0 36px 80px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
      {phase === "score" ? (
        <ScoreReveal
          key="score"
          score={score}
          doneToday={doneToday}
          totalToday={totalToday}
          onNext={() => setPhase("graphs")}
        />
      ) : (
        <PerformanceGraphs key="graphs" history={history} score={score} doneToday={doneToday} totalToday={totalToday} />
      )}
    </main>
  );
}

function ScoreReveal({ score, doneToday, totalToday, onNext }) {
  const [display, setDisplay] = useState(0);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    let raf;
    const start = performance.now();
    const dur = 1700;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const SIZE = isMobile ? 240 : 340, STROKE = isMobile ? 9 : 12, RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * (display / 100);

  const verdict =
    score >= 90 ? "stellar"
    : score >= 70 ? "strong day"
    : score >= 40 ? "decent start"
    : score > 0 ? "keep going"
    : "fresh slate";

  return (
    <div style={{
      minHeight: "calc(100vh - 110px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 36, paddingTop: 20,
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 11.5,
        color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 500ms ease, transform 500ms ease",
      }}>
        today's score
      </div>

      <div style={{
        position: "relative", width: SIZE, height: SIZE,
        opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.92)",
        transition: "opacity 700ms ease 100ms, transform 700ms cubic-bezier(.22,.61,.36,1) 100ms",
      }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="var(--line)" strokeWidth={STROKE} fill="none" />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            stroke="var(--accent)" strokeWidth={STROKE} fill="none"
            strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "var(--display)", fontWeight: 500,
            fontSize: isMobile ? 92 : 132, lineHeight: 1, color: "var(--ink)", letterSpacing: "-0.06em",
          }}>{display}</div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4,
          }}>out of 100</div>
        </div>
      </div>

      <div style={{
        textAlign: "center",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 700ms ease 800ms, transform 700ms ease 800ms",
      }}>
        <div style={{
          fontFamily: "var(--display)", fontSize: 30, fontWeight: 500,
          letterSpacing: "-0.025em", marginBottom: 8,
        }}>
          {verdict}<span style={{ color: "var(--accent)" }}>.</span>
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {doneToday} of {totalToday} {totalToday === 1 ? "task" : "tasks"} complete today
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          padding: "13px 38px", borderRadius: 999,
          background: "var(--ink)", color: "var(--bg)",
          fontSize: 14, fontWeight: 500, letterSpacing: "0.01em",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 700ms ease 1700ms, transform 700ms ease 1700ms, background 140ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-ink)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ink)")}
      >Okay →</button>
    </div>
  );
}

function ScoreBadge({ score, doneToday, totalToday }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 900;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const SIZE = 76, STROKE = 4, RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * (display / 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3,
        }}>today's score</div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)",
          letterSpacing: "0.04em",
        }}>{doneToday} / {totalToday} complete</div>
      </div>
      <div style={{ position: "relative", width: SIZE, height: SIZE, flex: "none" }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="var(--line)" strokeWidth={STROKE} fill="none" />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            stroke="var(--accent)" strokeWidth={STROKE} fill="none"
            strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--display)", fontWeight: 500,
          fontSize: 28, letterSpacing: "-0.03em", color: "var(--ink)",
        }}>{display}</div>
      </div>
    </div>
  );
}

function PerformanceGraphs({ history, score, doneToday, totalToday }) {
  const isMobile = useMobile();
  const totals = (arr) => arr.reduce((s, d) => s + d.done, 0);
  const possible = (arr) => arr.reduce((s, d) => s + d.total, 0);
  return (
    <div style={{ paddingTop: 32 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 32, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            performance — at a glance
          </div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 500,
            fontSize: 56, lineHeight: 0.98, margin: 0, color: "var(--ink)", letterSpacing: "-0.035em",
          }}>your patterns<span style={{ color: "var(--accent)" }}>.</span></h2>
        </div>
        {/* Score badge */}
        <ScoreBadge score={score} doneToday={doneToday} totalToday={totalToday} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
        <ChartCard
          eyebrow="Daily · last week"
          title="daily completions"
          summary={`${totals(history.daily)}/${possible(history.daily)} done`}
          data={history.daily}
          delay={0}
        />
        <ChartCard
          eyebrow="Weekly · last month"
          title="weekly completions"
          summary={`${totals(history.weekly)}/${possible(history.weekly)} done`}
          data={history.weekly}
          delay={140}
        />
        <ChartCard
          eyebrow="Monthly · last year"
          title="monthly completions"
          summary={`${totals(history.monthly)}/${possible(history.monthly)} done`}
          data={history.monthly}
          delay={280}
        />
        <ChartCard
          eyebrow="Quarterly · last year"
          title="quarterly completions"
          summary={`${totals(history.quarterly)}/${possible(history.quarterly)} done`}
          data={history.quarterly}
          delay={420}
        />
      </div>
    </div>
  );
}

function ChartCard({ eyebrow, title, summary, data, delay }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      background: "var(--bg-elev)",
      border: "1px solid var(--line)",
      borderRadius: 14,
      padding: "20px 22px 18px",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 500ms ease, transform 500ms cubic-bezier(.22,.61,.36,1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.02em" }}>
            {title}
          </div>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
          {summary}
        </div>
      </div>
      <BarChart data={data} delay={delay + 200} />
    </div>
  );
}

function BarChart({ data, delay = 0 }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf, startT;
    const t0 = setTimeout(() => {
      startT = performance.now();
      const dur = 1100;
      const tick = (t) => {
        const p = Math.min(1, (t - startT) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setProgress(eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t0); cancelAnimationFrame(raf); };
  }, [delay]);

  const max = Math.max(...data.map((d) => d.total), 1);
  const W = 440, H = 180;
  const padL = 10, padR = 10, padT = 12, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const slot = innerW / data.length;
  const barW = Math.min(slot * 0.6, 26);
  const baseY = padT + innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke="var(--line)" strokeWidth="1" />
      {data.map((d, i) => {
        const cx = padL + i * slot + slot / 2;
        const bx = cx - barW / 2;
        const stagger = i * 0.05;
        const local = Math.max(0, Math.min(1, (progress - stagger) / (1 - stagger)));
        const eased = 1 - Math.pow(1 - local, 3);
        const fullH = (d.total / max) * innerH;
        const doneH = (d.done / max) * innerH * eased;
        const labelColor = d.current ? "var(--ink)" : "var(--ink-3)";
        return (
          <g key={i}>
            <rect x={bx} y={baseY - fullH} width={barW} height={fullH} rx={3} fill="var(--bg-sunken)" />
            <rect x={bx} y={baseY - doneH} width={barW} height={doneH} rx={3} fill={d.current ? "var(--accent)" : "var(--accent)"} opacity={d.current ? 1 : 0.78} />
            {local > 0.7 && d.done > 0 && (
              <text
                x={cx} y={baseY - doneH - 5}
                textAnchor="middle" fontFamily="var(--mono)" fontSize="9"
                fill="var(--ink-2)" letterSpacing="0.02em"
                opacity={Math.max(0, (local - 0.7) / 0.3)}
              >{d.done}</text>
            )}
            <text
              x={cx} y={H - padB + 16}
              textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5"
              fill={labelColor}
              letterSpacing="0.04em"
              style={{ textTransform: "uppercase" }}
            >{d.label}</text>
            {d.current && (
              <circle cx={cx} cy={H - padB + 20} r="1.4" fill="var(--accent)" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   PROGRESS
   ============================================================ */
function Progress({ done, total }) {
  const pct = total === 0 ? 0 : done / total;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" stroke="var(--line)" strokeWidth="2.5" fill="none" />
          <circle cx="22" cy="22" r="18"
            stroke="var(--accent)" strokeWidth="2.5" fill="none"
            strokeDasharray={`${Math.PI * 36 * pct} ${Math.PI * 36}`}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: "stroke-dasharray 400ms ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-2)",
        }}>{Math.round(pct * 100)}</div>
      </div>
    </div>
  );
}

/* ============================================================
   TASK LIST + ROWS
   ============================================================ */
function TaskList({ tasks, onOpen, onToggle, hairlines }) {
  if (tasks.length === 0) return (
    <div style={{
      padding: "32px 0", textAlign: "left",
      fontFamily: "var(--display)", fontWeight: 400, fontSize: 18, color: "var(--ink-3)", letterSpacing: "-0.015em",
    }}>nothing here. enjoy it, or add something below.</div>
  );
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {tasks.map((task, i) => (
        <TaskRow key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} hairline={hairlines && i < tasks.length - 1} />
      ))}
    </ul>
  );
}

function TaskRow({ task, onOpen, onToggle, hairline }) {
  const [hover, setHover] = useState(false);
  const settings = React.useContext(SettingsCtx);
  const streakThreshold = settings?.scoring?.streakThreshold ?? 3;
  const resolvedAssignee = useResolvedPerson(task.assignee);
  const urgency = taskUrgency(task);
  const urgentBg = urgency > 0
    ? `linear-gradient(90deg, oklch(0.97 0.025 25 / ${0.35 + urgency * 0.25}), oklch(0.88 0.14 25 / ${0.30 + urgency * 0.55}))`
    : null;
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        minHeight: "var(--row-h)",
        padding: "8px 4px",
        borderBottom: hairline ? "1px solid var(--line)" : "1px solid transparent",
        transition: "background 140ms ease",
        background: urgentBg || (hover ? "rgba(0,0,0,0.012)" : "transparent"),
        marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4,
        borderRadius: 4,
      }}
    >
      <Check checked={task.done} onChange={() => onToggle(task.id)} />
      <button
        onClick={() => onOpen(task.id)}
        style={{
          flex: 1, textAlign: "left",
          padding: "4px 0",
          fontSize: 15.5,
          color: task.done ? "var(--ink-3)" : "var(--ink)",
          textDecoration: task.done ? "line-through" : "none",
          textDecorationColor: "var(--ink-4)",
          transition: "color 160ms ease, text-decoration 160ms ease",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <span style={{ fontStyle: task.title ? "normal" : "italic", color: task.title ? undefined : "var(--ink-4)" }}>{task.title || "untitled"}</span>
        {task.subtasks.length > 0 && (
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)",
            background: "var(--bg-sunken)", padding: "1.5px 6px", borderRadius: 4,
          }}>{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}</span>
        )}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {task.assignee && <Avatar person={resolvedAssignee} size={22} /> }
        {task.streak >= streakThreshold && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--accent-ink)", fontFamily: "var(--mono)", fontSize: 11 }}>
            <Icon name="flame" size={11.5} color="var(--accent)" stroke={1.8} />
            {task.streak}
          </span>
        )}
        {task.tags.map((tag) => (
          <Pill key={tag} tone="neutral">{tag}</Pill>
        ))}
        {task.done && task.cadence !== "once" && nextResetLabel(task.cadence) ? (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.02em", fontStyle: "italic" }}>
            resets {nextResetLabel(task.cadence)}
          </span>
        ) : task.due && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: task.priority === "high" ? "var(--accent-ink)" : "var(--ink-3)", letterSpacing: "0.02em" }}>
            {task.due}
          </span>
        )}
        <PriorityDot priority={task.priority} />
      </div>
    </li>
  );
}

function CompactRow({ task, onOpen, onToggle, hairlines, last, muted }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 2px",
      borderBottom: hairlines && !last ? "1px solid var(--line)" : "none",
      opacity: muted ? 0.55 : 1,
    }}>
      <Check checked={task.done} onChange={() => onToggle(task.id)} size={16} />
      <button
        onClick={() => onOpen(task.id)}
        style={{
          flex: 1, textAlign: "left",
          fontSize: 13.5,
          color: task.done ? "var(--ink-3)" : "var(--ink)",
          textDecoration: task.done ? "line-through" : "none",
          textDecorationColor: "var(--ink-4)",
          lineHeight: 1.35,
        }}
      >{task.title}</button>
      <PriorityDot priority={task.priority} />
    </div>
  );
}

/* ============================================================
   COMPOSER
   ============================================================ */
function Composer({ cadence, onAdd, compact }) {
  const [hover, setHover] = useState(false);
  const label = cadence === "once" ? "one-off" : cadence;
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onAdd(cadence)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: compact ? "10px 6px 8px" : "14px 6px",
        marginTop: compact ? 6 : 4,
        borderTop: compact ? "1px solid var(--line)" : "none",
        width: "100%", textAlign: "left",
        borderRadius: 6,
        color: hover ? "var(--ink)" : "var(--ink-3)",
        background: hover ? "var(--bg-sunken)" : "transparent",
        transition: "background 140ms ease, color 140ms ease",
        marginLeft: -6, marginRight: -6,
        paddingLeft: 6, paddingRight: 6,
      }}
    >
      <div style={{
        width: compact ? 16 : 18, height: compact ? 16 : 18,
        borderRadius: 5,
        border: `1.25px ${hover ? "solid var(--ink-3)" : "dashed var(--line-strong)"}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: hover ? "var(--ink-2)" : "var(--ink-4)",
        transition: "border-color 140ms ease, color 140ms ease",
      }}>
        <Icon name="plus" size={compact ? 10 : 12} color="currentColor" stroke={1.8} />
      </div>
      <span style={{
        flex: 1, fontSize: compact ? 13 : 15,
        fontStyle: "normal",
      }}>Add to {label}…</span>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: hover ? "var(--ink-3)" : "var(--ink-4)",
        opacity: hover ? 1 : 0.6,
        transition: "opacity 140ms ease, color 140ms ease",
      }}>open details ↗</span>
    </button>
  );
}

/* ============================================================
   SETTINGS MODAL
   ============================================================ */
function SettingsModal({ settings, patch, onClose }) {
  const isMobile = useMobile();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  const requestClose = () => {
    setClosing(true);
    setTimeout(onClose, 240);
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const shown = mounted && !closing;

  const [section, setSection] = useState("profile");

  return (
    <>
      <div
        onClick={requestClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(20,16,10,0.22)",
          opacity: shown ? 1 : 0,
          transition: "opacity 220ms ease, backdrop-filter 220ms ease",
          backdropFilter: shown ? "blur(10px) saturate(110%)" : "blur(0px)",
          WebkitBackdropFilter: shown ? "blur(10px) saturate(110%)" : "blur(0px)",
        }}
      />
      <div
        onClick={requestClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "center",
          padding: isMobile ? 0 : "min(8vh, 80px) 24px",
          pointerEvents: shown ? "auto" : "none",
        }}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          style={{
            width: isMobile ? "100%" : "min(720px, 100%)",
            maxHeight: "100%",
            background: "var(--bg)",
            border: isMobile ? "0" : "1px solid var(--line)",
            borderRadius: isMobile ? 0 : 16,
            boxShadow: shown && !isMobile
              ? "0 30px 80px -20px rgba(20,16,10,0.30), 0 8px 20px -10px rgba(20,16,10,0.18)"
              : "none",
            opacity: shown ? 1 : 0,
            transform: shown ? "scale(1) translateY(0)" : (isMobile ? "translateY(20px)" : "scale(0.97) translateY(8px)"),
            transition: "opacity 220ms ease, transform 260ms cubic-bezier(.22,.61,.36,1)",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "180px 1fr",
            gridTemplateRows: isMobile ? "auto 1fr" : "1fr",
            overflow: "hidden",
          }}
        >
          {/* Sidebar (mobile: top tab strip) */}
          <nav style={{
            background: "var(--bg-sunken)",
            borderRight: isMobile ? "0" : "1px solid var(--line)",
            borderBottom: isMobile ? "1px solid var(--line)" : "0",
            padding: isMobile ? "10px 12px" : "22px 14px",
            display: isMobile ? "flex" : "block",
            gap: isMobile ? 6 : 0,
            overflowX: isMobile ? "auto" : "visible",
          }}>
            {!isMobile && (
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: "var(--ink-3)", padding: "0 8px 14px",
              }}>settings</div>
            )}
            {[
              { id: "profile", label: "Profile" },
              { id: "scoring", label: "Performance scoring" },
            ].map((s) => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  style={{
                    width: isMobile ? "auto" : "100%", textAlign: "left",
                    padding: isMobile ? "7px 14px" : "8px 12px", borderRadius: isMobile ? 999 : 8,
                    marginBottom: isMobile ? 0 : 2,
                    background: active ? "var(--bg)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-2)",
                    fontSize: 13.5,
                    fontWeight: active ? 500 : 400,
                    border: active ? "1px solid var(--line)" : "1px solid transparent",
                    transition: "background 140ms ease, color 140ms ease",
                    whiteSpace: "nowrap", flex: "none",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >{s.label}</button>
              );
            })}
          </nav>

          {/* Content */}
          <div style={{ padding: isMobile ? "20px 18px" : "28px 32px", overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                  {section === "profile" ? "who you are" : "what counts toward your score"}
                </div>
                <h2 style={{
                  fontFamily: "var(--display)", fontWeight: 500,
                  fontSize: 32, lineHeight: 1, margin: 0, letterSpacing: "-0.03em",
                }}>
                  {section === "profile" ? "profile" : "performance scoring"}
                  <span style={{ color: "var(--accent)" }}>.</span>
                </h2>
              </div>
              <button
                onClick={requestClose}
                title="Close (Esc)"
                style={{ padding: 8, borderRadius: 8, color: "var(--ink-2)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              ><Icon name="close" size={18} /></button>
            </div>

            {section === "profile" ? (
              <ProfileSettings profile={settings.profile} patch={(p) => patch("profile", p)} />
            ) : (
              <ScoringSettings scoring={settings.scoring} patch={(p) => patch("scoring", p)} />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function ProfileSettings({ profile, patch }) {
  const palette = ["#c97a3c", "#3d3a35", "#6a8c5d", "#4a76b8", "#a85878", "#7a6cb8"];
  const [hover, setHover] = useState(false);
  const fileRef = useRef(null);
  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => patch({ photo: reader.result });
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 12 }}>
      {/* Avatar preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => fileRef.current && fileRef.current.click()}
          title="Upload photo"
          style={{
            position: "relative",
            width: 78, height: 78, borderRadius: 999,
            background: profile.color, /* ring color */
            padding: 3, flex: "none",
            cursor: "pointer",
            boxShadow: "0 0 0 1px var(--bg)",
            transition: "background 160ms ease",
          }}
        >
          <div style={{
            position: "relative",
            width: "100%", height: "100%", borderRadius: 999,
            overflow: "hidden",
            background: profile.photo ? "var(--bg)" : profile.color,
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.02em",
            border: "2px solid var(--bg)",
          }}>
            {profile.photo ? (
              <img
                src={profile.photo}
                alt="profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <span>{(profile.name || "?").trim().slice(0, 1).toUpperCase()}</span>
            )}
            {/* Hover overlay */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(20,16,10,0.55)",
              opacity: hover ? 1 : 0,
              transition: "opacity 160ms ease",
              color: "#fff",
              flexDirection: "column", gap: 3,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {profile.photo ? "change" : "upload"}
              </span>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            style={{ display: "none" }}
          />
        </div>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            ring color {profile.photo && "· photo set"}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => patch({ color: c })}
                title="Use this ring color"
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: c,
                  border: profile.color === c ? "2px solid var(--ink)" : "2px solid transparent",
                  boxShadow: profile.color === c ? "0 0 0 1px var(--bg)" : "none",
                  transition: "transform 120ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))}
            {profile.photo && (
              <button
                onClick={() => patch({ photo: null })}
                style={{
                  marginLeft: 4,
                  fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "var(--ink-3)",
                  padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >Remove photo</button>
            )}
          </div>
        </div>
      </div>

      <SettingsField label="Name" hint="how you'll be addressed">
        <input
          value={profile.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Your name"
          style={settingsInput}
        />
      </SettingsField>

      <SettingsField label="Email" hint="for reminders, eventually">
        <input
          value={profile.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder="you@example.com"
          style={settingsInput}
        />
      </SettingsField>
    </div>
  );
}

function ScoringSettings({ scoring, patch }) {
  const cadenceToggles = [
    { key: "includeDaily", label: "Daily tasks", hint: "the bread-and-butter, recommended" },
    { key: "includeWeekly", label: "Weekly tasks", hint: "count weeklies scheduled today" },
    { key: "includeMonthly", label: "Monthly tasks", hint: "rarely fire on any given day" },
    { key: "includeQuarterly", label: "Quarterly tasks", hint: "noisy when included" },
    { key: "includeOnce", label: "One-offs", hint: "off by default — they're ad-hoc" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--ink-3)", padding: "6px 0 10px",
      }}>What counts toward today's score</div>
      {cadenceToggles.map((t) => (
        <SettingsToggleRow
          key={t.key}
          label={t.label}
          hint={t.hint}
          value={scoring[t.key]}
          onChange={(v) => patch({ [t.key]: v })}
        />
      ))}

      <div style={{ height: 1, background: "var(--line)", margin: "16px 0 12px" }} />

      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--ink-3)", padding: "0 0 4px",
      }}>Streak</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--ink)" }}>Show flame at</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.02em" }}>
            tasks with this many in a row light up
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="range" min="1" max="30" step="1"
            value={scoring.streakThreshold}
            onChange={(e) => patch({ streakThreshold: Number(e.target.value) })}
            style={{ width: 140, accentColor: "var(--accent)" }}
          />
          <span style={{
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)",
            minWidth: 28, textAlign: "right",
          }}>{scoring.streakThreshold}</span>
        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      {children}
      {hint && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.02em" }}>{hint}</div>
      )}
    </label>
  );
}

const settingsInput = {
  fontSize: 14, color: "var(--ink)",
  padding: "10px 12px", borderRadius: 8,
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  outline: 0, width: "100%",
};

function SettingsToggleRow({ label, hint, value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 0", cursor: "pointer",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: "var(--ink)" }}>{label}</div>
        {hint && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.02em" }}>{hint}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={(e) => { e.stopPropagation(); onChange(!value); }}
      style={{
        width: 36, height: 22, borderRadius: 999,
        background: value ? "var(--accent)" : "var(--line-strong)",
        position: "relative",
        transition: "background 160ms ease",
        flex: "none",
      }}
    >
      <span style={{
        position: "absolute",
        top: 2, left: value ? 16 : 2,
        width: 18, height: 18, borderRadius: 999,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        transition: "left 200ms cubic-bezier(.22,.61,.36,1)",
      }} />
    </button>
  );
}

/* ============================================================
   DETAIL SHEET
   ============================================================ */
function DetailSheet({ task, closing, onClose, onChange, onToggle, onDelete, onSave }) {
  const settingsCtx = React.useContext(SettingsCtx);
  const isMobile = useMobile();
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  const shown = mounted && !closing;

  const addSub = (title) => {
    if (!title.trim()) return;
    onChange({ subtasks: [...task.subtasks, { id: uid(), title: title.trim(), done: false }] });
  };
  const toggleSub = (id) => onChange({
    subtasks: task.subtasks.map((s) => s.id === id ? { ...s, done: !s.done } : s),
  });
  const delSub = (id) => onChange({ subtasks: task.subtasks.filter((s) => s.id !== id) });

  const [newSub, setNewSub] = useState("");

  return (
    <>
      {/* Scrim — blurred backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(20,16,10,0.22)",
          opacity: shown ? 1 : 0,
          transition: "opacity 220ms ease, backdrop-filter 220ms ease",
          backdropFilter: shown ? "blur(10px) saturate(110%)" : "blur(0px)",
          WebkitBackdropFilter: shown ? "blur(10px) saturate(110%)" : "blur(0px)",
        }}
      />
      {/* Centered modal — full-bleed on mobile */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "center",
          padding: isMobile ? 0 : "min(8vh, 80px) 24px",
          pointerEvents: shown ? "auto" : "none",
        }}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          style={{
            width: isMobile ? "100%" : "min(580px, 100%)",
            maxHeight: "100%",
            background: "var(--bg)",
            border: isMobile ? "0" : "1px solid var(--line)",
            borderRadius: isMobile ? 0 : 16,
            boxShadow: shown && !isMobile
              ? "0 30px 80px -20px rgba(20,16,10,0.30), 0 8px 20px -10px rgba(20,16,10,0.18)"
              : "none",
            opacity: shown ? 1 : 0,
            transform: shown
              ? "scale(1) translateY(0)"
              : isMobile ? "translateY(20px)" : "scale(0.97) translateY(8px)",
            transformOrigin: "center 35%",
            transition: "opacity 220ms ease, transform 260ms cubic-bezier(.22,.61,.36,1)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
        {/* Header */}
        <div style={{ padding: "20px 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pill tone="accent">
              {task.cadence === "once"
                ? (task.due ? `on ${task.due.toLowerCase()}` : "one-off")
                : (CADENCES.find((c) => c.id === task.cadence)?.label.toLowerCase() || "task")}
            </Pill>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {task.isDraft ? "new task" : "detail"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {!task.isDraft && (
              <button
                onClick={onDelete}
                title="Delete"
                style={{ padding: 8, borderRadius: 8, color: "var(--ink-3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              ><Icon name="trash" size={16} /></button>
            )}
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{ padding: 8, borderRadius: 8, color: "var(--ink-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            ><Icon name="close" size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px 28px 80px" }}>
          {/* Title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div style={{ paddingTop: 8 }}>
              <Check checked={task.done} onChange={onToggle} size={22} />
            </div>
            <textarea
              ref={(el) => { if (el && !task.title) { setTimeout(() => { el.focus(); }, 320); } }}
              value={task.title}
              onChange={(e) => onChange({ title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && task.isDraft && task.title.trim()) {
                  e.preventDefault();
                  onSave && onSave();
                }
              }}
              placeholder="what's this task?"
              rows={1}
              style={{
                flex: 1,
                fontFamily: "var(--display)", fontWeight: 500,
                fontSize: 32, lineHeight: 1.15,
                letterSpacing: "-0.035em",
                color: task.done ? "var(--ink-3)" : "var(--ink)",
                textDecoration: task.done ? "line-through" : "none",
                textDecorationThickness: "1.5px",
                resize: "none", padding: 0,
                width: "100%",
              }}
            />
          </div>

          {/* Meta grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px 16px",
            padding: "16px 0",
            borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
            marginBottom: 24,
          }}>
            <MetaLabel icon="calendar">When</MetaLabel>
            <WhenField value={task.due} onChange={(v) => onChange({ due: v })} />

            <MetaLabel icon="calendar">Due on</MetaLabel>
            <DueOnField value={task.dueOn} onChange={(v) => onChange({ dueOn: v })} />

            <MetaLabel>Type</MetaLabel>
            <TypeField value={task.cadence} onChange={(v) => onChange({ cadence: v })} />

            <MetaLabel icon="user">Assignee</MetaLabel>
            <AssigneeField value={task.assignee} onChange={(v) => onChange({ assignee: v })} />

            <MetaLabel icon="flame">Streak</MetaLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 13 }}>
              <span style={{ color: task.streak >= (settingsCtx?.scoring?.streakThreshold ?? 3) ? "var(--accent-ink)" : "var(--ink-2)" }}>
                {task.streak > 0 ? `${task.streak} in a row` : "—"}
              </span>
              {task.streak >= 7 && <span style={{ color: "var(--ink-4)" }}>· strong</span>}
            </div>

            <MetaLabel>Priority</MetaLabel>
            <div style={{ display: "flex", gap: 6 }}>
              {["low", "med", "high"].map((p) => (
                <button
                  key={p}
                  onClick={() => onChange({ priority: p })}
                  style={{
                    fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
                    padding: "4px 10px", borderRadius: 999,
                    border: `0.75px solid ${task.priority === p ? "var(--accent)" : "var(--line)"}`,
                    background: task.priority === p ? "var(--accent-soft)" : "transparent",
                    color: task.priority === p ? "var(--accent-ink)" : "var(--ink-2)",
                    textTransform: "lowercase",
                  }}
                >{p}</button>
              ))}
            </div>

            <MetaLabel icon="tag">Tags</MetaLabel>
            <TagEditor tags={task.tags} onChange={(tags) => onChange({ tags })} />
          </div>

          {/* Notes */}
          <SectionHead>Notes</SectionHead>
          <textarea
            value={task.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="what does done look like? any context?"
            rows={3}
            style={{
              width: "100%", padding: "12px 14px",
              background: "var(--bg-elev)",
              border: "1px solid var(--line)", borderRadius: 10,
              fontSize: 14, lineHeight: 1.55, color: "var(--ink)",
              resize: "vertical", minHeight: 80,
              marginBottom: 28,
            }}
          />

          {/* Subtasks */}
          <SectionHead>
            Checklist
            <span style={{ marginLeft: 8, color: "var(--ink-4)" }}>
              {task.subtasks.length > 0 && `${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}`}
            </span>
          </SectionHead>
          <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0 }}>
            {task.subtasks.map((s) => (
              <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
                <Check checked={s.done} onChange={() => toggleSub(s.id)} size={15} />
                <span style={{
                  flex: 1, fontSize: 14,
                  color: s.done ? "var(--ink-3)" : "var(--ink-2)",
                  textDecoration: s.done ? "line-through" : "none",
                  textDecorationColor: "var(--ink-4)",
                }}>{s.title}</span>
                <button onClick={() => delSub(s.id)} style={{ color: "var(--ink-4)", opacity: 0.7 }}>
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <div style={{
              width: 15, height: 15, borderRadius: 4,
              border: "1.25px dashed var(--line-strong)",
            }} />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { addSub(newSub); setNewSub(""); } }}
              placeholder="add a step"
              style={{ flex: 1, fontSize: 14, color: "var(--ink-2)", padding: "2px 0" }}
            />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
            {task.isDraft ? (
              <>
                <button
                  onClick={onSave}
                  disabled={!task.title.trim()}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 999,
                    background: task.title.trim() ? "var(--accent)" : "var(--line)",
                    color: task.title.trim() ? "#fff" : "var(--ink-4)",
                    border: "1px solid transparent",
                    fontSize: 13.5, fontWeight: 500,
                    letterSpacing: "-0.005em",
                    cursor: task.title.trim() ? "pointer" : "not-allowed",
                    transition: "background 140ms ease",
                  }}
                >
                  {task.title.trim() ? `Save${task.due ? ` to ${task.due}` : ""}` : "Add a title to save"}
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "12px 18px", borderRadius: 999,
                    border: "1px solid var(--line)",
                    color: "var(--ink-2)", fontSize: 13.5,
                  }}
                >Discard</button>
              </>
            ) : (
              <>
                <button
                  onClick={onToggle}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 999,
                    background: task.done ? "transparent" : "var(--ink)",
                    color: task.done ? "var(--ink-2)" : "var(--bg)",
                    border: task.done ? "1px solid var(--line-strong)" : "1px solid var(--ink)",
                    fontSize: 13.5, fontWeight: 500,
                    letterSpacing: "-0.005em",
                    transition: "background 140ms ease",
                  }}
                >{task.done ? "Mark not done" : "Mark complete"}</button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "12px 18px", borderRadius: 999,
                    border: "1px solid var(--line)",
                    color: "var(--ink-2)", fontSize: 13.5,
                  }}
                >Close</button>
              </>
            )}
          </div>
        </div>
      </aside>
      </div>
    </>
  );
}

function MetaLabel({ icon, children }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontFamily: "var(--mono)", fontSize: 11,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color: "var(--ink-3)", paddingTop: 4,
    }}>
      {icon && <Icon name={icon} size={12} color="var(--ink-3)" />}
      {children}
    </div>
  );
}
function MetaEditable({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        fontSize: 14, color: "var(--ink)",
        padding: "3px 0", width: "100%",
      }}
    />
  );
}

/* ============================================================
   AVATAR
   ============================================================ */
function Avatar({ person, size = 22 }) {
  if (!person) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 999,
        border: "1.25px dashed var(--line-strong)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--ink-4)", fontFamily: "var(--mono)", fontSize: size * 0.42,
      }}>?</div>
    );
  }
  // Ring + inner pattern that mirrors the profile picture in settings.
  const ringPad = Math.max(1.5, size * 0.085);
  const gap = Math.max(1, Math.round(size * 0.05));
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: person.color,
      padding: ringPad,
      display: "inline-flex", flex: "none",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 999,
        background: person.photo ? "var(--bg)" : person.color,
        border: `${gap}px solid var(--bg)`,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff",
        fontFamily: "var(--mono)", fontSize: Math.max(8, size * 0.36), fontWeight: 500,
        letterSpacing: "0.02em",
      }}>
        {person.photo
          ? <img src={person.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : person.initials}
      </div>
    </div>
  );
}

/* ============================================================
   ASSIGNEE FIELD (popover)
   ============================================================ */
function AssigneeField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const people = useResolvedPeople();
  const person = people.find((x) => x.id === value) || null;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          padding: "4px 10px 4px 5px", marginLeft: -5,
          borderRadius: 999,
          fontSize: 13.5, color: person ? "var(--ink)" : "var(--ink-4)",
          transition: "background 140ms ease",
          background: open ? "var(--bg-sunken)" : "transparent",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "var(--bg-sunken)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <Avatar person={person} size={22} />
        <span>{person ? person.name : "unassigned"}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          minWidth: 220, padding: 6,
          background: "var(--bg-elev)", border: "1px solid var(--line)",
          borderRadius: 12, boxShadow: "0 18px 44px -18px rgba(20,16,10,0.22)",
        }}>
          <div style={{ padding: "6px 10px 8px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            Assign to
          </div>
          {people.map((p) => {
            const active = p.id === value;
            return (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 10px", borderRadius: 8,
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent-ink)" : "var(--ink-2)",
                  fontSize: 13.5, textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-sunken)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <Avatar person={p} size={22} />
                <span style={{ flex: 1 }}>{p.name}</span>
                {active && <Icon name="more" size={4} color="var(--accent)" />}
              </button>
            );
          })}
          {value && (
            <>
              <div style={{ height: 1, background: "var(--line)", margin: "6px 4px" }} />
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 10px", borderRadius: 8, fontSize: 13.5,
                  color: "var(--ink-3)", textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Avatar person={null} size={22} />
                <span>Unassign</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   WHEN FIELD (mini-calendar popover)
   ============================================================ */
function parseLooseDate(s) {
  if (!s) return null;
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t);
  // try "Mar 15" w/ current year
  const m = String(s).match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/);
  if (m) {
    const t2 = Date.parse(`${m[1]} ${m[2]}, ${new Date().getFullYear()}`);
    if (!isNaN(t2)) return new Date(t2);
  }
  return null;
}
function formatDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function WhenField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const parsed = parseLooseDate(value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "4px 10px", marginLeft: -10,
          borderRadius: 6,
          fontSize: 14, color: value ? "var(--ink)" : "var(--ink-4)",
          background: open ? "var(--bg-sunken)" : "transparent",
          transition: "background 140ms ease",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "var(--bg-sunken)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <span>{value || "+ set a date"}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: -10, zIndex: 100,
        }}>
          <MiniCalendar
            value={parsed}
            onPick={(d) => { onChange(formatDate(d)); setOpen(false); }}
            onClear={() => { onChange(""); setOpen(false); }}
            onCustom={(v) => { onChange(v); setOpen(false); }}
            current={value}
          />
        </div>
      )}
    </div>
  );
}

function DueOnField({ value, onChange }) {
  // value is an ISO yyyy-mm-dd string or empty.
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const date = value ? new Date(value + "T00:00:00") : null;
  const label = date && !isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "+ pick a deadline";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "4px 10px", marginLeft: -10,
          borderRadius: 6,
          fontSize: 14, color: value ? "var(--ink)" : "var(--ink-4)",
          background: open ? "var(--bg-sunken)" : "transparent",
          transition: "background 140ms ease",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "var(--bg-sunken)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <span>{label}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: -10, zIndex: 100 }}>
          <MiniCalendar
            value={date}
            onPick={(d) => { onChange(isoDate(d)); setOpen(false); }}
            onClear={() => { onChange(""); setOpen(false); }}
            onCustom={() => {}}
            current=""
            hideFreeform
          />
        </div>
      )}
    </div>
  );
}

function TypeField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const opts = [
    { id: "once", label: "Once", note: "one-off, not scored" },
    { id: "daily", label: "Daily", note: "every day" },
    { id: "weekly", label: "Weekly", note: "every week" },
    { id: "monthly", label: "Monthly", note: "every month" },
    { id: "quarterly", label: "Quarterly", note: "every quarter" },
  ];
  const cur = opts.find((o) => o.id === value) || opts[0];

  const dotColor = {
    once: "var(--ink-3)",
    daily: "oklch(0.55 0.10 60)",
    weekly: "oklch(0.55 0.10 220)",
    monthly: "oklch(0.55 0.10 290)",
    quarterly: "oklch(0.55 0.12 30)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          padding: "4px 10px 4px 10px", marginLeft: -10,
          borderRadius: 6,
          fontSize: 14, color: "var(--ink)",
          background: open ? "var(--bg-sunken)" : "transparent",
          transition: "background 140ms ease",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "var(--bg-sunken)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: dotColor[cur.id], flex: "none" }} />
        <span style={{ lowercase: "true" }}>{cur.label.toLowerCase()}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: -10, zIndex: 100,
          minWidth: 240, padding: 6,
          background: "var(--bg-elev)", border: "1px solid var(--line)",
          borderRadius: 12, boxShadow: "0 18px 44px -18px rgba(20,16,10,0.22)",
        }}>
          <div style={{ padding: "6px 10px 8px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            Task type
          </div>
          {opts.map((o) => {
            const active = o.id === cur.id;
            return (
              <button
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 8,
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent-ink)" : "var(--ink-2)",
                  fontSize: 13.5, textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-sunken)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor[o.id], flex: "none" }} />
                <span style={{ flex: 1 }}>{o.label.toLowerCase()}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em",
                  color: active ? "var(--accent-ink)" : "var(--ink-4)",
                  opacity: 0.85,
                }}>{o.note}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniCalendar({ value, onPick, onClear, onCustom, current, hideFreeform }) {
  const today = new Date();
  const [view, setView] = useState(() => value || new Date());
  const [custom, setCustom] = useState(current || "");

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const same = (a, b) => a && b && a.toDateString() === b.toDateString();

  const navBtn = {
    width: 24, height: 24, borderRadius: 6,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    color: "var(--ink-2)",
  };

  return (
    <div style={{
      width: 256, padding: 14,
      background: "var(--bg-elev)", border: "1px solid var(--line)",
      borderRadius: 12, boxShadow: "0 18px 44px -18px rgba(20,16,10,0.22)",
    }}>
      {/* Month nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => setView(new Date(year, month - 1, 1))} style={navBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, letterSpacing: "-0.01em" }}>{monthLabel}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} style={navBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", marginBottom: 4, letterSpacing: "0.04em" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", padding: "4px 0", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isToday = same(d, today);
          const isSel = same(d, value);
          return (
            <button
              key={i}
              onClick={() => onPick(d)}
              style={{
                padding: "7px 0", fontSize: 12.5, borderRadius: 7,
                fontFamily: "var(--mono)",
                background: isSel ? "var(--accent)" : "transparent",
                color: isSel ? "#fff" : isToday ? "var(--accent-ink)" : "var(--ink-2)",
                fontWeight: isToday ? 600 : 400,
                border: isToday && !isSel ? "1px solid var(--accent-soft)" : "1px solid transparent",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--bg-sunken)"; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
            >{d.getDate()}</button>
          );
        })}
      </div>

      {/* Custom freeform */}
      {!hideFreeform && (
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) onCustom(custom.trim()); }}
          placeholder="or type — e.g. every Friday"
          style={{
            width: "100%", padding: "6px 8px", borderRadius: 6,
            background: "var(--bg-sunken)", fontSize: 12, color: "var(--ink-2)",
            fontFamily: "var(--mono)",
          }}
        />
      </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
        <button onClick={() => onPick(new Date())} style={{
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--ink-2)",
          padding: "5px 9px", borderRadius: 6,
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >Today</button>
        <button onClick={onClear} style={{
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--ink-3)",
          padding: "5px 9px", borderRadius: 6,
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >Clear</button>
      </div>
    </div>
  );
}
function SectionHead({ children }) {
  return (
    <h3 style={{
      fontFamily: "var(--mono)", fontSize: 10.5,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--ink-3)", margin: "0 0 10px",
      fontWeight: 500,
    }}>{children}</h3>
  );
}

function TagEditor({ tags, onChange }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim().toLowerCase().replace(/\s+/g, "-");
    if (!v || tags.includes(v)) { setVal(""); return; }
    onChange([...tags, v]); setVal("");
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {tags.map((t) => (
        <button key={t} onClick={() => onChange(tags.filter((x) => x !== t))} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.02em",
          padding: "2px 8px", borderRadius: 999,
          background: "var(--bg-sunken)", color: "var(--ink-2)",
        }}>
          {t}<Icon name="close" size={9} color="var(--ink-3)" />
        </button>
      ))}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder={tags.length ? "+ tag" : "add tag…"}
        style={{ fontSize: 12.5, fontFamily: "var(--mono)", padding: "2px 6px", minWidth: 60, color: "var(--ink-2)" }}
      />
    </div>
  );
}

/* ============================================================
   MOUNT
   ============================================================ */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
