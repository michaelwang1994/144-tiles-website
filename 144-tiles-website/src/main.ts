import { playhtml } from "playhtml";
import { prepareWithSegments, layoutNextLineRange, materializeLineRange, type LayoutCursor } from "@chenglou/pretext";

const TILE_W = 32;
const TILE_H = 44;
const GAP = 4;
const COLS = 16;
const BOARD_W = 1200;
const BOARD_H = 800;

const suited = [
  ...Array.from({ length: 9 }, (_, i) => `MJ${i + 1}wan`),
  ...Array.from({ length: 9 }, (_, i) => `MJ${i + 1}tiao`),
  ...Array.from({ length: 9 }, (_, i) => `MJ${i + 1}bing`),
];
const honors = [
  "MJEastwind", "MJSouthwind", "MJWestwind", "MJNorthwind",
  "MJGreenarcher", "MJRedarcher", "MJWhitearcher",
];
const flowers = [
  "MJmei", "MJlan", "MJju", "MJzhu",
  "MJspring", "MJsummer", "MJautumn", "MJwinter",
];

const allTiles = [
  ...[...suited, ...honors].flatMap((name) =>
    Array.from({ length: 4 }, (_, i) => ({ svg: name, id: `${name}-${i}` }))
  ),
  ...flowers.map((name) => ({ svg: name, id: `${name}-0` })),
];

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const tiles = [...allTiles].sort(() => rng() - 0.5);

const ROWS = Math.ceil(tiles.length / COLS);

// Center the initial grid on the board
const GRID_W = COLS * (TILE_W + GAP) + GAP;
const GRID_H = ROWS * (TILE_H + GAP) + GAP;
const GRID_X = Math.floor((BOARD_W - GRID_W) / 2);
const GRID_Y = Math.floor((BOARD_H - GRID_H) / 2);

const TEXT = "Chow: form a sequence of 3 suit tiles by taking the last discarded tile from the player to your left.\nPung: form a set of 3 identical tiles by taking the last discarded tile from any player.";
const TEXT_FONT = "14px Arial";
const TEXT_LINE_H = 22;
const TEXT_PAD = 14;
const TEXT_MAX_Y = GRID_Y;
const textPrepared = prepareWithSegments(TEXT, TEXT_FONT, { whiteSpace: "pre-wrap" });
let textLineEls: HTMLDivElement[] = [];

type Pt = { x: number; y: number };
const pos = new Map<string, Pt>();

function clamp(p: Pt): Pt {
  return {
    x: Math.max(0, Math.min(BOARD_W - TILE_W, p.x)),
    y: Math.max(0, Math.min(BOARD_H - TILE_H, p.y)),
  };
}

// Returns the vector to move `b` out of `a` using minimum-overlap axis.
// Returns null if they don't overlap.
function pushVec(a: Pt, b: Pt): Pt | null {
  const ox = Math.min(a.x + TILE_W, b.x + TILE_W) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + TILE_H, b.y + TILE_H) - Math.max(a.y, b.y);
  if (ox <= 0 || oy <= 0) return null;
  const bRight = b.x + TILE_W / 2 >= a.x + TILE_W / 2;
  const bBelow = b.y + TILE_H / 2 >= a.y + TILE_H / 2;
  return ox <= oy
    ? { x: bRight ? ox : -ox, y: 0 }
    : { x: 0, y: bBelow ? oy : -oy };
}

// After an initial push, nudge `id` out of any overlap with already-settled
// tiles. Settled tiles don't move, so this always converges — no oscillation.
function settleAgainst(id: string, settled: Set<string>): void {
  for (let i = 0; i < 50; i++) {
    const p = pos.get(id)!;
    let moved = false;
    for (const otherId of settled) {
      const q = pos.get(otherId)!;
      const v = pushVec(q, p);
      if (!v) continue;
      pos.set(id, clamp({ x: p.x + v.x, y: p.y + v.y }));
      moved = true;
      break;
    }
    if (!moved) break;
  }
}

