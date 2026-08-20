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
  windArcherScenarios,
  detectWindArcherFaan,
  getWindArcherFan,
  winningConditions,
  type LockedGroup,
} from './points-calculator';

function $(id: string) { return document.getElementById(id); }

// Google Form pre-fill configuration.
// Create a Google Form with these fields, then replace the placeholders below.
// Field entry IDs are found in the pre-filled URL (the numbers after "entry.").
const GOOGLE_FORM_CONFIG = {
  formId: 'YOUR_GOOGLE_FORM_ID',
  entries: {
    name: 'YOUR_NAME_ENTRY_ID',
    email: 'YOUR_EMAIL_ENTRY_ID',
    totalPoints: 'YOUR_TOTAL_POINTS_ENTRY_ID',
    totalTiles: 'YOUR_TOTAL_TILES_ENTRY_ID',
    tiles: 'YOUR_TILES_ENTRY_ID',
    checkedConditions: 'YOUR_CHECKED_CONDITIONS_ENTRY_ID',
    pungs: 'YOUR_PUNGS_ENTRY_ID',
    chows: 'YOUR_CHOWS_ENTRY_ID',
    kongs: 'YOUR_KONGS_ENTRY_ID',
    tableWind: 'YOUR_TABLE_WIND_ENTRY_ID',
    seatWind: 'YOUR_SEAT_WIND_ENTRY_ID',
  },
};

const selected: Record<string, number> = {}; // tile id -> count
const melds: LockedGroup[] = [];
let activeMeldMode: 'chow' | 'pung' | 'kong' | null = null;
let chowSelection: string[] = [];
const collapsedSections = new Set<string>();

