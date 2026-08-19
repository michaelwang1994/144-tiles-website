import {
  suits,
  findTile,
  getSortedTiles,
  getCounts,
  idsFromTiles,
  isBonusTile,
  isSuited,
  parseTile,
  nextId,
  findDecompositions,
  getHandStats,
  handPatterns,
  detectHandPatterns,
  getHandPatternFan,
  isStrictlyConcealedHand,
  analyzePotentialHands,
  sampleHands,
  isValidWinningHand,
  flowerScenarios,
  calculateFlowerScenarios,
  windDragonScenarios,
  detectWindDragonFaan,
  getWindDragonFan,
  winningConditions,
  type LockedGroup,
} from './points-calculator';

function $(id: string) { return document.getElementById(id); }

const selected: Record<string, number> = {}; // tile id -> count
const melds: LockedGroup[] = [];
let activeMeldMode: 'chow' | 'pung' | 'kong' | null = null;
let chowSelection: string[] = [];
const collapsedSections = new Set<string>();

function hasOpenMeld(): boolean {
  return melds.some((m) => m.type === 'chow' || m.type === 'pung');
}

function getMeldTileCount(id: string): number {
  return melds.reduce((sum, m) => sum + m.tiles.filter((t) => t === id).length, 0);
}

function getFreeCount(id: string): number {
  return Math.max(0, (selected[id] || 0) - getMeldTileCount(id));
}

function getFreeSelected(): Record<string, number> {
  const free: Record<string, number> = {};
  Object.keys(selected).forEach((id) => {
    const count = (selected[id] || 0) - getMeldTileCount(id);
    if (count > 0) free[id] = count;
  });
  return free;
}

function simulateAddTiles(additions: Record<string, number>): boolean {
  const modified: string[] = [];
  const original: Record<string, number> = {};
  let ok = true;
  for (const id of Object.keys(additions)) {
    const tile = findTile(id);
    if (!tile) { ok = false; break; }
    const before = selected[id] || 0;
    if (before + additions[id]! > tile.max) { ok = false; break; }
    selected[id] = before + additions[id]!;
    original[id] = before;
    modified.push(id);
  }
  let totalOk = false;
  if (ok) {
    const stats = getHandStats(selected);
    totalOk = stats.total <= stats.max;
  }
  modified.forEach((id) => {
    selected[id] = original[id]!;
    if (original[id] === 0) delete selected[id];
  });
  return ok && totalOk;
}

function isDisabledForMeldMode(id: string): boolean {
  if (activeMeldMode === 'chow') return !isSuited(id) || isBonusTile(id);
  if (activeMeldMode === 'pung' || activeMeldMode === 'kong') return isBonusTile(id);
  return false;
}

function isSequentialChow(ids: string[]): boolean {
  if (ids.length !== 3) return false;
  const sorted = [...ids].sort();
  if (!isSuited(sorted[0]!) || !isSuited(sorted[1]!) || !isSuited(sorted[2]!)) return false;
  const p0 = parseTile(sorted[0]!);
  const p1 = parseTile(sorted[1]!);
  const p2 = parseTile(sorted[2]!);
  return p0.suit === p1.suit && p1.suit === p2.suit && p0.rank + 1 === p1.rank && p1.rank + 1 === p2.rank;
}

function canCreatePung(id: string): boolean {
  return simulateAddTiles({ [id]: 3 });
}

function createPung(id: string) {
  if (!canCreatePung(id)) return;
  selected[id] = (selected[id] || 0) + 3;
  melds.push({ type: 'pung', tiles: [id, id, id] });
  activeMeldMode = null;
  updateTileUI();
}

function canCreateKong(id: string): boolean {
  const pungIndex = melds.findIndex((m) => m.type === 'pung' && m.tiles[0] === id);
  if (pungIndex !== -1) {
    return getFreeCount(id) >= 1 || simulateAddTiles({ [id]: 1 });
  }
  const freeCount = getFreeCount(id);
  if (freeCount >= 4) return true;
  return simulateAddTiles({ [id]: 4 - freeCount });
}

function createKong(id: string) {
  if (!canCreateKong(id)) return;
  const pungIndex = melds.findIndex((m) => m.type === 'pung' && m.tiles[0] === id);
  if (pungIndex !== -1) {
    if (getFreeCount(id) < 1) selected[id] = (selected[id] || 0) + 1;
    melds[pungIndex] = { type: 'kong', tiles: [id, id, id, id] };
  } else {
    const freeCount = getFreeCount(id);
    const needed = 4 - freeCount;
    if (needed > 0) selected[id] = (selected[id] || 0) + needed;
    melds.push({ type: 'kong', tiles: [id, id, id, id] });
  }
  activeMeldMode = null;
  updateTileUI();
}

function canCreateChow(ids: string[]): boolean {
  if (!isSequentialChow(ids)) return false;
  const additions: Record<string, number> = {};
  ids.forEach((id) => {
    additions[id] = (additions[id] || 0) + 1;
  });
  return simulateAddTiles(additions);
}

function createChow(ids: string[]) {
  if (!canCreateChow(ids)) {
    chowSelection = [];
    updateTileUI();
    return;
  }
  ids.forEach((id) => {
    selected[id] = (selected[id] || 0) + 1;
  });
  melds.push({ type: 'chow', tiles: ids.slice().sort() });
  chowSelection = [];
  activeMeldMode = null;
  updateTileUI();
}

function removeMeldAt(index: number) {
  const meld = melds[index];
  if (!meld) return;
  meld.tiles.forEach((id) => {
    selected[id] = (selected[id] || 0) - 1;
    if ((selected[id] || 0) <= 0) delete selected[id];
  });
  melds.splice(index, 1);
  updateTileUI();
}

