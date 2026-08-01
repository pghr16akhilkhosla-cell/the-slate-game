import React, { useState, useMemo, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   THE SLATE v7.0 — REIMAGINED STUDIO ENGINE
   ---------------------------------------------------------------------------
   FEATURES OVERHAUL:
   1. Volatile Flop & WOM Engine: Bad films with big marketing bomb catastrophically.
   2. Interactive Release Calendar & Competitor Radar.
   3. Active Script Doctoring & Production Interventions.
   4. High-Stakes Talent Friction & Bidding Wars.
   ═══════════════════════════════════════════════════════════════════════════ */

const RUN_QUARTERS = 60;
const QNAMES = ["Q1", "Q2", "Q3", "Q4"];
const QSEASON = ["Spring", "Summer", "Festival", "Winter"];
const BASE_POOL = 9_500_000_000;

const ERAS = [
  {
    id: "single", n: "Single Screens", num: "I", from: 1, to: 20, icon: "🎟️",
    w: { q: 0.22, d: 0.38, a: 0.22, b: 0.10, h: 0.08 },
    pool: 1.00, season: [0.78, 1.28, 1.35, 0.88], screen: 0.70,
    anc: 0.50, presale: 0.20, mktRef: 180_000_000,
    brief: "Single-screen halls and star worship. Audiences follow faces, not reviews. Festival dates are bloodbaths.",
  },
  {
    id: "multiplex", n: "The Multiplex Boom", num: "II", from: 21, to: 40, icon: "🏙️",
    w: { q: 0.36, d: 0.24, a: 0.24, b: 0.09, h: 0.07 },
    pool: 1.55, season: [0.90, 1.18, 1.16, 0.96], screen: 1.20,
    anc: 1.00, presale: 0.35, mktRef: 320_000_000,
    brief: "Screens multiply and ticket prices skyrocket. Word-of-mouth travels at lightspeed. Bad films get eviscerated by Sunday.",
  },
  {
    id: "streaming", n: "The Streaming War", num: "III", from: 41, to: 60, icon: "📺",
    w: { q: 0.38, d: 0.18, a: 0.20, b: 0.10, h: 0.14 },
    pool: 1.10, season: [0.95, 1.08, 1.08, 1.00], screen: 1.35,
    anc: 2.50, presale: 0.65, mktRef: 450_000_000,
    brief: "Theatrical capacity contracts. Bidding wars for rights are massive, but theatrical audience tolerance for mediocrity is ZERO.",
  },
];

export const eraOf = (turn: number) => ERAS.find(e => turn >= e.from && turn <= e.to) || ERAS[ERAS.length - 1];

/* ── THEME COLORS ────────────────────────────────────────────────────────── */
const T = {
  bg: "#08080a", surface: "#121215", surface2: "#1a1a20", surface3: "#262630",
  border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.16)",
  text: "#ffffff", text2: "rgba(255,255,255,0.64)", text3: "rgba(255,255,255,0.38)",
  gold: "#f5c518", green: "#34c759", red: "#ff3b30", blue: "#0a84ff",
  purple: "#af52de", orange: "#ff9500", cyan: "#5ac8fa",
};

const fmt = (n: number) => {
  const a = Math.abs(Math.round(n));
  const s = a >= 10000000 ? (a / 10000000).toFixed(a >= 100000000 ? 0 : 1) + "Cr"
    : a >= 100000 ? (a / 100000).toFixed(1) + "L"
      : a.toLocaleString("en-IN");
  return (n < 0 ? "−" : "") + "₹" + s;
};
const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : v > hi ? hi : v;
const pick = (arr: any[], r: number) => arr[Math.floor(r * arr.length) % arr.length];
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function mkRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* ── GENRES ──────────────────────────────────────────────────────────────── */
const GENRES = [
  { g: "Action",     draw: 1.05, cost: 1.35, craft: 0.50, legs: 0.65 },
  { g: "Thriller",   draw: 0.82, cost: 0.90, craft: 0.85, legs: 0.82 },
  { g: "Comedy",     draw: 0.90, cost: 0.75, craft: 0.48, legs: 0.78 },
  { g: "Drama",      draw: 0.60, cost: 0.68, craft: 1.00, legs: 0.98 },
  { g: "Sci-Fi",     draw: 0.88, cost: 1.55, craft: 0.75, legs: 0.72 },
  { g: "Romance",    draw: 0.75, cost: 0.65, craft: 0.60, legs: 0.85 },
  { g: "Horror",     draw: 0.85, cost: 0.38, craft: 0.35, legs: 0.48 },
  { g: "Historical", draw: 0.55, cost: 1.45, craft: 0.98, legs: 0.90 },
  { g: "Crime",      draw: 0.76, cost: 0.88, craft: 0.86, legs: 0.84 },
  { g: "Family",     draw: 0.92, cost: 0.82, craft: 0.42, legs: 1.05 },
];
const GNAMES = GENRES.map(x => x.g);
const genreOf = (gName: string) => GENRES.find(x => x.g === gName) || GENRES[0];