function hasOpenMeld(): boolean {
  return melds.some((m) => m.type === 'chow' || m.type === 'pung' || m.type === 'kong');
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

function getArcherClass(id: string) {
  if (id === 'dr') return 'archer-red';
  if (id === 'dg') return 'archer-green';
  if (id === 'dw') return 'archer-blue';
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
      btn.className = 'tile' + (getArcherClass(t.id) ? ' ' + getArcherClass(t.id) : '');
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
  renderWindArcherPoints();
  renderFlowerPoints();
  renderWinningConditions();

  const checkoutHand = $('checkout-hand') as HTMLButtonElement | null;
  if (checkoutHand) checkoutHand.disabled = !isValidWinningHand(selected, melds) || getTotalFan() === 0;
  renderReferenceTotal();
  renderFanBreakdown();
}

function makeRemovableTile(t: { id: string; c: string; img: string }, isFlower: boolean, locked = false) {
  const span = document.createElement('span');
  span.className = 'tile selected' + (isFlower ? ' flower' : '') + (locked ? ' locked' : ' removable') + (getArcherClass(t.id) ? ' ' + getArcherClass(t.id) : '');
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

function updateMiniHandShadowOpacity(container: HTMLElement) {
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  const progress = maxScroll > 0 ? container.scrollLeft / maxScroll : 0;
  const opacity = 0.35 * (1 - progress);
  container.style.setProperty('--shadow-opacity', String(opacity));
}

function updateMiniHandScrollIndicator() {
  const content = $('mini-hand-content');
  if (!content) return;
  const container = content.querySelector('.mini-hand-tiles');
  if (!container) return;
  const canScroll = container.scrollWidth > container.clientWidth + 1;
  container.classList.toggle('can-scroll', canScroll);
  updateMiniHandShadowOpacity(container as HTMLElement);
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
  tilesContainer.addEventListener('scroll', () => {
    const canScroll = tilesContainer.scrollWidth > tilesContainer.clientWidth + 1;
    tilesContainer.classList.toggle('can-scroll', canScroll);
    updateMiniHandShadowOpacity(tilesContainer);
  });
  updateMiniHandVisibility();
  updateMiniHandScrollIndicator();
}

window.addEventListener('fanreferencevisibility', () => {
  updateMiniHandScrollIndicator();
});
window.addEventListener('resize', () => {
  updateMiniHandScrollIndicator();
});

// ---------- Game context ----------

let seatWind = 'e';
let tableWind = 'e';

// ---------- Flower fan ----------

const flowerIncluded: Record<string, boolean> = {};
let seatFlowerOverride: number | null = null; // null = auto-detect, 0-2 = manual value

function highlightFanTable(fan: number) {
  document.querySelectorAll('#fan-table td').forEach((cell) => { cell.classList.remove('current'); });
  if (fan < 0) return;
  const fanRow = document.querySelector('#fan-table tr:first-child');
  const pointsRow = document.querySelector('#fan-table tr:nth-child(2)');
  if (!fanRow || !pointsRow) return;
  let fanCell: Element | null;
  let pointsCell: Element | null;
  if (fan <= 12) {
    fanCell = fanRow.querySelector('td:nth-child(' + (fan + 2) + ')');
    pointsCell = pointsRow.querySelector('td:nth-child(' + (fan + 2) + ')');
  } else {
    fanCell = fanRow.querySelector('td:last-child');
    pointsCell = pointsRow.querySelector('td:last-child');
  }
  if (fanCell) fanCell.classList.add('current');
  if (pointsCell) pointsCell.classList.add('current');
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
  const windArcherTotal = getWindArcherFan(windArcherState, selected, seatWind, tableWind);
  let total: number;
  if (handResult.limit) {
    total = Math.min(13, handResult.fan + winningFan);
  } else {
    total = Math.min(13, handResult.fan + windArcherTotal + flowerTotal + winningFan);
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
    fan.textContent = formatFan(value);

    item.appendChild(info);
    item.appendChild(fan);
    container.appendChild(item);
  });

  const summary = $('flower-summary');
  if (summary) {
    let breakdown: string;
    if (handResult.limit) {
      breakdown = 'Limit hand: ' + handResult.limitName + ' (' + formatFan(handResult.fan) + ')';
      if (winningFan > 0) breakdown += ' + Winning conditions: ' + formatFan(winningFan);
      breakdown += ' = ' + formatFan(total);
    } else {
      breakdown = 'Hand patterns: ' + formatFan(handResult.fan);
      if (windArcherTotal > 0) breakdown += ' + Wind & Archer: ' + formatFan(windArcherTotal);
      if (flowerTotal > 0) breakdown += ' + Flower: ' + formatFan(flowerTotal);
      if (winningFan > 0) breakdown += ' + Winning conditions: ' + formatFan(winningFan);
      breakdown += ' = ' + formatFan(total);
    }
    summary.textContent = breakdown;
  }

  const flowerPanel = container.closest('.tile-panel');
  if (flowerPanel) {
    flowerPanel.classList.toggle('collapsed', flowerTotal === 0 || collapsedSections.has('flower-scenarios'));
  }

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
    addTag(p.name + ' (' + formatFan(p.fan) + ')');
  });

  if (!handResult.limit) {
    const windArcherDetected = detectWindArcherFaan(selected, seatWind, tableWind);
    windArcherScenarios.forEach((s) => {
      if (s.stepper) {
        const value = (windArcherState[s.id] as number | undefined) ?? 0;
        if (value > 0) addTag(s.name + ' (' + formatFan(value) + ')');
      } else if (windArcherState[s.id] && windArcherDetected[s.id]!.applies) {
        addTag(s.name + ' (' + formatFan(windArcherDetected[s.id]!.fan) + ')');
      }
    });

    const flowerDetected = calculateFlowerScenarios(selected, seatWind);
    const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
    flowerScenarios.forEach((s) => {
      if (s.id === 'seat-flower') {
        if (seatFlowerValue > 0) addTag(s.name + ' (' + formatFan(seatFlowerValue) + ')');
      } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
        addTag(s.name + ' (' + formatFan(flowerDetected[s.id]!.fan) + ')');
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
    addTag(c.name + ' (' + formatFan(c.fan) + ')');
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
  archerOverride = null;
  Object.keys(winningConditionState).forEach((k) => { delete winningConditionState[k]; });
  Object.keys(handPatternState).forEach((k) => { delete handPatternState[k]; });
  Object.keys(windArcherState).forEach((k) => { delete windArcherState[k]; });

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
      note.textContent = 'Limit hands cannot gain fan beyond their hand fan value.';
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
    fan.textContent = formatFan(p.fan);

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
      summary.textContent = 'Limit hand: ' + handResult.limitName + ' = ' + formatFan(handResult.fan);
    } else {
      summary.textContent = 'Hand pattern fan total: ' + formatFan(handResult.fan);
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
      : 'No potential scoring hands based on existing tiles. You can potentially earn situational fan.';
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
    fan.textContent = formatFan(p.fan);

    meta.appendChild(note);
    meta.appendChild(fan);

    item.appendChild(info);
    item.appendChild(meta);
    container.appendChild(item);
  });
}