function getTileLabel(id: string): string {
  const suit = id.charAt(0);
  const rank = id.charAt(1);
  if (suit === 'm' || suit === 's' || suit === 'p') return rank;
  if (suit === 'w') return ({ e: 'E', s: 'S', w: 'W', n: 'N' } as Record<string, string>)[rank] ?? '';
  if (suit === 'd') return ({ r: 'C', g: 'F', w: 'P' } as Record<string, string>)[rank] ?? '';
  if (suit === 'f' || suit === 'n') return rank;
  return '';
}

function getDragonClass(id: string) {
  if (id === 'dr') return 'dragon-red';
  if (id === 'dg') return 'dragon-green';
  if (id === 'dw') return 'dragon-blue';
  return '';
}

function createTileImage(tile: { id: string; c: string; img: string }) {
  const img = document.createElement('img');
  img.className = 'tile-img';
  img.src = tile.img;
  img.alt = tile.c;
  img.draggable = false;
  img.loading = 'lazy';
  return img;
}

function renderTileSelector() {
  const container = $('tile-selector');
  if (!container) return;
  container.innerHTML = '';
  suits.forEach((suit) => {
    const div = document.createElement('div');
    div.className = 'tile-suit';
    const label = document.createElement('div');
    label.className = 'tile-suit-label';
    label.textContent = suit.label;
    div.appendChild(label);
    const row = document.createElement('div');
    row.className = 'tile-row';
    suit.tiles.forEach((t) => {
      const btn = document.createElement('div');
      btn.className = 'tile' + (getDragonClass(t.id) ? ' ' + getDragonClass(t.id) : '');
      (btn as HTMLElement).dataset.id = t.id;
      btn.title = t.id.toUpperCase();
      const img = createTileImage(t);
      const sub = document.createElement('span');
      sub.className = 'tile-label';
      sub.textContent = getTileLabel(t.id);
      btn.appendChild(img);
      btn.appendChild(sub);
      btn.addEventListener('click', () => { toggleTile(t); });
      row.appendChild(btn);
    });
    div.appendChild(row);
    container.appendChild(div);
  });
  updateTileUI();
}

function canAddTile(tile: { id: string; max: number }) {
  const isBonus = isBonusTile(tile.id);
  const currentCount = selected[tile.id] || 0;
  const nextCount = currentCount + 1;
  const wouldCreateKong = !isBonus && nextCount === 4;

  if (isBonus) return true;
  if (wouldCreateKong) {
    selected[tile.id] = 4;
    const stats = getHandStats(selected);
    selected[tile.id] = currentCount;
    if (currentCount === 0) delete selected[tile.id];
    return stats.total <= stats.max;
  }
  const stats = getHandStats(selected);
  return stats.total < stats.max;
}

function toggleTile(tile: { id: string; max: number }) {
  if (isDisabledForMeldMode(tile.id)) return;
  if (activeMeldMode === 'pung') {
    createPung(tile.id);
    return;
  }
  if (activeMeldMode === 'kong') {
    createKong(tile.id);
    return;
  }
  if (activeMeldMode === 'chow') {
    chowSelection.push(tile.id);
    if (chowSelection.length === 3) {
      createChow(chowSelection);
    } else {
      updateTileUI();
    }
    return;
  }
  if (!canAddTile(tile)) return;
  selected[tile.id] = (selected[tile.id] || 0) + 1;
  if ((selected[tile.id] || 0) > tile.max) selected[tile.id] = 0;
  if ((selected[tile.id] || 0) === 0) delete selected[tile.id];
  updateTileUI();
}

function updateTileUI() {
  document.querySelectorAll('#tile-selector .tile').forEach((btn) => {
    const id = (btn as HTMLElement).dataset.id!;
    const count = selected[id] || 0;
    const tileDef = findTile(id)!;
    const lockedCount = getMeldTileCount(id);
    const isPendingChow = activeMeldMode === 'chow' && chowSelection.includes(id);
    const disabledForMeld = isDisabledForMeldMode(id);
    btn.classList.toggle('selected', count > 0);
    btn.classList.toggle('locked', lockedCount > 0);
    btn.classList.toggle('pending-chow', isPendingChow);
    btn.classList.toggle('disabled-meld', disabledForMeld);
    btn.classList.toggle('maxed', count >= tileDef.max);
    let badge = btn.querySelector('.count');
    if (count > 1) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'count'; btn.appendChild(badge); }
      badge.textContent = String(count);
    } else if (badge) {
      badge.remove();
    }
  });
  updateMeldButtonStates();
  renderReferenceHand();
  renderMiniHand();
  renderPotentialHands();
  renderHandPatterns();
  renderWindDragonPoints();
  renderFlowerPoints();

  const copyHand = $('copy-hand') as HTMLButtonElement | null;
  if (copyHand) copyHand.disabled = !isValidWinningHand(selected, melds) || getTotalFan() === 0;
  renderReferenceTotal();
  renderFanBreakdown();
}

function makeRemovableTile(t: { id: string; c: string; img: string }, isFlower: boolean, locked = false) {
  const span = document.createElement('span');
  span.className = 'tile selected' + (isFlower ? ' flower' : '') + (locked ? ' locked' : ' removable') + (getDragonClass(t.id) ? ' ' + getDragonClass(t.id) : '');
  span.title = locked ? 'Locked in meld (tap meld to remove)' : 'Tap to remove';
  const img = createTileImage(t);
  const sub = document.createElement('span');
  sub.className = 'tile-label';
  sub.textContent = getTileLabel(t.id);
  span.appendChild(img);
  span.appendChild(sub);
  span.addEventListener('click', () => { removeTile(t.id, locked); });
  return span;
}

function renderMeldGroup(meld: LockedGroup, isFlower: boolean) {
  const group = document.createElement('span');
  group.className = 'meld-group';
  const label = document.createElement('span');
  label.className = 'meld-type-label';
  label.textContent = meld.type === 'chow' ? 'Chow 吃' : meld.type === 'pung' ? 'Pung 碰' : 'Kong 槓';
  group.appendChild(label);
  const tiles = document.createElement('span');
  tiles.className = 'meld-tiles';
  meld.tiles.forEach((id) => {
    const t = findTile(id);
    if (t) tiles.appendChild(makeRemovableTile(t, isFlower, true));
  });
  group.appendChild(tiles);
  group.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.tile')) return;
    const index = melds.indexOf(meld);
    if (index !== -1) removeMeldAt(index);
  });
  return group;
}

