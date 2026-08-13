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
} from './points-calculator';

function $(id: string) { return document.getElementById(id); }

const selected: Record<string, number> = {}; // tile id -> count

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
      const glyph = document.createElement('span');
      glyph.className = 'tile-glyph';
      glyph.textContent = t.c;
      const sub = document.createElement('span');
      sub.className = 'tile-label';
      sub.textContent = getTileLabel(t.id);
      btn.appendChild(glyph);
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
    btn.classList.toggle('selected', count > 0);
    btn.classList.toggle('maxed', count >= tileDef.max);
    let badge = btn.querySelector('.count');
    if (count > 1) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'count'; btn.appendChild(badge); }
      badge.textContent = String(count);
    } else if (badge) {
      badge.remove();
    }
  });
  renderReferenceHand();
  renderPotentialHands();
  renderHandPatterns();
  renderWindDragonPoints();
  renderFlowerPoints();

  const copyHand = $('copy-hand') as HTMLButtonElement | null;
  if (copyHand) copyHand.disabled = !isValidWinningHand(selected) || getTotalFan() === 0;
  renderReferenceTotal();
}

function makeRemovableTile(t: { id: string; c: string }, isFlower: boolean) {
  const span = document.createElement('span');
  span.className = 'tile selected' + (isFlower ? ' flower' : '') + ' removable' + (getDragonClass(t.id) ? ' ' + getDragonClass(t.id) : '');
  span.title = 'Tap to remove';
  const glyph = document.createElement('span');
  glyph.className = 'tile-glyph';
  glyph.textContent = t.c;
  const sub = document.createElement('span');
  sub.className = 'tile-label';
  sub.textContent = getTileLabel(t.id);
  span.appendChild(glyph);
  span.appendChild(sub);
  span.addEventListener('click', () => { removeTile(t.id); });
  return span;
}

function removeTile(id: string) {
  if (!selected[id]) return;
  selected[id] = (selected[id] || 0) - 1;
  if ((selected[id] || 0) <= 0) delete selected[id];
  updateTileUI();
}