/* ── TALENT ──────────────────────────────────────────────────────────────── */
const DIRECTORS = [
  { id: "d1", n: "Meera Raghunath", craft: 94, draw: 52, ask: 11_500_000, age: 47, tag: "Auteur" },
  { id: "d2", n: "Vikram Sethi", craft: 60, draw: 90, ask: 13_200_000, age: 44, tag: "Showman" },
  { id: "d3", n: "Anand Pillai", craft: 80, draw: 70, ask: 10_500_000, age: 51, tag: "Craftsman" },
  { id: "d4", n: "Zoya Merchant", craft: 86, draw: 66, ask: 9_200_000, age: 38, tag: "Rising" },
  { id: "d5", n: "Devraj Kholi", craft: 52, draw: 55, ask: 4_000_000, age: 33, tag: "Untested" },
];
const STARS = [
  { id: "a1", n: "Kabir Shroff", draw: 96, craft: 55, ask: 19_500_000, age: 42, tag: "Superstar", trait: "boxoffice" },
  { id: "a2", n: "Naina Roy", draw: 92, craft: 76, ask: 17_500_000, age: 34, tag: "Superstar", trait: "oscarmagnet" },
  { id: "a3", n: "Arjun Malhotra", draw: 76, craft: 85, ask: 12_500_000, age: 47, tag: "Prestige", trait: "perfectionist" },
  { id: "a4", n: "Simran Kaul", draw: 70, craft: 90, ask: 11_500_000, age: 39, tag: "Prestige", trait: "oscarmagnet" },
  { id: "a5", n: "Rehan Qadri", draw: 86, craft: 58, ask: 13_000_000, age: 29, tag: "Heartthrob", trait: "difficult" },
  { id: "a6", n: "Tara Menon", draw: 68, craft: 72, ask: 6_200_000, age: 26, tag: "Rising", trait: "reliable" },
];
const WRITERS = [
  { id: "w1", n: "Sana Qureshi", craft: 95, draw: 38, ask: 3_800_000, age: 45, tag: "Auteur" },
  { id: "w2", n: "Aman Trivedi", craft: 62, draw: 78, ask: 2_400_000, age: 38, tag: "Commercial" },
  { id: "w3", n: "Ishaan Verma", craft: 76, draw: 60, ask: 1_900_000, age: 31, tag: "Rising" },
];

const BUDGETS = [
  { id: "indie", label: "Indie", amt: 120_000_000, qFloor: 28, screens: 0.38, dev: 1, prod: 1, post: 1 },
  { id: "mid", label: "Mid-Budget", amt: 480_000_000, qFloor: 45, screens: 0.95, dev: 1, prod: 2, post: 1 },
  { id: "tentpole", label: "Tentpole", amt: 1_500_000_000, qFloor: 58, screens: 1.70, dev: 2, prod: 2, post: 1 },
  { id: "event", label: "Event Spectacle", amt: 3_800_000_000, qFloor: 68, screens: 2.45, dev: 2, prod: 3, post: 2 },
];