function removeTile(id: string, locked = false) {
  if (locked) {
    const meldIndex = melds.findIndex((m) => m.tiles.includes(id));
    if (meldIndex !== -1) {
      removeMeldAt(meldIndex);
    }
    return;
  }
  if (!selected[id]) return;
  selected[id] = (selected[id] || 0) - 1;
  if ((selected[id] || 0) <= 0) delete selected[id];
  updateTileUI();
}

function updateMeldButtonStates() {
  ['chow', 'pung', 'kong'].forEach((mode) => {
    const btn = $(`meld-${mode}`);
    if (!btn) return;
    btn.classList.toggle('active', activeMeldMode === mode);
  });
  const hint = $('meld-hint');
  if (!hint) return;
  if (activeMeldMode === 'chow') {
    hint.textContent = `Select ${3 - chowSelection.length} more sequential tile(s)`;
  } else if (activeMeldMode === 'pung') {
    hint.textContent = 'Select a tile to make a pung of 3';
  } else if (activeMeldMode === 'kong') {
    hint.textContent = 'Select a tile to make a kong of 4, or add to an existing pung';
  } else {
    hint.textContent = '';
  }
}

function renderReferenceHand() {
  const content = $('fan-reference-hand-content');
  if (!content) return;
  content.innerHTML = '';

  const tiles = getSortedTiles(selected);
  const freeSelected = getFreeSelected();
  const freeTiles = getSortedTiles(freeSelected);
  const mainFreeTiles = freeTiles.filter((t) => !isBonusTile(t.id));
  const bonusTiles = tiles.filter((t) => isBonusTile(t.id));
  const mainMelds = melds.filter((m) => !isBonusTile(m.tiles[0]!));

  if (tiles.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'fan-reference-hand-empty';
    empty.textContent = 'No tiles selected';
    content.appendChild(empty);
    return;
  }

  const tilesContainer = document.createElement('span');
  tilesContainer.className = 'fan-reference-hand-tiles';

  mainMelds.forEach((meld) => {
    tilesContainer.appendChild(renderMeldGroup(meld, false));
  });

  mainFreeTiles.forEach((t) => {
    tilesContainer.appendChild(makeRemovableTile(t, false));
  });

  if (bonusTiles.length) {
    const sep = document.createElement('span');
    sep.className = 'flower-separator';
    sep.textContent = '|';
    tilesContainer.appendChild(sep);
    bonusTiles.forEach((t) => {
      tilesContainer.appendChild(makeRemovableTile(t, true));
    });
  }
  content.appendChild(tilesContainer);
}

function updateMiniHandVisibility() {
  const miniHand = document.querySelector('.mini-hand') as HTMLElement | null;
  if (!miniHand) return;
  const hasTiles = Object.keys(selected).length > 0;
  miniHand.classList.toggle('visible', hasTiles);
}

function renderMiniHand() {
  const content = $('mini-hand-content');
  if (!content) return;
  content.innerHTML = '';

  const tiles = getSortedTiles(selected);
  const freeSelected = getFreeSelected();
  const freeTiles = getSortedTiles(freeSelected);
  const mainFreeTiles = freeTiles.filter((t) => !isBonusTile(t.id));
  const bonusTiles = tiles.filter((t) => isBonusTile(t.id));
  const mainMelds = melds.filter((m) => !isBonusTile(m.tiles[0]!));

  if (tiles.length === 0) {
    updateMiniHandVisibility();
    return;
  }

  const tilesContainer = document.createElement('span');
  tilesContainer.className = 'mini-hand-tiles';

  mainMelds.forEach((meld) => {
    tilesContainer.appendChild(renderMeldGroup(meld, false));
  });

  mainFreeTiles.forEach((t) => {
    tilesContainer.appendChild(makeRemovableTile(t, false));
  });

  if (bonusTiles.length) {
    const sep = document.createElement('span');
    sep.className = 'flower-separator';
    sep.textContent = '|';
    tilesContainer.appendChild(sep);
    bonusTiles.forEach((t) => {
      tilesContainer.appendChild(makeRemovableTile(t, true));
    });
  }
  content.appendChild(tilesContainer);
  updateMiniHandVisibility();
}

// ---------- Game context ----------

let seatWind = 'e';
let tableWind = 'e';

// ---------- Flower points ----------

const flowerIncluded: Record<string, boolean> = {};
let seatFlowerOverride: number | null = null; // null = auto-detect, 0-2 = manual value

function highlightFanTable(fan: number) {
  document.querySelectorAll('#fan-table td').forEach((cell) => { cell.classList.remove('current'); });
  if (fan < 0) return;
  let cell: Element | null;
  if (fan <= 12) {
    cell = document.querySelector('#fan-table td:nth-child(' + (fan + 2) + ')');
  } else {
    cell = document.querySelector('#fan-table td:last-child');
  }
  if (cell) cell.classList.add('current');
}