// ---------- Wind & Archer fan ----------

const windArcherState: Record<string, boolean | number> = {};
let archerOverride: number | null = null; // null = auto-detect, 0-3 = manual value

function renderWindArcherPoints() {
  const container = $('wind-archer-scenarios');
  if (!container) return;
  container.innerHTML = '';

  const detected = detectWindArcherFaan(selected, seatWind, tableWind);

  windArcherScenarios.forEach((s) => {
    const scenario = detected[s.id]!;
    if (s.stepper) {
      archerOverride = scenario.fan;
      windArcherState[s.id] = scenario.fan;
    } else {
      windArcherState[s.id] = scenario.applies;
    }
  });

  const windArcherTotal = getWindArcherFan(windArcherState, selected, seatWind, tableWind);

  windArcherScenarios.forEach((s) => {
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
    fan.textContent = formatFan(scenario.fan);

    item.appendChild(info);
    item.appendChild(fan);
    container.appendChild(item);
  });

  const summary = $('wind-archer-summary');
  if (summary) summary.textContent = 'Wind & Archer fan total: ' + formatFan(windArcherTotal);

  const windArcherPanel = container.closest('.tile-panel');
  if (windArcherPanel) {
    windArcherPanel.classList.toggle('collapsed', windArcherTotal === 0 || collapsedSections.has('wind-archer-scenarios'));
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
  if (concealedExcluded) {
    winningConditionState['concealed'] = false;
  } else if (winningConditionState['concealed'] === undefined) {
    winningConditionState['concealed'] = true;
  }
  const stats = getHandStats(selected);
  const hasKongOrFlower = stats.potentialKongs > 0 || stats.flowers > 0;
  const kongOrFlowerRequiredIds = ['win-by-kong', 'win-by-double-kong'];
  winningConditions.forEach((c) => {
    const disabledByKong = kongOrFlowerRequiredIds.indexOf(c.id) !== -1 && !hasKongOrFlower;
    const disabledByOpenMeld = c.id === 'concealed' && concealedExcluded;
    if ((disabledByKong || disabledByOpenMeld) && winningConditionState[c.id]) {
      winningConditionState[c.id] = false;
    }

    const isDisabled = disabledByOpenMeld || disabledByKong;
    const label = document.createElement('label');
    label.className = 'win-condition' + (c.highlight ? ' highlight' : '') + (isDisabled ? ' disabled' : '');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!winningConditionState[c.id];
    checkbox.disabled = isDisabled;
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
    fan.textContent = formatFan(c.fan);

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

function formatFan(fan: number): string {
  return `${fan} fan`;
}

function getTotalFan(): number {
  const handResult = getHandPatternFan(handPatternState);
  const winningFan = getWinningConditionFan();
  const windArcherTotal = getWindArcherFan(windArcherState, selected, seatWind, tableWind);
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
  let flowerTotal = seatFlowerValue;
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') return;
    if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) flowerTotal += s.fan;
  });
  return handResult.limit
    ? Math.min(13, handResult.fan + winningFan)
    : Math.min(13, handResult.fan + windArcherTotal + flowerTotal + winningFan);
}

function renderReferenceTotal() {
  const el = $('fan-reference-total');
  if (!el) return;
  const totalFan = getTotalFan();
  el.textContent = formatFan(totalFan);
  highlightFanTable(totalFan);
}

function renderFanBreakdown() {
  const container = $('fan-breakdown');
  if (!container) return;
  container.innerHTML = '';

  const handResult = getHandPatternFan(handPatternState);
  const winningFan = getWinningConditionFan();
  const windArcherTotal = getWindArcherFan(windArcherState, selected, seatWind, tableWind);
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
  let flowerTotal = seatFlowerValue;
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') return;
    if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) flowerTotal += s.fan;
  });

  const totalFan = getTotalFan();

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
    value.textContent = formatFan(points);

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

  const windArcherTags: { text: string; desc: string }[] = [];
  if (!handResult.limit) {
    const windArcherDetected = detectWindArcherFaan(selected, seatWind, tableWind);
    windArcherScenarios.forEach((s) => {
      if (s.stepper) {
        const value = (windArcherState[s.id] as number | undefined) ?? 0;
        if (value > 0) windArcherTags.push({ text: s.name + ' (' + formatFan(value) + ')', desc: s.desc });
      } else if (windArcherState[s.id] && windArcherDetected[s.id]!.applies) {
        windArcherTags.push({ text: s.name + ' (' + formatFan(windArcherDetected[s.id]!.fan) + ')', desc: s.desc });
      }
    });
  }

  const flowerTags: { text: string; desc: string }[] = [];
  if (!handResult.limit) {
    flowerScenarios.forEach((s) => {
      if (s.id === 'seat-flower') {
        if (seatFlowerValue > 0) flowerTags.push({ text: s.name + ' (' + formatFan(seatFlowerValue) + ')', desc: s.desc });
      } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
        flowerTags.push({ text: s.name + ' (' + formatFan(flowerDetected[s.id]!.fan) + ')', desc: s.desc });
      }
    });
  }

  addSection('Hand patterns', handResult.fan, false, handTags);
  addSection('Winning conditions', winningFan, false, winningTags);
  addSection('Wind & Archer fan', windArcherTotal, handResult.limit, windArcherTags);
  addSection('Flower fan', flowerTotal, handResult.limit, flowerTags);

  const totalRow = document.createElement('div');
  totalRow.className = 'fan-breakdown-total-row';
  const totalLabel = document.createElement('span');
  totalLabel.className = 'fan-breakdown-total-label';
  totalLabel.textContent = 'Total fan';
  const totalValue = document.createElement('span');
  totalValue.className = 'fan-breakdown-total';
  totalValue.textContent = formatFan(totalFan);
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalValue);
  container.appendChild(totalRow);
}