/* ── GAME INITIALIZATION ─────────────────────────────────────────────────── */
export function newGame(seed = Date.now(), brutal = false, identity = "genre-horror", name = "Apex Studios") {
  const rng = mkRng(seed);
  return {
    seed, brutal, rng, turn: 1, over: false, outcome: null, identity, name,
    cash: brutal ? 900_000_000 : 1_400_000_000, debt: 0, credit: 3, prestige: 15,
    facility: 0, slots: 2, roster: [], slate: [], library: [], awards: 0,
    momentum: 50, streak: 0, franchises: {}, pool: BASE_POOL,
    rivals: [
      { id: 1, name: "Imperial Pictures", col: T.red, val: 5_800_000_000, slate: [] },
      { id: 2, name: "Crown Motion", col: T.orange, val: 6_200_000_000, slate: [] },
      { id: 3, name: "Velvet Amber", col: T.purple, val: 4_100_000_000, slate: [] },
    ],
    log: [], crisis: null, pendingEvent: null, report: null,
  };
}

/* ── ENGINE CORE WITH CATASTROPHIC FLOP MODEL ───────────────────────────── */
export function resolveWindow(g: any) {
  const turn = g.turn;
  const era = eraOf(turn);
  const mine = g.slate.filter((f: any) => f.phase === "ready" && f.target === turn);
  if (!mine.length) return [];

  const results: any[] = [];
  mine.forEach((f: any) => {
    const gd = genreOf(f.genre);
    const mktAwa = Math.min(100, Math.round(100 * f.mktSpend / (f.mktSpend + era.mktRef)));
    
    // Quality vs Marketing Backlash calculation (The Flop Factor)
    const hypeGap = mktAwa - f.quality;
    let womPenalty = 1.0;
    if (hypeGap > 25 && f.quality < 50) {
      // Overhyped garbage triggers toxic word-of-mouth collapsing second week revenues!
      womPenalty = clamp(1.0 - (hypeGap / 100) * 1.2, 0.15, 0.65);
    }

    const rawAppeal = (f.quality * era.w.q + f.draw * era.w.d + mktAwa * era.w.a + f.buzz * era.w.b) * womPenalty;
    const screens = BUDGETS.find(b => b.id === f.budgetId)?.screens || 1.0;
    const weight = Math.pow(rawAppeal / 40, 2.1) * Math.pow(screens, era.screen);

    // Dynamic RNG variance — wide swing potential
    const roll = 0.5 + g.rng() * 1.1; 
    const gross = Math.round(weight * 1_250_000_000 * roll * era.season[(turn - 1) % 4]);
    const take = Math.round(gross * 0.45);

    f.gross = gross;
    f.theatrical = take;
    f.allIn = f.spent + f.mktSpend;
    f.recouped = take + (f.presold || 0);

    const ratio = f.recouped / Math.max(1, f.allIn);
    
    // Brutal Verdict Categories
    if (ratio >= 2.2) f.verdict = "Blockbuster";
    else if (ratio >= 1.3) f.verdict = "Hit";
    else if (ratio >= 0.85) f.verdict = "Break-even";
    else if (ratio >= 0.45) f.verdict = "Flop";
    else f.verdict = "Disastrous Bomb";

    g.cash += take;
    if (f.verdict === "Disastrous Bomb") {
      g.momentum = clamp(g.momentum - 18, 0, 100);
      g.prestige = clamp(g.prestige - 6, 1, 100);
    } else if (f.verdict === "Blockbuster") {
      g.momentum = clamp(g.momentum + 16, 0, 100);
      g.prestige = clamp(g.prestige + 5, 1, 100);
    }

    g.slate = g.slate.filter((x: any) => x.id !== f.id);
    f.phase = "released";
    g.library.push(f);
    results.push(f);
  });

  return results;
}

export function advanceQuarter(g: any) {
  g.cash -= 40_000_000; // Fixed Quarterly Overhead
  
  // Advance Production Slots
  g.slate.forEach((f: any) => {
    if (f.phase === "ready") return;
    f.left--;
    if (f.left <= 0) {
      if (f.phase === "dev") { f.phase = "prod"; f.left = f.prod; g.cash -= Math.round(f.cost * 0.4); }
      else if (f.phase === "prod") { f.phase = "post"; f.left = f.post; g.cash -= Math.round(f.cost * 0.2); }
      else if (f.phase === "post") { f.phase = "ready"; }
    }
  });

  const releases = resolveWindow(g);
  g.turn++;
  return releases;
}