function renderFlowerPoints() {
  const container = $('flower-scenarios');
  if (!container) return;
  container.innerHTML = '';
  const detected = calculateFlowerScenarios(selected, seatWind);

  flowerScenarios.forEach((s) => {
    const scenario = detected[s.id]!;
    if (s.id === 'seat-flower') {
      seatFlowerOverride = scenario.fan;
    } else {
      flowerIncluded[s.id] = scenario.applies;
    }
  });

  const seatFlowerValue = detected['seat-flower']!.fan;

  function canApply(s: typeof flowerScenarios[0]) {
    if (s.id === 'seat-flower') return seatFlowerValue > 0;
    return detected[s.id]!.applies;
  }

  let flowerTotal = seatFlowerValue;
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') return;
    if (flowerIncluded[s.id] && canApply(s)) flowerTotal += s.fan;
  });

  const winningFan = getWinningConditionFan();
  const handResult = getHandPatternFan(handPatternState);
  const windDragonTotal = getWindDragonFan(windDragonState, selected, seatWind, tableWind);
  let total: number;
  if (handResult.limit) {
    total = Math.min(13, handResult.fan + winningFan);
  } else {
    total = Math.min(13, handResult.fan + windDragonTotal + flowerTotal + winningFan);
  }

  flowerScenarios.forEach((s) => {
    const scenario = detected[s.id]!;
    const isSeatFlower = s.id === 'seat-flower';
    const value = isSeatFlower ? seatFlowerValue : scenario.fan;
    const applies = canApply(s);
    const active = applies;

    const item = document.createElement('div');
    const isCommon = s.id === 'no-flowers' || s.id === 'seat-flower';
    item.className = 'hand-item' + (isCommon ? ' important' : (active ? ' auto-detected' : ''));

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'hand-name';
    name.textContent = s.name;
    const desc = document.createElement('div');
    desc.className = 'hand-desc';
    desc.textContent = s.desc;
    info.appendChild(name);
    info.appendChild(desc);

    const fan = document.createElement('span');
    fan.className = 'hand-fan';
    fan.textContent = fanToPoints(value) + ' points';

    item.appendChild(info);
    item.appendChild(fan);
    container.appendChild(item);
  });

  const summary = $('flower-summary');
  if (summary) {
    let breakdown: string;
    if (handResult.limit) {
      breakdown = 'Limit hand: ' + handResult.limitName + ' (' + fanToPoints(handResult.fan) + ' points)';
      if (winningFan > 0) breakdown += ' + Winning conditions: ' + fanToPoints(winningFan);
      breakdown += ' = ' + fanToPoints(total) + ' points';
    } else {
      breakdown = 'Hand patterns: ' + fanToPoints(handResult.fan);
      if (windDragonTotal > 0) breakdown += ' + Wind & Dragon: ' + fanToPoints(windDragonTotal);
      if (flowerTotal > 0) breakdown += ' + Flower: ' + fanToPoints(flowerTotal);
      if (winningFan > 0) breakdown += ' + Winning conditions: ' + fanToPoints(winningFan);
      breakdown += ' = ' + fanToPoints(total) + ' points';
    }
    summary.textContent = breakdown;
  }

  const flowerPanel = container.closest('.tile-panel');
  if (flowerPanel) {
    flowerPanel.classList.toggle('collapsed', flowerTotal === 0 || collapsedSections.has('flower-scenarios'));
  }

  highlightFanTable(total);
  renderReferenceTotal();
  renderFanBreakdown();
}

function renderCheckedConditions() {
  const container = $('fan-conditions');
  if (!container) return;
  container.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'fan-conditions-label';
  label.textContent = 'Checked conditions';
  container.appendChild(label);

  const list = document.createElement('div');
  list.className = 'fan-conditions-list';

  const addTag = (text: string) => {
    const tag = document.createElement('span');
    tag.className = 'fan-condition-tag';
    tag.textContent = text;
    list.appendChild(tag);
  };

  const handResult = getHandPatternFan(handPatternState);

  const detectedPatterns = detectHandPatterns(selected, melds);
  handPatterns.forEach((p) => {
    const active = !!handPatternState[p.id] && (detectedPatterns[p.id] || !p.auto);
    if (!active) return;
    if (handResult.limit) {
      if (!p.limit || p.name !== handResult.limitName) return;
    } else if (p.limit) {
      return;
    }
    addTag(p.name + ' (' + fanToPoints(p.fan) + ' points)');
  });

  if (!handResult.limit) {
    const windDragonDetected = detectWindDragonFaan(selected, seatWind, tableWind);
    windDragonScenarios.forEach((s) => {
      if (s.stepper) {
        const value = (windDragonState[s.id] as number | undefined) ?? 0;
        if (value > 0) addTag(s.name + ' (' + fanToPoints(value) + ' points)');
      } else if (windDragonState[s.id] && windDragonDetected[s.id]!.applies) {
        addTag(s.name + ' (' + fanToPoints(windDragonDetected[s.id]!.fan) + ' points)');
      }
    });

    const flowerDetected = calculateFlowerScenarios(selected, seatWind);
    const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
    flowerScenarios.forEach((s) => {
      if (s.id === 'seat-flower') {
        if (seatFlowerValue > 0) addTag(s.name + ' (' + fanToPoints(seatFlowerValue) + ' points)');
      } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
        addTag(s.name + ' (' + fanToPoints(flowerDetected[s.id]!.fan) + ' points)');
      }
    });
  }

  const concealedExcluded =
    isStrictlyConcealedHand(handPatternState) ||
    !!handPatternState['self-triplets'] ||
    !!handPatternState['seven-pairs'] ||
    !!handPatternState['nine-gates'] ||
    !!handPatternState['thirteen-orphans'];
  winningConditions.forEach((c) => {
    if (!winningConditionState[c.id]) return;
    if (c.id === 'concealed' && concealedExcluded) return;
    addTag(c.name + ' (' + fanToPoints(c.fan) + ' points)');
  });

  if (list.children.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'fan-condition-empty';
    empty.textContent = 'No conditions selected';
    list.appendChild(empty);
  }

  container.appendChild(list);
}

// ---------- Hand patterns ----------

const handPatternState: Record<string, boolean> = {};

function loadSampleHand(patternId: string) {
  const sample = sampleHands[patternId];
  if (!sample) return;
  Object.keys(selected).forEach((k) => { delete selected[k]; });
  Object.assign(selected, sample);
  melds.length = 0;
  activeMeldMode = null;
  chowSelection = [];
  seatFlowerOverride = null;
  dragonOverride = null;
  Object.keys(winningConditionState).forEach((k) => { delete winningConditionState[k]; });
  Object.keys(handPatternState).forEach((k) => { delete handPatternState[k]; });
  Object.keys(windDragonState).forEach((k) => { delete windDragonState[k]; });

  if (patternId === 'self-triplets') {
    winningConditionState['concealed'] = true;
  }

  updateTileUI();
  renderWinningConditions();
}