function renderReferenceHand() {
  const content = $('fan-reference-hand-content');
  if (!content) return;
  content.innerHTML = '';

  const tiles = getSortedTiles(selected);
  const mainTiles = tiles.filter((t) => !isBonusTile(t.id));
  const bonusTiles = tiles.filter((t) => isBonusTile(t.id));

  if (tiles.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'fan-reference-hand-empty';
    empty.textContent = 'No tiles selected';
    content.appendChild(empty);
    return;
  }

  const tilesContainer = document.createElement('span');
  tilesContainer.className = 'fan-reference-hand-tiles';
  mainTiles.forEach((t) => {
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

  const hasFlowers = getHandStats(selected).flowers > 0;
  if (!hasFlowers && seatFlowerOverride !== null) seatFlowerOverride = null;
  const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : detected['seat-flower']!.fan;

  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') return;
    if (detected[s.id]!.applies && flowerIncluded[s.id] === undefined) {
      flowerIncluded[s.id] = true;
    }
  });

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
    let active = false;

    if (isSeatFlower) {
      active = seatFlowerValue > 0;
    } else {
      active = !!flowerIncluded[s.id] && applies;
    }

    const item = document.createElement('label');
    const isCommon = s.id === 'no-flowers' || s.id === 'seat-flower';
    item.className = 'hand-item' + (isCommon ? ' important' : (active ? ' auto-detected' : ''));

    if (isSeatFlower) {
      const stepper = document.createElement('div');
      stepper.className = 'stepper';
      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'stepper-btn';
      minusBtn.textContent = '−';
      const valueSpan = document.createElement('span');
      valueSpan.className = 'stepper-value';
      valueSpan.textContent = String(value);
      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'stepper-btn';
      plusBtn.textContent = '+';
      minusBtn.disabled = value === 0;
      plusBtn.disabled = !hasFlowers || value >= 2;
      minusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (value > 0) {
          seatFlowerOverride = value - 1;
          renderFlowerPoints();
        }
      });
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (hasFlowers && value < 2) {
          seatFlowerOverride = value + 1;
          renderFlowerPoints();
        }
      });
      stepper.appendChild(minusBtn);
      stepper.appendChild(valueSpan);
      stepper.appendChild(plusBtn);
      item.appendChild(stepper);
    } else {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = active;
      checkbox.disabled = !applies;
      checkbox.addEventListener('change', () => {
        flowerIncluded[s.id] = checkbox.checked;
        renderFlowerPoints();
      });
      item.appendChild(checkbox);
    }

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
    fan.textContent = value + ' fan';

    item.appendChild(info);
    item.appendChild(fan);
    container.appendChild(item);
  });

  const summary = $('flower-summary');
  if (summary) {
    let breakdown: string;
    if (handResult.limit) {
      breakdown = 'Limit hand: ' + handResult.limitName + ' (' + handResult.fan + ' fan)';
      if (winningFan > 0) breakdown += ' + Winning conditions: ' + winningFan;
      breakdown += ' = ' + total + ' fan';
    } else {
      breakdown = 'Hand patterns: ' + handResult.fan;
      if (windDragonTotal > 0) breakdown += ' + Wind & Dragon: ' + windDragonTotal;
      if (flowerTotal > 0) breakdown += ' + Flower fan: ' + flowerTotal;
      if (winningFan > 0) breakdown += ' + Winning conditions: ' + winningFan;
      breakdown += ' = ' + total + ' fan';
    }
    summary.textContent = breakdown;
  }
  renderCheckedConditions();
  highlightFanTable(total);
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

  const detectedPatterns = detectHandPatterns(selected);
  handPatterns.forEach((p) => {
    const active = !!handPatternState[p.id] && (detectedPatterns[p.id] || !p.auto);
    if (!active) return;
    if (handResult.limit) {
      if (!p.limit || p.name !== handResult.limitName) return;
    } else if (p.limit) {
      return;
    }
    addTag(p.name + ' (' + p.fan + ')');
  });

  if (!handResult.limit) {
    const windDragonDetected = detectWindDragonFaan(selected, seatWind, tableWind);
    windDragonScenarios.forEach((s) => {
      if (s.stepper) {
        const value = (windDragonState[s.id] as number | undefined) ?? 0;
        if (value > 0) addTag(s.name + ' (' + value + ')');
      } else if (windDragonState[s.id] && windDragonDetected[s.id]!.applies) {
        addTag(s.name + ' (' + windDragonDetected[s.id]!.fan + ')');
      }
    });

    const flowerDetected = calculateFlowerScenarios(selected, seatWind);
    const seatFlowerValue = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
    flowerScenarios.forEach((s) => {
      if (s.id === 'seat-flower') {
        if (seatFlowerValue > 0) addTag(s.name + ' (' + seatFlowerValue + ')');
      } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
        addTag(s.name + ' (' + flowerDetected[s.id]!.fan + ')');
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
    addTag(c.name + ' (' + c.fan + ')');
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

  const detected = detectHandPatterns(selected);
  const isComplete = isValidWinningHand(selected);
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

    const item = document.createElement('label');
    const highlightedIds = ['common-hand', 'all-triplets', 'mixed-one-suit'];
    item.className = 'hand-item' + (highlightedIds.includes(p.id) ? ' important' : '') + (active ? ' auto-detected' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = active;
    checkbox.disabled = !applies;
    checkbox.addEventListener('change', () => {
      handPatternState[p.id] = checkbox.checked;
      renderHandPatterns();
      renderWinningConditions();
      renderFlowerPoints();
    });

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
    fan.textContent = p.fan + ' fan';

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

    item.appendChild(checkbox);
    item.appendChild(info);
    item.appendChild(fan);
    item.appendChild(sampleBtn);
    container.appendChild(item);
  });

  const summary = $('hand-pattern-summary');
  if (summary) {
    if (handResult.limit) {
      summary.textContent = 'Limit hand: ' + handResult.limitName + ' = ' + handResult.fan + ' fan';
    } else {
      summary.textContent = 'Hand pattern fan total: ' + handResult.fan;
    }
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

  const potential = analyzePotentialHands(selected);

  if (potential.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fan-condition-empty';
    empty.textContent = Object.keys(selected).length === 0
      ? 'Select tiles to see potential hands.'
      : 'No potential fan scoring hands based on existing tiles. You can potentially earn situational fan.';
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
    fan.textContent = p.fan + ' fan';

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
    if (!s.stepper && detected[s.id]!.applies && windDragonState[s.id] === undefined) {
      windDragonState[s.id] = true;
    }
  });

  const windDragonTotal = getWindDragonFan(windDragonState, selected, seatWind, tableWind);

  windDragonScenarios.forEach((s) => {
    const scenario = detected[s.id]!;

    const item = document.createElement('label');
    item.className = 'hand-item' + (s.stepper ? '' : (windDragonState[s.id] ? ' auto-detected' : ''));

    if (s.stepper) {
      const max = scenario.fan;
      const autoValue = max;
      const value = dragonOverride !== null ? Math.min(dragonOverride, max) : autoValue;

      const stepper = document.createElement('div');
      stepper.className = 'stepper';
      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'stepper-btn';
      minusBtn.textContent = '−';
      const valueSpan = document.createElement('span');
      valueSpan.className = 'stepper-value';
      valueSpan.textContent = String(value);
      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'stepper-btn';
      plusBtn.textContent = '+';
      minusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (value > 0) {
          dragonOverride = value - 1;
          renderWindDragonPoints();
          renderFlowerPoints();
        }
      });
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (value < max) {
          dragonOverride = value + 1;
          renderWindDragonPoints();
          renderFlowerPoints();
        }
      });
      stepper.appendChild(minusBtn);
      stepper.appendChild(valueSpan);
      stepper.appendChild(plusBtn);
      item.appendChild(stepper);

      windDragonState[s.id] = value;
    } else {
      const active = !!windDragonState[s.id] && scenario.applies;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = active;
      checkbox.disabled = !scenario.applies;
      checkbox.addEventListener('change', () => {
        windDragonState[s.id] = checkbox.checked;
        renderWindDragonPoints();
        renderFlowerPoints();
      });
      item.appendChild(checkbox);
    }

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
    fan.textContent = (s.stepper ? (dragonOverride !== null ? dragonOverride : scenario.fan) : scenario.fan) + ' fan';

    item.appendChild(info);
    item.appendChild(fan);
    container.appendChild(item);
  });

  const summary = $('wind-dragon-summary');
  if (summary) summary.textContent = 'Wind & Dragon fan total: ' + windDragonTotal;
}