// BFS outward from the dragged tile. Each tile is settled exactly once, so it
// can never be pushed back — this makes the algorithm jitter-free.
// Before settling a tile, we call settleAgainst to resolve any pile-ups caused
// by multiple tiles being pushed to the same spot.
function resolveAll(draggedId: string): void {
  const settled = new Set<string>([draggedId]);
  const queue: string[] = [draggedId];

  while (queue.length > 0) {
    const fromId = queue.shift()!;
    const from = pos.get(fromId)!;

    for (const [toId] of pos) {
      if (settled.has(toId)) continue;
      const to = pos.get(toId)!;
      const v = pushVec(from, to);
      if (!v) continue;
      pos.set(toId, clamp({ x: to.x + v.x, y: to.y + v.y }));
      settleAgainst(toId, settled);
      settled.add(toId);
      queue.push(toId);
    }
  }
}

// After BFS, the dragged tile may still overlap tiles that were clamped to the
// board edge and couldn't move away. Sweep all tiles per pass (no break) so
// opposing pushes accumulate correctly rather than oscillating.
function constrainDragged(draggedId: string): void {
  for (let i = 0; i < 20; i++) {
    let p = pos.get(draggedId)!;
    const x0 = p.x, y0 = p.y;
    for (const [otherId, q] of pos) {
      if (otherId === draggedId) continue;
      const v = pushVec(q, p);
      if (!v) continue;
      p = clamp({ x: p.x + v.x, y: p.y + v.y });
    }
    pos.set(draggedId, p);
    if (p.x === x0 && p.y === y0) break; // stable — no net movement
  }
}

function renderText(): void {
  let cur: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let lineY = TEXT_PAD;
  let lineIdx = 0;

  while (lineY + TEXT_LINE_H <= TEXT_MAX_Y && lineIdx < textLineEls.length) {
    const rowBot = lineY + TEXT_LINE_H;

    // Collect tile x-extents that overlap this text row
    const obs: [number, number][] = [];
    for (const [, p] of pos) {
      if (p.y < rowBot && p.y + TILE_H > lineY) obs.push([p.x, p.x + TILE_W]);
    }
    obs.sort((a, b) => a[0] - b[0]);

    // Find gaps between obstacles and pick the widest one
    const gaps: { x: number; w: number }[] = [];
    let gx = TEXT_PAD;
    for (const [ox1, ox2] of obs) {
      if (ox1 > gx) gaps.push({ x: gx, w: ox1 - gx });
      gx = Math.max(gx, ox2);
    }
    if (BOARD_W - TEXT_PAD - gx > 0) gaps.push({ x: gx, w: BOARD_W - TEXT_PAD - gx });
    const gap = gaps.length > 0
      ? gaps.reduce((best, g) => (g.w > best.w ? g : best))
      : { x: TEXT_PAD, w: BOARD_W - TEXT_PAD * 2 };

    const range = layoutNextLineRange(textPrepared, cur, Math.max(20, gap.w));
    if (range === null) break;
    const line = materializeLineRange(textPrepared, range);

    const el = textLineEls[lineIdx]!;
    el.style.display = "block";
    el.style.left = `${gap.x}px`;
    el.style.top = `${lineY}px`;
    el.textContent = line.text;

    cur = { ...range.end };
    lineY += TEXT_LINE_H;
    lineIdx++;
  }

  for (let i = lineIdx; i < textLineEls.length; i++) {
    textLineEls[i]!.style.display = "none";
  }
}

function applyDOM(): void {
  for (const [id, p] of pos) {
    const el = document.getElementById(id);
    if (el) {
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    }
  }
  renderText();
}

// ─── Build DOM ────────────────────────────────────────────────────────────────

const board = document.getElementById("board")!;
board.style.width = `${BOARD_W}px`;
board.style.height = `${BOARD_H}px`;