function renderHandPatterns() {
  const container = $('hand-patterns');
  if (!container) return;
  container.innerHTML = '';

  const detected = detectHandPatterns(selected, melds);
  const isComplete = isValidWinningHand(selected, melds);
  const inferredSelfTriplets = detected['all-triplets'] && !!winningConditionState['concealed'];

  if (isComplete) {
    // When the hand is complete, auto-select only the highest-scoring detected pattern.
    const candidates: { id: string; fan: number }[] = [];
    handPatterns.forEach((p) => {
      if (p.auto && detected[p.id]) {
        candidates.push({ id: p.id, fan: p.fan });
      }
    });
    if (inferredSelfTriplets) {
      candidates.push({ id: 'self-triplets', fan: 10 });
    }

    if (candidates.length > 0) {
      const top = candidates.reduce((best, current) => (current.fan > best.fan ? current : best));
      handPatterns.forEach((p) => {
        if (p.id === top.id) {
          handPatternState[p.id] = true;
        } else if (p.auto && detected[p.id]) {
          handPatternState[p.id] = false;
        }
      });
      if (top.id === 'self-triplets') {
        handPatternState['all-triplets'] = false;
      }
    }
  } else {
    // For incomplete hands, keep the original behavior of auto-selecting any detected pattern.
    handPatterns.forEach((p) => {
      if (p.auto && detected[p.id] && handPatternState[p.id] === undefined) {
        handPatternState[p.id] = true;
      }
    });
  }

  // Clear self-triplets when it is no longer inferred from all-triplets + concealed.
  if (!inferredSelfTriplets && handPatternState['self-triplets']) {
    handPatternState['self-triplets'] = false;
  }

  if (handPatternState['seven-pairs'] || handPatternState['nine-gates'] || handPatternState['thirteen-orphans']) {
    winningConditionState['concealed'] = true;
  }

  // Clear stale hand-pattern state for patterns that no longer apply
  handPatterns.forEach((p) => {
    const applies = detected[p.id] || !p.auto;
    const active = !!handPatternState[p.id] && applies;
    if (!active && handPatternState[p.id]) {
      handPatternState[p.id] = false;
    }
  });

  const handResult = getHandPatternFan(handPatternState);

  let limitBreakAdded = false;
  handPatterns.forEach((p) => {
    if (p.limit && !limitBreakAdded) {
      const divider = document.createElement('div');
      divider.className = 'hand-section-break';
      const title = document.createElement('span');
      title.textContent = 'Limit hands';
      const note = document.createElement('p');
      note.textContent = 'Limit hands cannot gain points beyond their hand point value.';
      divider.appendChild(title);
      divider.appendChild(note);
      container.appendChild(divider);
      limitBreakAdded = true;
    }

    const applies = detected[p.id] || !p.auto;
    const active = !!handPatternState[p.id] && applies;

    const item = document.createElement('div');
    const highlightedIds = ['common-hand', 'all-triplets', 'mixed-one-suit'];
    item.className = 'hand-item' + (highlightedIds.includes(p.id) ? ' important' : '') + (active ? ' auto-detected' : '');

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'hand-name';
    name.textContent = p.name;
    const desc = document.createElement('div');
    desc.className = 'hand-desc';
    desc.textContent = p.desc;
    info.appendChild(name);
    info.appendChild(desc);

    const fan = document.createElement('span');
    fan.className = 'hand-fan';
    fan.textContent = fanToPoints(p.fan) + ' points';

    const sampleBtn = document.createElement('button');
    sampleBtn.type = 'button';
    sampleBtn.className = 'sample-hand-btn';
    sampleBtn.textContent = 'Sample';
    sampleBtn.title = 'Load a sample hand for ' + p.name;
    sampleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      loadSampleHand(p.id);
    });

    item.appendChild(info);
    item.appendChild(fan);
    item.appendChild(sampleBtn);
    container.appendChild(item);
  });

  const summary = $('hand-pattern-summary');
  if (summary) {
    if (handResult.limit) {
      summary.textContent = 'Limit hand: ' + handResult.limitName + ' = ' + fanToPoints(handResult.fan) + ' points';
    } else {
      summary.textContent = 'Hand pattern points total: ' + fanToPoints(handResult.fan);
    }
  }

  const handPatternPanel = container.closest('.tile-panel');
  if (handPatternPanel) {
    const hasHandPatterns = handResult.fan > 0 || handResult.limit;
    handPatternPanel.classList.toggle('collapsed', !hasHandPatterns || collapsedSections.has('hand-patterns'));
  }

  if (isStrictlyConcealedHand(handPatternState) && winningConditionState['concealed']) {
    winningConditionState['concealed'] = false;
    renderWinningConditions();
  }
}

// ---------- Potential hands ----------

function renderPotentialHands() {
  const container = $('potential-hands');
  if (!container) return;
  container.innerHTML = '';

  const potential = analyzePotentialHands(selected, melds);

  if (potential.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fan-condition-empty';
    empty.textContent = Object.keys(selected).length === 0
      ? 'Select tiles to see potential hands.'
      : 'No potential scoring hands based on existing tiles. You can potentially earn situational points.';
    container.appendChild(empty);
    return;
  }

  potential.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'hand-item' + (p.ready ? ' auto-detected' : '');

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'hand-name';
    name.textContent = p.name;
    const desc = document.createElement('div');
    desc.className = 'hand-desc';
    desc.textContent = p.desc;
    info.appendChild(name);
    info.appendChild(desc);

    const meta = document.createElement('div');
    meta.style.display = 'flex';
    meta.style.alignItems = 'center';
    meta.style.gap = '8px';
    meta.style.marginLeft = 'auto';
    meta.style.flexWrap = 'wrap';

    const note = document.createElement('span');
    note.className = 'hand-desc';
    note.style.marginTop = '0';
    note.textContent = p.note;

    const fan = document.createElement('span');
    fan.className = 'hand-fan';
    fan.textContent = fanToPoints(p.fan) + ' points';

    meta.appendChild(note);
    meta.appendChild(fan);

    item.appendChild(info);
    item.appendChild(meta);
    container.appendChild(item);
  });
}