// ---------- Winning conditions ----------

const winningConditionState: Record<string, boolean> = {};

function getWinningConditionFan() {
  let total = 0;
  const concealedExcluded =
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
  const concealedExcluded = isStrictlyConcealedHand(handPatternState);
  const stats = getHandStats(selected);
  const hasKong = stats.potentialKongs > 0;
  const kongRequiredIds = ['win-by-kong', 'win-by-double-kong'];
  winningConditions.forEach((c) => {
    const disabledByKong = kongRequiredIds.indexOf(c.id) !== -1 && !hasKong;
    if (disabledByKong && winningConditionState[c.id]) {
      winningConditionState[c.id] = false;
    }

    const label = document.createElement('label');
    label.className = 'win-condition' + (c.highlight ? ' highlight' : '');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!winningConditionState[c.id];
    checkbox.disabled = (c.id === 'concealed' && concealedExcluded) || disabledByKong;
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
    fan.textContent = c.fan + ' fan';
    label.appendChild(checkbox);
    label.appendChild(info);
    label.appendChild(fan);
    container.appendChild(label);
  });
}

const POINTS_MAP = [0, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384];

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
  const totalPoints = POINTS_MAP[Math.min(totalFan, 13)];
  el.textContent = `${totalFan} fan / ${totalPoints} pts`;
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
    if (handPatternState[p.id]) conditions.push(p.name + ' (' + p.fan + ')');
  });
  const windDragonDetected = detectWindDragonFaan(selected, seatWind, tableWind);
  windDragonScenarios.forEach((s) => {
    if (s.stepper) {
      const value = (windDragonState[s.id] as number | undefined) ?? 0;
      if (value > 0) conditions.push(s.name + ' (' + value + ')');
    } else if (windDragonState[s.id] && windDragonDetected[s.id]!.applies) {
      conditions.push(s.name + ' (' + windDragonDetected[s.id]!.fan + ')');
    }
  });
  const flowerDetected = calculateFlowerScenarios(selected, seatWind);
  flowerScenarios.forEach((s) => {
    if (s.id === 'seat-flower') {
      const value = seatFlowerOverride !== null ? seatFlowerOverride : flowerDetected['seat-flower']!.fan;
      if (value > 0) conditions.push(s.name + ' (' + value + ')');
    } else if (flowerIncluded[s.id] && flowerDetected[s.id]!.applies) {
      conditions.push(s.name + ' (' + flowerDetected[s.id]!.fan + ')');
    }
  });
  winningConditions.forEach((c) => {
    if (winningConditionState[c.id]) conditions.push(c.name + ' (' + c.fan + ')');
  });

  if (conditions.length > 0) {
    lines.push('Checked conditions: ' + conditions.join(', '));
  }

  const totalFan = getTotalFan();
  const totalPoints = POINTS_MAP[Math.min(totalFan, 13)];
  lines.push(`Total: ${totalFan} fan (${totalPoints} points)`);

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

// Initialize
renderTileSelector();
renderWinningConditions();
renderHandPatterns();
renderWindDragonPoints();