textLineEls = Array.from({ length: 12 }, () => {
  const div = document.createElement("div");
  div.style.cssText = `position:absolute;font:${TEXT_FONT};line-height:${TEXT_LINE_H}px;color:rgba(255,255,255,0.85);white-space:nowrap;pointer-events:none;display:none`;
  board.appendChild(div);
  return div;
});

let dragId: string | null = null;
let mouseStart: Pt = { x: 0, y: 0 };
let tileStart: Pt = { x: 0, y: 0 };
let cachedBoardRect = board.getBoundingClientRect();
let topZ = tiles.length;

tiles.forEach((tile, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const ix = GRID_X + GAP + col * (TILE_W + GAP);
  const iy = GRID_Y + GAP + row * (TILE_H + GAP);
  pos.set(tile.id, { x: ix, y: iy });

  const el = document.createElement("div");
  el.id = tile.id;
  el.className = "tile";
  el.style.left = `${ix}px`;
  el.style.top = `${iy}px`;
  el.style.width = `${TILE_W}px`;
  el.style.height = `${TILE_H}px`;
  el.style.zIndex = String(i + 1);

  const img = document.createElement("img");
  img.src = `/svg/mahjong/${tile.svg}.svg`;
  img.alt = tile.svg;
  img.draggable = false;
  el.appendChild(img);
  board.appendChild(el);

  const beginDrag = (cx: number, cy: number) => {
    cachedBoardRect = board.getBoundingClientRect();
    dragId = tile.id;
    mouseStart = { x: cx - cachedBoardRect.left, y: cy - cachedBoardRect.top };
    tileStart = { ...pos.get(tile.id)! };
    el.style.zIndex = String(++topZ);
  };

  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    beginDrag(e.clientX, e.clientY);
    e.preventDefault();
  });

  el.addEventListener("touchstart", (e) => {
    beginDrag(e.touches[0]!.clientX, e.touches[0]!.clientY);
    e.preventDefault();
  }, { passive: false });
});
renderText();

// Max pixels the dragged tile travels per physics step. Keeping this below
// min(TILE_W, TILE_H) makes tunneling geometrically impossible: the tile can
// never skip past another tile between steps.
const STEP = Math.floor(Math.min(TILE_W, TILE_H) / 2); // 16 px

let syncAll: () => void = () => {};
let broadcastFlash: (text: string, extraClass: string, cx: number, cy: number) => void = () => {};

const onMove = (cx: number, cy: number) => {
  if (!dragId) return;
  const mx = cx - cachedBoardRect.left;
  const my = cy - cachedBoardRect.top;
  const desired = clamp({
    x: tileStart.x + mx - mouseStart.x,
    y: tileStart.y + my - mouseStart.y,
  });

  const cur = pos.get(dragId)!;
  const dx = desired.x - cur.x;
  const dy = desired.y - cur.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / STEP));

  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const intended = clamp({ x: cur.x + dx * t, y: cur.y + dy * t });
    pos.set(dragId, intended);
    resolveAll(dragId);
    constrainDragged(dragId);
    // Stop early if the cascade hit a wall and pushed us back.
    const actual = pos.get(dragId)!;
    if (actual.x !== intended.x || actual.y !== intended.y) break;
  }

  // Sync so the next mousemove doesn't re-fight the constraint.
  tileStart = { ...pos.get(dragId)! };
  mouseStart = { x: mx, y: my };

  applyDOM();
  syncAll();
};

document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
document.addEventListener("touchmove", (e) => {
  onMove(e.touches[0]!.clientX, e.touches[0]!.clientY);
  e.preventDefault();
}, { passive: false });
// After release, resolve any overlaps that slipped through during the drag.
// No tile is fixed here — every tile can be nudged. Runs until stable.
function cleanupOverlaps(): void {
  const ids = [...pos.keys()];
  for (let iter = 0; iter < 200; iter++) {
    let changed = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i]!)!;
        const b = pos.get(ids[j]!)!;
        const v = pushVec(a, b);
        if (!v) continue;
        // Push both tiles symmetrically: when one is wall-blocked, the other absorbs the full push.
        const aNew = clamp({ x: a.x - v.x, y: a.y - v.y });
        const bNew = clamp({ x: b.x + v.x, y: b.y + v.y });
        if (aNew.x !== a.x || aNew.y !== a.y) { pos.set(ids[i]!, aNew); changed = true; }
        if (bNew.x !== b.x || bNew.y !== b.y) { pos.set(ids[j]!, bNew); changed = true; }
      }
    }
    if (!changed) break;
  }
  applyDOM();
}