// ---------- Wind & Dragon points ----------

const windDragonState: Record<string, boolean | number> = {};
let dragonOverride: number | null = null; // null = auto-detect, 0-3 = manual value

function renderWindDragonPoints() {
  const container = $('wind-dragon-scenarios');
  if (!container) return;
  container.innerHTML = '';

  const detected = detectWindDragonFaan(selected, seatWind, tableWind);

  windDragonScenarios.forEach((s) => {
    const scenario = detected[s.id]!;
    if (s.stepper) {
      dragonOverride = scenario.fan;
      windDragonState[s.id] = scenario.fan;
    } else {
      windDragonState[s.id] = scenario.applies;
    }
  });

  const windDragonTotal = getWindDragonFan(windDragonState, selected, seatWind, tableWind);

  windDragonScenarios.forEach((s) => {
    const scenario = detected[s.id]!;
    const active = s.stepper ? scenario.fan > 0 : scenario.applies;
    const item = document.createElement('div');
    item.className = 'hand-item' + (active ? ' auto-detected' : '');

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'hand-name';
    name.textContent = s.name;
    const desc = document.createElement('div');
    desc.className = 'hand-desc';
    desc.textContent = s.desc;
    info.appendChild(name);
    info.appendChild(desc);

    const fan = document.createElement('span');
    fan.className = 'hand-fan';
    fan.textContent = fanToPoints(scenario.fan) + ' points';

    item.appendChild(info);
    item.appendChild(fan);
    container.appendChild(item);
  });

  const summary = $('wind-dragon-summary');
  if (summary) summary.textContent = 'Wind & Dragon points total: ' + fanToPoints(windDragonTotal);

  const windDragonPanel = container.closest('.tile-panel');
  if (windDragonPanel) {
    windDragonPanel.classList.toggle('collapsed', windDragonTotal === 0 || collapsedSections.has('wind-dragon-scenarios'));
  }

  renderReferenceTotal();
  renderFanBreakdown();
}

// ---------- Winning conditions ----------

const winningConditionState: Record<string, boolean> = {};

function getWinningConditionFan() {
  if (!!handPatternState['self-triplets']) return 0;
  let total = 0;
  const concealedExcluded =
    hasOpenMeld() ||
    isStrictlyConcealedHand(handPatternState) ||
    !!handPatternState['self-triplets'] ||
    !!handPatternState['seven-pairs'] ||
    !!handPatternState['nine-gates'] ||
    !!handPatternState['thirteen-orphans'];
  winningConditions.forEach((c) => {
    if (!winningConditionState[c.id]) return;
    if (c.id === 'concealed' && concealedExcluded) return;
    total += c.fan;
  });
  return total;
}

function renderWinningConditions() {
  const container = $('winning-conditions');
  if (!container) return;
  container.innerHTML = '';
  const concealedExcluded = hasOpenMeld() || isStrictlyConcealedHand(handPatternState);
  const stats = getHandStats(selected);
  const hasKong = stats.potentialKongs > 0;
  const kongRequiredIds = ['win-by-kong', 'win-by-double-kong'];
  winningConditions.forEach((c) => {
    const disabledByKong = kongRequiredIds.indexOf(c.id) !== -1 && !hasKong;
    const disabledByOpenMeld = c.id === 'concealed' && concealedExcluded;
    if ((disabledByKong || disabledByOpenMeld) && winningConditionState[c.id]) {
      winningConditionState[c.id] = false;
    }

    const label = document.createElement('label');
    label.className = 'win-condition' + (c.highlight ? ' highlight' : '');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!winningConditionState[c.id];
    checkbox.disabled = disabledByOpenMeld || disabledByKong;
    checkbox.addEventListener('change', () => {
      winningConditionState[c.id] = checkbox.checked;

      const terminalIds = ['heavenly-hand', 'earthly-hand'];
      const kongExclusiveIds = ['robbing-kong', 'win-by-kong', 'win-by-double-kong'];
      const selfDrawIds = ['win-by-kong', 'win-by-double-kong'];

      if (checkbox.checked) {
        if (terminalIds.indexOf(c.id) !== -1) {
          winningConditions.forEach((other) => {
            if (other.id !== c.id) winningConditionState[other.id] = false;
          });
        } else {
          terminalIds.forEach((id) => { winningConditionState[id] = false; });
          if (kongExclusiveIds.indexOf(c.id) !== -1) {
            kongExclusiveIds.forEach((id) => {
              if (id !== c.id) winningConditionState[id] = false;
            });
          }
          if (selfDrawIds.indexOf(c.id) !== -1) {
            winningConditionState['self-draw'] = true;
          }
        }
      }

      renderWinningConditions();
      renderHandPatterns();
      renderFlowerPoints();
    });
    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'hand-name';
    name.textContent = c.name;
    const desc = document.createElement('div');
    desc.className = 'hand-desc';
    desc.textContent = c.desc;
    info.appendChild(name);
    info.appendChild(desc);
    const fan = document.createElement('span');
    fan.className = 'hand-fan';
    fan.textContent = fanToPoints(c.fan) + ' points';

    label.appendChild(checkbox);
    label.appendChild(info);
    label.appendChild(fan);
    container.appendChild(label);
  });
  renderReferenceTotal();
  renderFanBreakdown();
}

const POINTS_MAP = [0, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384];

function fanToPoints(fan: number): number {
  return POINTS_MAP[Math.min(fan, 13)] ?? 0;
}