interface CheckoutSummary {
  totalPoints: number;
  totalFan: number;
  totalTiles: number;
  tiles: string;
  checkedConditions: string[];
  pungs: number;
  chows: number;
  kongs: number;
  melds: { type: string; tiles: string }[];
  tableWind: string;
  seatWind: string;
}

function getWindLabel(value: string): string {
  return ({ e: 'East', s: 'South', w: 'West', n: 'North' } as Record<string, string>)[value] ?? value;
}

function getCheckoutSummary(): CheckoutSummary {
  const tiles = getSortedTiles(selected);
  const totalTiles = tiles.length;

  const checkedConditions: string[] = [];
  handPatterns.forEach((p) => {
    if (handPatternState[p.id]) checkedConditions.push(p.name + ' (' + formatFan(p.fan) + ')');
  });
  const windArcherDetected = detectWindArcherFaan(selected, seatWind, tableWind);
  windArcherScenarios.forEach((s) => {
    if (s.stepper) {
      const value = (windArcherState[s.id] as number | undefined) ?? 0;
      if (value > 0) checkedConditions.push(s.name + ' (' + formatFan(value) + ')');
    } else if (windArcherState[s.id] && windArcherDetected[s.id]!.applies) {
      checkedConditions.push(s.name + ' (' + formatFan(windArcherDetected[s.id]!.fan) + ')');
    }
  });
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') {
      const value = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
      if (value > 0) checkedConditions.push(s.name + ' (' + formatFan(value) + ')');
    } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
      checkedConditions.push(s.name + ' (' + formatFan(flowerDetected[s.id]!.fan) + ')');
    }
  });
  winningConditions.forEach((c) => {
    if (winningConditionState[c.id]) checkedConditions.push(c.name + ' (' + formatFan(c.fan) + ')');
  });

  const pungs = melds.filter((m) => m.type === 'pung').length;
  const chows = melds.filter((m) => m.type === 'chow').length;
  const kongs = melds.filter((m) => m.type === 'kong').length;
  const meldDetails = melds.map((m) => ({
    type: m.type.toUpperCase(),
    tiles: m.tiles.map((id) => findTile(id)?.c ?? id).join(' '),
  }));

  const freeSelected = getFreeSelected();
  const freeTiles = getSortedTiles(freeSelected).filter((t) => !isBonusTile(t.id));
  const freeTileStrs = freeTiles.map((t) => t.c);
  const bonusTiles = tiles.filter((t) => isBonusTile(t.id));
  const bonusTileStrs = bonusTiles.map((t) => t.c);

  const meldParts = meldDetails.map((m) => `${m.type}[ ${m.tiles} ]`);
  const structuredTiles = [
    ...meldParts,
    ...(freeTileStrs.length ? freeTileStrs : []),
    ...(bonusTileStrs.length ? ['|', ...bonusTileStrs] : []),
  ].join(' ') || 'None';

  const totalFan = getTotalFan();
  return {
    totalPoints: fanToPoints(totalFan),
    totalFan,
    totalTiles,
    tiles: structuredTiles,
    checkedConditions,
    pungs,
    chows,
    kongs,
    melds: meldDetails,
    tableWind: getWindLabel(tableWind),
    seatWind: getWindLabel(seatWind),
  };
}