function parseSuitTile(id: string): { suit: string; num: number } | null {
  const m = id.match(/^MJ(\d)(wan|tiao|bing)-/);
  if (!m) return null;
  return { num: parseInt(m[1]!), suit: m[2]! };
}

function flashLabel(text: string, cx: number, cy: number, extraClass: string): void {
  const el = document.createElement("div");
  el.className = `chow-label ${extraClass}`;
  el.textContent = text;
  el.style.left = `${cx}px`;
  el.style.top = `${cy}px`;
  board.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

// Two tiles are "near enough" to form a Chow group if their centers are within this distance.
const CHOW_DIST = TILE_W * 2.5;

function checkChow(draggedId: string): void {
  const dragged = parseSuitTile(draggedId);
  if (!dragged) return;

  const dp = pos.get(draggedId)!;
  const dCx = dp.x + TILE_W / 2;
  const dCy = dp.y + TILE_H / 2;

  // Collect same-suit tiles whose centers are within CHOW_DIST of the dragged tile.
  const nearby: { num: number; cx: number; cy: number }[] = [];
  for (const [id, p] of pos) {
    if (id === draggedId) continue;
    const t = parseSuitTile(id);
    if (!t || t.suit !== dragged.suit) continue;
    const cx = p.x + TILE_W / 2;
    const cy = p.y + TILE_H / 2;
    if (Math.hypot(cx - dCx, cy - dCy) <= CHOW_DIST) nearby.push({ num: t.num, cx, cy });
  }

  // Check every pair of nearby tiles: do they + the dragged tile form a run of 3?
  for (let i = 0; i < nearby.length; i++) {
    for (let j = i + 1; j < nearby.length; j++) {
      const a = nearby[i]!, b = nearby[j]!;
      // The two partners must also be near each other.
      if (Math.hypot(a.cx - b.cx, a.cy - b.cy) > CHOW_DIST) continue;

      const [n0, n1, n2] = [dragged.num, a.num, b.num].sort((x, y) => x - y) as [number, number, number];
      if (n1 !== n0 + 1 || n2 !== n0 + 2) continue;

      const groupCx = (dCx + a.cx + b.cx) / 3;
      const groupCy = (dCy + a.cy + b.cy) / 3;
      if (dCx > a.cx || dCx > b.cx) {
        flashLabel("Chow only from the left!", groupCx, groupCy, "chow-warn");
        broadcastFlash("Chow only from the left!", "chow-warn", groupCx, groupCy);
        return;
      }
      flashLabel("CHOW!", groupCx, groupCy, "chow-success");
      broadcastFlash("CHOW!", "chow-success", groupCx, groupCy);
      return;
    }
  }
}

// Max center-to-center distance between two touching tiles (diagonal corner touch).
const TOUCH_DIST = Math.hypot(TILE_W, TILE_H) * 1.2; // ~65px

// BFS through same-type tiles: find all copies reachable from draggedId via chains of touching tiles.
function findMatchingCluster(draggedId: string): { cx: number; cy: number }[] {
  const baseName = draggedId.replace(/-\d+$/, "");
  const cluster = new Set<string>([draggedId]);
  const queue = [draggedId];
  while (queue.length > 0) {
    const fromId = queue.shift()!;
    const fp = pos.get(fromId)!;
    const fCx = fp.x + TILE_W / 2;
    const fCy = fp.y + TILE_H / 2;
    for (const [id, p] of pos) {
      if (cluster.has(id)) continue;
      if (!id.startsWith(baseName + "-")) continue;
      if (Math.hypot(p.x + TILE_W / 2 - fCx, p.y + TILE_H / 2 - fCy) <= TOUCH_DIST) {
        cluster.add(id);
        queue.push(id);
      }
    }
  }
  cluster.delete(draggedId);
  return [...cluster].map(id => {
    const p = pos.get(id)!;
    return { cx: p.x + TILE_W / 2, cy: p.y + TILE_H / 2 };
  });
}

function checkPung(draggedId: string): boolean {
  const dp = pos.get(draggedId)!;
  const dCx = dp.x + TILE_W / 2;
  const dCy = dp.y + TILE_H / 2;
  const nearby = findMatchingCluster(draggedId);
  if (nearby.length < 2) return false;
  const a = nearby[0]!, b = nearby[1]!;
  const groupCx = (dCx + a.cx + b.cx) / 3;
  const groupCy = (dCy + a.cy + b.cy) / 3;
  flashLabel("PUNG!", groupCx, groupCy, "pung-success");
  broadcastFlash("PUNG!", "pung-success", groupCx, groupCy);
  return true;
}

function checkKong(draggedId: string): boolean {
  const dp = pos.get(draggedId)!;
  const dCx = dp.x + TILE_W / 2;
  const dCy = dp.y + TILE_H / 2;
  const nearby = findMatchingCluster(draggedId);
  if (nearby.length < 3) return false;
  const a = nearby[0]!, b = nearby[1]!, c = nearby[2]!;
  const groupCx = (dCx + a.cx + b.cx + c.cx) / 4;
  const groupCy = (dCy + a.cy + b.cy + c.cy) / 4;
  flashLabel("KONG!", groupCx, groupCy, "kong-success");
  broadcastFlash("KONG!", "kong-success", groupCx, groupCy);
  return true;
}

const endDrag = () => {
  if (!dragId) return;
  const releasedId = dragId;
  dragId = null;
  checkChow(releasedId);
  if (!checkKong(releasedId)) checkPung(releasedId);
  cleanupOverlaps();
  syncAll();
};

document.addEventListener("mouseup", endDrag);
document.addEventListener("touchend", endDrag);

window.addEventListener("resize", () => {
  cachedBoardRect = board.getBoundingClientRect();
});

playhtml.init({ onError: () => {} }).then(() => {
  type PosMap = Record<string, { x: number; y: number }>;
  const channel = playhtml.createPageData<PosMap>("tile-positions", {});

  type FlashEvent = { id: string; text: string; extraClass: string; cx: number; cy: number; ts: number };
  const seenFlashes = new Set<string>();
  const flashChannel = playhtml.createPageData<FlashEvent[]>("flash-events", []);
  flashChannel.onUpdate((events: FlashEvent[]) => {
    const now = Date.now();
    for (const e of events) {
      if (seenFlashes.has(e.id)) continue;
      seenFlashes.add(e.id);
      if (now - e.ts < 5000) flashLabel(e.text, e.cx, e.cy, e.extraClass);
    }
  });
  broadcastFlash = (text: string, extraClass: string, cx: number, cy: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    seenFlashes.add(id);
    flashChannel.setData((draft: FlashEvent[]) => [...draft.slice(-19), { id, text, extraClass, cx, cy, ts: Date.now() }]);
  };

  channel.onUpdate((data: PosMap) => {
    // Don't apply remote updates while a local drag is in flight — avoids echo glitches.
    if (dragId !== null) return;

    const keys = Object.keys(data);
    if (keys.length === 0) {
      // Fresh room: seed it with the current initial layout.
      syncAll();
      return;
    }
    for (const id of keys) {
      if (pos.has(id)) pos.set(id, data[id]!);
    }
    applyDOM();
  });

  syncAll = () => {
    channel.setData((draft: PosMap) => {
      for (const [id, p] of pos) {
        draft[id] = p;
      }
    });
  };
});