function getTotalFan(): number {
  const handResult = getHandPatternFan(handPatternState);
  const winningFan = getWinningConditionFan();
  const windDragonTotal = getWindDragonFan(windDragonState, selected, seatWind, tableWind);
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
  let flowerTotal = seatFlowerValue;
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') return;
    if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) flowerTotal += s.fan;
  });
  return handResult.limit
    ? Math.min(13, handResult.fan + winningFan)
    : Math.min(13, handResult.fan + windDragonTotal + flowerTotal + winningFan);
}

function renderReferenceTotal() {
  const el = $('fan-reference-total');
  if (!el) return;
  const totalFan = getTotalFan();
  const totalPoints = fanToPoints(totalFan);
  el.textContent = `${totalPoints} points`;
}

function renderFanBreakdown() {
  const container = $('fan-breakdown');
  if (!container) return;
  container.innerHTML = '';

  const handResult = getHandPatternFan(handPatternState);
  const winningFan = getWinningConditionFan();
  const windDragonTotal = getWindDragonFan(windDragonState, selected, seatWind, tableWind);
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
  let flowerTotal = seatFlowerValue;
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') return;
    if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) flowerTotal += s.fan;
  });

  const handPoints = fanToPoints(handResult.fan);
  const winningPoints = fanToPoints(winningFan);
  const windDragonPoints = fanToPoints(windDragonTotal);
  const flowerPoints = fanToPoints(flowerTotal);
  const totalPoints = fanToPoints(getTotalFan());

  function addSection(label: string, points: number, negated: boolean, tags: { text: string; desc: string }[]) {
    const section = document.createElement('div');
    section.className = 'fan-breakdown-section' + (negated ? ' negated' : '');

    const header = document.createElement('div');
    header.className = 'fan-breakdown-header';

    const title = document.createElement('span');
    title.className = 'fan-breakdown-title';
    title.textContent = label;

    const value = document.createElement('span');
    value.className = 'fan-breakdown-value';
    value.textContent = `${points} points`;

    header.appendChild(title);
    header.appendChild(value);
    section.appendChild(header);

    if (tags.length > 0) {
      const list = document.createElement('div');
      list.className = 'fan-breakdown-tags';
      tags.forEach(({ text, desc }) => {
        const tag = document.createElement('span');
        tag.className = 'fan-condition-tag';
        tag.textContent = text;
        tag.addEventListener('click', () => openConditionModal(text, desc));
        list.appendChild(tag);
      });
      section.appendChild(list);
    }

    container!.appendChild(section);
  }

  const detectedPatterns = detectHandPatterns(selected, melds);
  const handTags: { text: string; desc: string }[] = [];
  handPatterns.forEach((p) => {
    const active = !!handPatternState[p.id] && (detectedPatterns[p.id] || !p.auto);
    if (!active) return;
    if (handResult.limit) {
      if (!p.limit || p.name !== handResult.limitName) return;
    } else if (p.limit) {
      return;
    }
    handTags.push({ text: p.name, desc: p.desc });
  });

  const concealedExcluded =
    hasOpenMeld() ||
    isStrictlyConcealedHand(handPatternState) ||
    !!handPatternState['self-triplets'] ||
    !!handPatternState['seven-pairs'] ||
    !!handPatternState['nine-gates'] ||
    !!handPatternState['thirteen-orphans'];
  const winningTags: { text: string; desc: string }[] = [];
  winningConditions.forEach((c) => {
    if (!winningConditionState[c.id]) return;
    if (c.id === 'concealed' && concealedExcluded) return;
    winningTags.push({ text: c.name, desc: c.desc });
  });

  const windDragonTags: { text: string; desc: string }[] = [];
  if (!handResult.limit) {
    const windDragonDetected = detectWindDragonFaan(selected, seatWind, tableWind);
    windDragonScenarios.forEach((s) => {
      if (s.stepper) {
        const value = (windDragonState[s.id] as number | undefined) ?? 0;
        if (value > 0) windDragonTags.push({ text: s.name + ' (' + fanToPoints(value) + ' points)', desc: s.desc });
      } else if (windDragonState[s.id] && windDragonDetected[s.id]!.applies) {
        windDragonTags.push({ text: s.name + ' (' + fanToPoints(windDragonDetected[s.id]!.fan) + ' points)', desc: s.desc });
      }
    });
  }

  const flowerTags: { text: string; desc: string }[] = [];
  if (!handResult.limit) {
    flowerScenarios.forEach((s) => {
      if (s.id === 'seat-flower') {
        if (seatFlowerValue > 0) flowerTags.push({ text: s.name + ' (' + fanToPoints(seatFlowerValue) + ' points)', desc: s.desc });
      } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
        flowerTags.push({ text: s.name + ' (' + fanToPoints(flowerDetected[s.id]!.fan) + ' points)', desc: s.desc });
      }
    });
  }

  addSection('Hand patterns', handPoints, false, handTags);
  addSection('Winning conditions', winningPoints, false, winningTags);
  addSection('Wind & Dragon points', windDragonPoints, handResult.limit, windDragonTags);
  addSection('Flower points', flowerPoints, handResult.limit, flowerTags);

  const totalRow = document.createElement('div');
  totalRow.className = 'fan-breakdown-total-row';
  const totalLabel = document.createElement('span');
  totalLabel.className = 'fan-breakdown-total-label';
  totalLabel.textContent = 'Total';
  const totalValue = document.createElement('span');
  totalValue.className = 'fan-breakdown-total';
  totalValue.textContent = `${totalPoints} points`;
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalValue);
  container.appendChild(totalRow);
}