function buildGoogleFormPrefillUrl(name: string, email: string, summary: CheckoutSummary): string {
  const base = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_CONFIG.formId}/viewform`;
  const params = new URLSearchParams({ usp: 'pp_url' });
  const e = GOOGLE_FORM_CONFIG.entries;

  function add(entryId: string, value: string) {
    if (entryId && !entryId.startsWith('YOUR_')) {
      params.append(`entry.${entryId}`, value);
    }
  }

  add(e.name, name);
  add(e.email, email);
  add(e.totalPoints, String(summary.totalPoints));
  add(e.totalTiles, String(summary.totalTiles));
  add(e.tiles, summary.tiles);
  add(e.checkedConditions, summary.checkedConditions.join('\n'));
  add(e.pungs, String(summary.pungs));
  add(e.chows, String(summary.chows));
  add(e.kongs, String(summary.kongs));
  add(e.tableWind, summary.tableWind);
  add(e.seatWind, summary.seatWind);

  return `${base}?${params.toString()}`;
}

function renderCheckoutDetails() {
  const container = $('checkout-details');
  if (!container) return;
  const summary = getCheckoutSummary();

  const conditionsHtml = summary.checkedConditions.length
    ? `<ul>${summary.checkedConditions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`
    : '<p>No conditions selected.</p>';

  container.innerHTML = `
    <h4>Hand summary</h4>
    <p><strong>Total fan:</strong> ${formatFan(summary.totalFan)}</p>
    <p><strong>Total points:</strong> ${summary.totalPoints}</p>
    <p><strong>Total tiles:</strong> ${summary.totalTiles}</p>
    <p><strong>Tiles:</strong> ${summary.tiles || 'None'}</p>
    <p><strong>Table wind:</strong> ${summary.tableWind}</p>
    <p><strong>Seat wind:</strong> ${summary.seatWind}</p>
    <h4>Checked conditions</h4>
    ${conditionsHtml}
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function copyCheckoutDetailsToClipboard() {
  const summary = getCheckoutSummary();
  const name = ($('checkout-name') as HTMLInputElement | null)?.value.trim() ?? '';
  const email = ($('checkout-email') as HTMLInputElement | null)?.value.trim() ?? '';

  const lines: string[] = [
    'Name: ' + (name || 'Not provided'),
    'Email: ' + (email || 'Not provided'),
    'Total fan: ' + formatFan(summary.totalFan),
    'Total points: ' + summary.totalPoints,
    'Total tiles: ' + summary.totalTiles,
    'Tiles: ' + (summary.tiles || 'None'),
    'Table wind: ' + summary.tableWind,
    'Seat wind: ' + summary.seatWind,
  ];
  if (summary.checkedConditions.length) {
    lines.push('Checked conditions:');
    summary.checkedConditions.forEach((c) => lines.push('- ' + c));
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    alert('Hand details copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

function openCheckoutModal() {
  const modal = $('checkout-modal');
  if (!modal) return;
  renderCheckoutDetails();
  modal.style.display = 'flex';
  ($('checkout-name') as HTMLInputElement | null)?.focus();
}

function closeCheckoutModal() {
  const modal = $('checkout-modal');
  if (modal) modal.style.display = 'none';
}

function submitCheckout(e: Event) {
  e.preventDefault();
  const name = ($('checkout-name') as HTMLInputElement | null)?.value.trim() ?? '';
  const email = ($('checkout-email') as HTMLInputElement | null)?.value.trim() ?? '';
  if (!name || !email) {
    alert('Please enter your name and email.');
    return;
  }

  const summary = getCheckoutSummary();
  const url = buildGoogleFormPrefillUrl(name, email, summary);

  if (GOOGLE_FORM_CONFIG.formId.startsWith('YOUR_')) {
    alert('Google Form is not configured yet. Copy the hand details and share them manually.');
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  closeCheckoutModal();
}

function clearHand() {
  Object.keys(selected).forEach((k) => { delete selected[k]; });
  melds.length = 0;
  activeMeldMode = null;
  chowSelection = [];
  seatFlowerOverride = null;
  archerOverride = null;
  Object.keys(winningConditionState).forEach((k) => { delete winningConditionState[k]; });
  Object.keys(handPatternState).forEach((k) => { delete handPatternState[k]; });
  Object.keys(windArcherState).forEach((k) => { delete windArcherState[k]; });
  updateTileUI();
  renderWinningConditions();
  renderHandPatterns();
  renderWindArcherPoints();
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

const checkoutHand = $('checkout-hand');
if (checkoutHand) {
  checkoutHand.addEventListener('click', openCheckoutModal);
}

const checkoutModal = $('checkout-modal');
const checkoutModalClose = $('checkout-modal-close');
const checkoutForm = $('checkout-form');
const checkoutCopy = $('checkout-copy');

if (checkoutModalClose) checkoutModalClose.addEventListener('click', closeCheckoutModal);
if (checkoutModal) {
  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) closeCheckoutModal();
  });
}
if (checkoutForm) checkoutForm.addEventListener('submit', submitCheckout);
if (checkoutCopy) checkoutCopy.addEventListener('click', copyCheckoutDetailsToClipboard);

const seatWindEl = $('seat-wind');
if (seatWindEl) {
  seatWindEl.addEventListener('change', (e) => {
    seatWind = (e.target as HTMLSelectElement).value;
    renderWindArcherPoints();
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
    renderWindArcherPoints();
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
renderWindArcherPoints();

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
    if (panel) panel.classList.toggle('collapsed');
  });
});