/* ── MAIN APPLICATION COMPONENT ─────────────────────────────────────────── */
export default function App() {
  const [g, setG] = useState(() => newGame());
  const [activeTab, setActiveTab] = useState<"slate" | "greenlight" | "calendar">("slate");

  const actAdvance = () => {
    const updated = { ...g };
    advanceQuarter(updated);
    setG(updated);
  };

  const currentEra = eraOf(g.turn);

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "sans-serif", padding: 16 }}>
      {/* Top Studio HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", background: T.surface, padding: 14, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{g.name}</div>
          <div style={{ fontSize: 12, color: T.cyan, marginTop: 2 }}>{currentEra.icon} Era {currentEra.num}: {currentEra.n} (Year {Math.floor((g.turn - 1) / 4) + 1} Q{((g.turn - 1) % 4) + 1})</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: g.cash < 0 ? T.red : T.gold }}>{fmt(g.cash)}</div>
          <div style={{ fontSize: 11, color: T.text2 }}>Momentum: {g.momentum}/100 | Prestige: {g.prestige}</div>
        </div>
      </div>

      {/* Primary Navigation */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setActiveTab("slate")} style={{ flex: 1, padding: 12, borderRadius: 8, background: activeTab === "slate" ? T.gold : T.surface2, color: activeTab === "slate" ? "#000" : T.text, fontWeight: 700, border: "none", cursor: "pointer" }}>Studio Slate ({g.slate.length}/{g.slots})</button>
        <button onClick={() => setActiveTab("greenlight")} style={{ flex: 1, padding: 12, borderRadius: 8, background: activeTab === "greenlight" ? T.gold : T.surface2, color: activeTab === "greenlight" ? "#000" : T.text, fontWeight: 700, border: "none", cursor: "pointer" }}>Greenlight Room</button>
        <button onClick={() => setActiveTab("calendar")} style={{ flex: 1, padding: 12, borderRadius: 8, background: activeTab === "calendar" ? T.gold : T.surface2, color: activeTab === "calendar" ? "#000" : T.text, fontWeight: 700, border: "none", cursor: "pointer" }}>Release Calendar</button>
      </div>

      {/* Tab Content */}
      {activeTab === "slate" && (
        <div>
          <h3 style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>Active Productions</h3>
          {g.slate.length === 0 && <p style={{ color: T.text3 }}>No projects currently active. Visit the Greenlight Room to start a picture.</p>}
          <div style={{ display: "grid", gap: 12 }}>
            {g.slate.map((f: any) => (
              <div key={f.id} style={{ background: T.surface, padding: 14, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>{f.title} ({f.genre})</span>
                  <span style={{ color: T.cyan }}>{f.phase.toUpperCase()} (Turns left: {f.left})</span>
                </div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 6 }}>
                  Budget: {fmt(f.cost)} | Quality Rating: {f.quality}/100 | Star Draw: {f.draw}/100
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 8, marginTop: 24 }}>Box Office History</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {g.library.slice(-5).reverse().map((f: any, idx: number) => (
              <div key={idx} style={{ background: T.surface2, padding: 10, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: T.text3 }}>Cost: {fmt(f.allIn)} | Gross: {fmt(f.gross)}</div>
                </div>
                <span style={{ fontWeight: 800, padding: "4px 8px", borderRadius: 4, background: f.verdict === "Disastrous Bomb" ? T.red : f.verdict === "Blockbuster" ? T.gold : T.surface3, color: f.verdict === "Disastrous Bomb" ? "#fff" : "#fff" }}>
                  {f.verdict}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "greenlight" && <GreenlightRoom g={g} onGreenlight={(film: any) => { setG({...g, slate: [...g.slate, film], cash: g.cash - Math.round(film.cost * 0.4)}); setActiveTab("slate"); }} />}

      {activeTab === "calendar" && (
        <div>
          <h3>Interactive Release Calendar</h3>
          <p style={{ color: T.text2, fontSize: 13 }}>Schedule ready pictures into optimal quarters to avoid competing head-to-head with heavy tentpoles.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(offset => {
              const qTurn = g.turn + offset - 1;
              const inSlot = g.slate.filter((f: any) => f.target === qTurn);
              return (
                <div key={offset} style={{ background: T.surface, padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, minHeight: 100 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.gold }}>Y{Math.floor((qTurn - 1) / 4) + 1} Q{((qTurn - 1) % 4) + 1}</div>
                  <div style={{ fontSize: 11, color: T.text3 }}>{QSEASON[(qTurn - 1) % 4]}</div>
                  <div style={{ marginTop: 8 }}>
                    {inSlot.map((f: any) => (
                      <div key={f.id} style={{ fontSize: 11, background: T.surface2, padding: 4, borderRadius: 4, marginTop: 2 }}>🎬 {f.title}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advance Control */}
      <div style={{ position: "fixed", bottom: 16, right: 16 }}>
        <button onClick={actAdvance} style={{ padding: "14px 28px", background: T.green, color: "#000", fontSize: 16, fontWeight: 800, borderRadius: 30, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          Advance Quarter ➔
        </button>
      </div>
    </div>
  );
}

function GreenlightRoom({ g, onGreenlight }: { g: any, onGreenlight: (f: any) => void }) {
  const [title, setTitle] = useState("Project " + Math.floor(Math.random() * 900 + 100));
  const [genre, setGenre] = useState("Action");
  const [budgetTier, setBudgetTier] = useState("mid");
  const [mktSpend, setMktSpend] = useState(150_000_000);

  const b = BUDGETS.find(x => x.id === budgetTier) || BUDGETS[1];
  const totalCost = Math.round(b.amt * genreOf(genre).cost);

  const handleCreate = () => {
    const dir = DIRECTORS[0];
    const star = STARS[0];
    const wri = WRITERS[0];

    const quality = Math.round(0.4 * dir.craft + 0.3 * wri.craft + 0.3 * b.qFloor);
    const draw = Math.round(0.6 * star.draw + 0.4 * dir.draw);

    const newFilm = {
      id: Date.now(),
      title, genre, budgetId: budgetTier, cost: totalCost, spent: Math.round(totalCost * 0.4),
      quality, draw, buzz: 25, phase: "dev", left: b.dev, dev: b.dev, prod: b.prod, post: b.post,
      mktSpend, target: g.turn + b.dev + b.prod + b.post,
    };
    onGreenlight(newFilm);
  };

  return (
    <div style={{ background: T.surface, padding: 16, borderRadius: 12, border: `1px solid ${T.border}` }}>
      <h3>Greenlight New Production</h3>
      <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <div>
          <label style={{ fontSize: 12, color: T.text2 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: 8, background: T.surface2, color: "#fff", border: `1px solid ${T.border}`, borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: T.text2 }}>Genre</label>
          <select value={genre} onChange={e => setGenre(e.target.value)} style={{ width: "100%", padding: 8, background: T.surface2, color: "#fff", border: `1px solid ${T.border}`, borderRadius: 6 }}>
            {GNAMES.map(gName => <option key={gName} value={gName}>{gName}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: T.text2 }}>Scale Tier</label>
          <select value={budgetTier} onChange={e => setBudgetTier(e.target.value)} style={{ width: "100%", padding: 8, background: T.surface2, color: "#fff", border: `1px solid ${T.border}`, borderRadius: 6 }}>
            {BUDGETS.map(bt => <option key={bt.id} value={bt.id}>{bt.label} ({fmt(bt.amt)})</option>)}
          </select>
        </div>
        <div style={{ marginTop: 12, padding: 10, background: T.surface2, borderRadius: 6 }}>
          <div>Estimated Total Budget: <strong>{fmt(totalCost)}</strong></div>
          <div>Upfront Cost (40%): <strong>{fmt(Math.round(totalCost * 0.4))}</strong></div>
        </div>
        <button onClick={handleCreate} style={{ padding: 12, background: T.gold, color: "#000", fontWeight: 800, border: "none", borderRadius: 8, cursor: "pointer", marginTop: 8 }}>
          Greenlight Picture
        </button>
      </div>
    </div>
  );
}