async function copyHandToClipboard() {
  const lines: string[] = [];
  const tiles = getSortedTiles(selected);
  if (tiles.length === 0) {
    lines.push('No tiles selected');
  } else {
    const tileStrs = tiles.map((t) => t.c);
    lines.push('Tiles: ' + tileStrs.join(' '));
  }

  const conditions: string[] = [];
  handPatterns.forEach((p) => {
    if (handPatternState[p.id]) conditions.push(p.name + ' (' + fanToPoints(p.fan) + ' points)');
  });
  const windDragonDetected = detectWindDragonFaan(selected, seatWind, tableWind);
  windDragonScenarios.forEach((s) => {
    if (s.stepper) {
      const value = (windDragonState[s.id] as number | undefined) ?? 0;
      if (value > 0) conditions.push(s.name + ' (' + fanToPoints(value) + ' points)');
    } else if (windDragonState[s.id] && windDragonDetected[s.id]!.applies) {
      conditions.push(s.name + ' (' + fanToPoints(windDragonDetected[s.id]!.fan) + ' points)');
    }
  });
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') {
      const value = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
      if (value > 0) conditions.push(s.name + ' (' + fanToPoints(value) + ' points)');
    } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
      conditions.push(s.name + ' (' + fanToPoints(flowerDetected[s.id]!.fan) + ' points)');
    }
  });
  winningConditions.forEach((c) => {
    if (winningConditionState[c.id]) conditions.push(c.name + ' (' + fanToPoints(c.fan) + ' points)');
  });

  if (conditions.length > 0) {
    lines.push('Checked conditions: ' + conditions.join(', '));
  }

  const totalFan = getTotalFan();
  const totalPoints = fanToPoints(totalFan);
  lines.push(`Total: ${totalPoints} points`);

  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied hand to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

function clearHand() {
  Object.keys(selected).forEach((k) => { delete selected[k]; });
  melds.length = 0;
  activeMeldMode = null;
  chowSelection = [];
  seatFlowerOverride = null;
  dragonOverride = null;
  Object.keys(winningConditionState).forEach((k) => { delete winningConditionState[k]; });
  Object.keys(handPatternState).forEach((k) => { delete handPatternState[k]; });
  Object.keys(windDragonState).forEach((k) => { delete windDragonState[k]; });
  updateTileUI();
  renderWinningConditions();
  renderHandPatterns();
  renderWindDragonPoints();
}

// Event listeners
['clear-tiles', 'clear-hand-top'].forEach((id) => {
  const btn = $(id);
  if (btn) btn.addEventListener('click', clearHand);
});

function setMeldMode(mode: 'chow' | 'pung' | 'kong' | null) {
  activeMeldMode = activeMeldMode === mode ? null : mode;
  chowSelection = [];
  updateTileUI();
}

['chow', 'pung', 'kong'].forEach((mode) => {
  const btn = $(`meld-${mode}`);
  if (btn) {
    btn.addEventListener('click', () => {
      setMeldMode(mode as 'chow' | 'pung' | 'kong');
    });
  }
});

const copyHand = $('copy-hand');
if (copyHand) {
  copyHand.addEventListener('click', copyHandToClipboard);
}

const seatWindEl = $('seat-wind');
if (seatWindEl) {
  seatWindEl.addEventListener('change', (e) => {
    seatWind = (e.target as HTMLSelectElement).value;
    renderWindDragonPoints();
    renderFlowerPoints();
  });
}

function getUrlTableWind(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('table-wind');
}

function setUrlTableWind(value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('table-wind', value);
  history.replaceState(null, '', url.toString());
}

const tableWindEl = $('table-wind') as HTMLSelectElement | null;
if (tableWindEl) {
  const urlWind = getUrlTableWind();
  if (urlWind && ['e', 's', 'w', 'n'].includes(urlWind)) {
    tableWind = urlWind;
    tableWindEl.value = tableWind;
  }
  tableWindEl.addEventListener('change', (e) => {
    tableWind = (e.target as HTMLSelectElement).value;
    setUrlTableWind(tableWind);
    renderWindDragonPoints();
    renderFlowerPoints();
  });
}

const potentialToggle = $('potential-toggle');
const potentialModal = $('potential-modal');
const potentialClose = $('potential-close');

function openPotentialModal() {
  if (potentialModal) potentialModal.style.display = 'flex';
}
function closePotentialModal() {
  if (potentialModal) potentialModal.style.display = 'none';
}

if (potentialToggle) potentialToggle.addEventListener('click', openPotentialModal);
if (potentialClose) potentialClose.addEventListener('click', closePotentialModal);
if (potentialModal) {
  potentialModal.addEventListener('click', (e) => {
    if (e.target === potentialModal) closePotentialModal();
  });
}

const conditionModal = $('condition-modal');
const conditionModalTitle = $('condition-modal-title');
const conditionModalDesc = $('condition-modal-desc');
const conditionModalClose = $('condition-modal-close');

function openConditionModal(title: string, desc: string) {
  if (conditionModalTitle) conditionModalTitle.textContent = title;
  if (conditionModalDesc) conditionModalDesc.textContent = desc;
  if (conditionModal) conditionModal.style.display = 'flex';
}
function closeConditionModal() {
  if (conditionModal) conditionModal.style.display = 'none';
}
if (conditionModalClose) conditionModalClose.addEventListener('click', closeConditionModal);
if (conditionModal) {
  conditionModal.addEventListener('click', (e) => {
    if (e.target === conditionModal) closeConditionModal();
  });
}

// Mini hand visibility tracks the hidden state of the main fan reference panel.
window.addEventListener('fanreferencevisibility', () => updateMiniHandVisibility());

const miniHandClear = $('mini-hand-clear');
if (miniHandClear) miniHandClear.addEventListener('click', clearHand);

// Initialize
renderTileSelector();
renderWinningConditions();
renderHandPatterns();
renderWindDragonPoints();

document.querySelectorAll('.tile-panel.collapsible .panel-title').forEach((title) => {
  const panel = title.closest('.tile-panel');
  const list = panel?.querySelector('.hand-list');
  const id = list?.id;
  if (!id) return;
  title.addEventListener('click', () => {
    if (collapsedSections.has(id)) {
      collapsedSections.delete(id);
    } else {
      collapsedSections.add(id);
    }
    panel.classList.toggle('collapsed');
  });
});
