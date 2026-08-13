export interface TileDef {
  id: string;
  c: string;
  max: number;
}

export interface SuitGroup {
  label: string;
  tiles: TileDef[];
}

export const suits: SuitGroup[] = [
  {
    label: 'Characters',
    tiles: [
      { id: 'm1', c: '🀇', max: 4 },
      { id: 'm2', c: '🀈', max: 4 },
      { id: 'm3', c: '🀉', max: 4 },
      { id: 'm4', c: '🀊', max: 4 },
      { id: 'm5', c: '🀋', max: 4 },
      { id: 'm6', c: '🀌', max: 4 },
      { id: 'm7', c: '🀍', max: 4 },
      { id: 'm8', c: '🀎', max: 4 },
      { id: 'm9', c: '🀏', max: 4 },
    ],
  },
  {
    label: 'Bamboo',
    tiles: [
      { id: 's1', c: '🀐', max: 4 },
      { id: 's2', c: '🀑', max: 4 },
      { id: 's3', c: '🀒', max: 4 },
      { id: 's4', c: '🀓', max: 4 },
      { id: 's5', c: '🀔', max: 4 },
      { id: 's6', c: '🀕', max: 4 },
      { id: 's7', c: '🀖', max: 4 },
      { id: 's8', c: '🀗', max: 4 },
      { id: 's9', c: '🀘', max: 4 },
    ],
  },
  {
    label: 'Dots',
    tiles: [
      { id: 'p1', c: '🀙', max: 4 },
      { id: 'p2', c: '🀚', max: 4 },
      { id: 'p3', c: '🀛', max: 4 },
      { id: 'p4', c: '🀜', max: 4 },
      { id: 'p5', c: '🀝', max: 4 },
      { id: 'p6', c: '🀞', max: 4 },
      { id: 'p7', c: '🀟', max: 4 },
      { id: 'p8', c: '🀠', max: 4 },
      { id: 'p9', c: '🀡', max: 4 },
    ],
  },
  {
    label: 'Winds',
    tiles: [
      { id: 'we', c: '🀀', max: 4 },
      { id: 'ws', c: '🀁', max: 4 },
      { id: 'ww', c: '🀂', max: 4 },
      { id: 'wn', c: '🀃', max: 4 },
    ],
  },
  {
    label: 'Dragons',
    tiles: [
      { id: 'dr', c: '🀄\uFE0E', max: 4 },
      { id: 'dg', c: '🀅', max: 4 },
      { id: 'dw', c: '🀆', max: 4 },
    ],
  },
  {
    label: 'Flowers',
    tiles: [
      { id: 'f1', c: '🀢', max: 1 },
      { id: 'f2', c: '🀣', max: 1 },
      { id: 'f3', c: '🀤', max: 1 },
      { id: 'f4', c: '🀥', max: 1 },
    ],
  },
  {
    label: 'Seasons',
    tiles: [
      { id: 'n1', c: '🀦', max: 1 },
      { id: 'n2', c: '🀧', max: 1 },
      { id: 'n3', c: '🀨', max: 1 },
      { id: 'n4', c: '🀩', max: 1 },
    ],
  },
];

export interface ParsedTile {
  id: string;
  suit: string;
  rank: number;
}

export function parseTile(id: string): ParsedTile {
  return { id, suit: id.charAt(0), rank: parseInt(id.charAt(1), 10) };
}

export function getCounts(ids: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  ids.forEach((id) => {
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

export function idsFromTiles(tiles: { id: string }[]): string[] {
  return tiles.map((t) => t.id);
}

export function isSuited(id: string): boolean {
  const p = parseTile(id);
  return p.suit === 'm' || p.suit === 's' || p.suit === 'p';
}

export function nextId(id: string): string | null {
  const p = parseTile(id);
  if (!isSuited(id)) return null;
  return p.suit + (p.rank + 1);
}

export function isBonusTile(id: string): boolean {
  const suit = id.charAt(0);
  return suit === 'f' || suit === 'n';
}

export function findTile(id: string): TileDef | null {
  for (const suit of suits) {
    for (const tile of suit.tiles) {
      if (tile.id === id) return tile;
    }
  }
  return null;
}

export function getSortedTiles(selected: Record<string, number>): TileDef[] {
  const order: string[] = [];
  suits.forEach((s) => s.tiles.forEach((t) => order.push(t.id)));
  const tiles: TileDef[] = [];
  order.forEach((id) => {
    const count = selected[id] || 0;
    if (!count) return;
    const t = findTile(id);
    if (!t) return;
    for (let i = 0; i < count; i++) tiles.push(t);
  });
  return tiles;
}

export interface Decomposition {
  groups: { type: 'kong' | 'triplet' | 'sequence'; tile: string }[];
}

export function findDecompositions(nonFlowerIds: string[]): Decomposition[] {
  const results: Decomposition[] = [];
  const total = nonFlowerIds.length;
  if (total < 14) return results;
  const kongsAllowed = total - 14;
  const counts = getCounts(nonFlowerIds);
  const ids = Object.keys(counts);

  function remove(id: string, n: number) {
    counts[id] = (counts[id] || 0) - n;
    if (counts[id] === 0) delete counts[id];
  }
  function add(id: string, n: number) {
    counts[id] = (counts[id] || 0) + n;
  }

  function smallestId(): string | null {
    let min: string | null = null;
    ids.forEach((id) => {
      const c = counts[id] || 0;
      if (c > 0 && (min === null || id < min)) min = id;
    });
    return min;
  }

  function tryGroups(groupsLeft: number, kongsLeft: number, currentGroups: Decomposition['groups']) {
    if (groupsLeft === 0) {
      if (Object.keys(counts).length === 0) {
        results.push({ groups: currentGroups.slice() });
      }
      return;
    }
    const t = smallestId();
    if (!t) return;

    const countT = counts[t] || 0;

    // Kong
    if (kongsLeft > 0 && countT >= 4) {
      remove(t, 4);
      currentGroups.push({ type: 'kong', tile: t });
      tryGroups(groupsLeft - 1, kongsLeft - 1, currentGroups);
      currentGroups.pop();
      add(t, 4);
    }

    // Triplet
    if (countT >= 3) {
      remove(t, 3);
      currentGroups.push({ type: 'triplet', tile: t });
      tryGroups(groupsLeft - 1, kongsLeft, currentGroups);
      currentGroups.pop();
      add(t, 3);
    }

    // Sequence
    if (isSuited(t)) {
      const p = parseTile(t);
      if (p.rank <= 7) {
        const t2 = nextId(t)!;
        const t3 = nextId(t2)!;
        if ((counts[t2] || 0) > 0 && (counts[t3] || 0) > 0) {
          remove(t, 1);
          remove(t2, 1);
          remove(t3, 1);
          currentGroups.push({ type: 'sequence', tile: t });
          tryGroups(groupsLeft - 1, kongsLeft, currentGroups);
          currentGroups.pop();
          add(t, 1);
          add(t2, 1);
          add(t3, 1);
        }
      }
    }
  }

  ids.forEach((id) => {
    if ((counts[id] || 0) >= 2) {
      remove(id, 2);
      tryGroups(4, kongsAllowed, []);
      add(id, 2);
    }
  });

  return results;
}

export interface HandPattern {
  id: string;
  name: string;
  fan: number;
  desc: string;
  limit: boolean;
  auto: boolean;
}

export const handPatterns: HandPattern[] = [
  { id: 'common-hand', name: 'Common Hand (平糊)', fan: 1, desc: 'Every meld is a Chow (sequence).', limit: false, auto: true },
  { id: 'all-triplets', name: 'All in Triplets (對對糊)', fan: 3, desc: 'Every meld is a Pong or Kong.', limit: false, auto: true },
  { id: 'mixed-one-suit', name: 'Mixed One Suit (混一色)', fan: 3, desc: 'Only honor tiles and tiles from one suit.', limit: false, auto: true },
  { id: 'all-one-suit', name: 'All One Suit (清一色)', fan: 7, desc: 'All tiles from one suit.', limit: false, auto: true },
  { id: 'mixed-orphans', name: 'Mixed Orphans (花幺九)', fan: 1, desc: 'Pongs/Kongs of Ones, Nines, or Honor tiles only.', limit: false, auto: true },
  { id: 'small-dragons', name: 'Small Dragons (小三元)', fan: 3, desc: 'Melds of 2 dragons and a pair of the 3rd dragon.', limit: false, auto: true },
  { id: 'great-dragons', name: 'Great Dragons (大三元)', fan: 5, desc: 'Melds of all 3 dragons.', limit: false, auto: true },
  { id: 'small-winds', name: 'Small Winds (小四喜)', fan: 6, desc: 'Melds of 3 winds and a pair of the 4th wind.', limit: false, auto: true },
  { id: 'seven-pairs', name: 'Seven Pairs (七對子)', fan: 4, desc: 'Hand consists of seven pairs.', limit: false, auto: true },
  { id: 'all-honor-tiles', name: 'All Honor Tiles (字一色)', fan: 10, desc: 'All honor tiles.', limit: true, auto: true },
  { id: 'self-triplets', name: 'Self Triplets (四暗刻)', fan: 10, desc: 'Every meld is a concealed Pong or concealed Kong.', limit: true, auto: false },
  { id: 'orphans', name: 'Orphans (么九)', fan: 10, desc: 'Pongs/Kongs of Ones and Nines only.', limit: true, auto: true },
  { id: 'nine-gates', name: 'Nine Gates (九子連環)', fan: 10, desc: 'One suit 1112345678999, must be totally concealed.', limit: true, auto: true },
  { id: 'great-winds', name: 'Great Winds (大四喜)', fan: 13, desc: 'Melds of all 4 winds.', limit: true, auto: true },
  { id: 'all-kongs', name: 'All Kongs (十八羅漢)', fan: 13, desc: 'Hand containing four Kongs (and a pair).', limit: true, auto: true },
];

export function getMainTiles(selected: Record<string, number>): TileDef[] {
  return getSortedTiles(selected).filter((t) => !isBonusTile(t.id));
}

export function getMainIds(selected: Record<string, number>): string[] {
  return idsFromTiles(getMainTiles(selected));
}

export function isValidWinningHand(selected: Record<string, number>): boolean {
  const mainIds = getMainIds(selected);
  if (mainIds.length < 14) return false;
  const counts = getCounts(mainIds);
  const keys = Object.keys(counts);
  if (mainIds.length === 14 && keys.length === 7 && keys.every((id) => counts[id] === 2)) return true;
  return findDecompositions(mainIds).length > 0;
}

export function detectHandPatterns(selected: Record<string, number>): Record<string, boolean> {
  const detected: Record<string, boolean> = {};
  handPatterns.forEach((p) => {
    detected[p.id] = false;
  });

  const mainIds = getMainIds(selected);
  if (mainIds.length === 0 || !isValidWinningHand(selected)) return detected;

  const counts = getCounts(mainIds);
  const decomps = findDecompositions(mainIds);

  // Seven pairs
  if (mainIds.length === 14 && Object.keys(counts).length === 7 && Object.keys(counts).every((id) => counts[id] === 2)) {
    detected['seven-pairs'] = true;
  }

  // Suit/honor composition
  const suits: Record<string, number> = {};
  let hasHonor = false;
  mainIds.forEach((id) => {
    if (isSuited(id)) {
      const s = parseTile(id).suit;
      suits[s] = (suits[s] || 0) + 1;
    } else {
      hasHonor = true;
    }
  });
  const suitKeys = Object.keys(suits);

  if (!hasHonor && suitKeys.length === 1) detected['all-one-suit'] = true;
  if (hasHonor && suitKeys.length === 1) detected['mixed-one-suit'] = true;
  if (mainIds.every((id) => !isSuited(id))) detected['all-honor-tiles'] = true;

  // Decomposition-based patterns
  if (decomps.length > 0) {
    const hasTripletDecomp = decomps.some((d) => {
      return d.groups.every((g) => g.type === 'triplet' || g.type === 'kong');
    });
    if (hasTripletDecomp) detected['all-triplets'] = true;

    const hasCommonDecomp = decomps.some((d) => {
      return d.groups.every((g) => g.type === 'sequence');
    });
    if (hasCommonDecomp) detected['common-hand'] = true;

    const hasAllKongs = decomps.some((d) => {
      return d.groups.filter((g) => g.type === 'kong').length === 4;
    });
    if (hasAllKongs) detected['all-kongs'] = true;

    const isMixedOrphanTile = (id: string) => {
      if (!isSuited(id)) return true;
      return parseTile(id).rank === 1 || parseTile(id).rank === 9;
    };
    if (
      mainIds.every(isMixedOrphanTile) &&
      decomps.every((d) => d.groups.every((g) => g.type === 'triplet' || g.type === 'kong'))
    ) {
      detected['mixed-orphans'] = true;
    }

    const isOrphanTile = (id: string) => {
      if (!isSuited(id)) return false;
      return parseTile(id).rank === 1 || parseTile(id).rank === 9;
    };
    if (
      mainIds.every(isOrphanTile) &&
      decomps.every((d) => d.groups.every((g) => g.type === 'triplet' || g.type === 'kong'))
    ) {
      detected['orphans'] = true;
    }
  }

  // Dragon patterns
  const dragonIds = ['dr', 'dg', 'dw'];
  const dragonTrips = dragonIds.filter((id) => (counts[id] || 0) >= 3);
  const dragonPairs = dragonIds.filter((id) => (counts[id] || 0) === 2);
  if (dragonTrips.length === 3) detected['great-dragons'] = true;
  if (dragonTrips.length === 2 && dragonPairs.length === 1) detected['small-dragons'] = true;

  // Wind patterns
  const windIds = ['we', 'ws', 'ww', 'wn'];
  const windTrips = windIds.filter((id) => (counts[id] || 0) >= 3);
  const windPairs = windIds.filter((id) => (counts[id] || 0) === 2);
  if (windTrips.length === 4) detected['great-winds'] = true;
  if (windTrips.length === 3 && windPairs.length === 1) detected['small-winds'] = true;

  // Nine gates: one suit 1112345678999 plus one extra tile of the same suit
  if (!hasHonor && suitKeys.length === 1 && mainIds.length === 14) {
    const suit = suitKeys[0]!;
    let isNineGates = true;
    let higherCountRanks = 0;
    for (let r = 1; r <= 9; r++) {
      const c = counts[suit + r] || 0;
      if (r === 1 || r === 9) {
        if (c < 3 || c > 4) isNineGates = false;
        if (c === 4) higherCountRanks++;
      } else {
        if (c < 1 || c > 2) isNineGates = false;
        if (c === 2) higherCountRanks++;
      }
    }
    if (isNineGates && higherCountRanks === 1) detected['nine-gates'] = true;
  }

  return detected;
}

export function getHandStats(selected: Record<string, number>): { total: number; kongs: number; potentialKongs: number; flowers: number; max: number } {
  const tiles = getSortedTiles(selected);
  const mainTiles = tiles.filter((t) => !isBonusTile(t.id));
  const flowers = tiles.length - mainTiles.length;
  const mainIds = idsFromTiles(mainTiles);
  const counts = getCounts(mainIds);

  const quadIds = Object.keys(counts).filter((id) => counts[id] === 4);
  const potentialKongs = quadIds.length;

  const honorQuadIds = quadIds.filter((id) => !isSuited(id));
  const suitedQuadIds = quadIds.filter(isSuited);

  let kongs = honorQuadIds.length;
  if (suitedQuadIds.length > 0 && mainIds.length >= 14) {
    const decomps = findDecompositions(mainIds);
    if (decomps.length > 0) {
      suitedQuadIds.forEach((id) => {
        let mustBeKong = true;
        decomps.forEach((d) => {
          const usedAsKong = d.groups.some((g) => g.type === 'kong' && g.tile === id);
          if (!usedAsKong) mustBeKong = false;
        });
        if (mustBeKong) kongs++;
      });
    }
  }

  return { total: tiles.length, kongs, potentialKongs, flowers, max: 14 + potentialKongs + flowers };
}

export function getHandPatternFan(state: Record<string, boolean>): { fan: number; limit: boolean; limitName: string | null } {
  let selectedLimit: HandPattern | undefined;
  let nonLimitFan = 0;

  handPatterns.forEach((p) => {
    if (!state[p.id]) return;
    if (p.limit) {
      if (selectedLimit === undefined || p.fan > selectedLimit.fan) selectedLimit = p;
    } else {
      nonLimitFan += p.fan;
    }
  });

  if (selectedLimit) return { fan: selectedLimit.fan, limit: true, limitName: selectedLimit.name };
  return { fan: nonLimitFan, limit: false, limitName: null };
}

const strictlyConcealedHandIds = ['seven-pairs', 'self-triplets', 'nine-gates'];

export function isStrictlyConcealedHand(state: Record<string, boolean>): boolean {
  return strictlyConcealedHandIds.some((id) => state[id]);
}

export interface FlowerScenario {
  id: string;
  name: string;
  fan: number;
  desc: string;
}

export const flowerScenarios: FlowerScenario[] = [
  { id: 'no-flowers', name: 'No Flowers (无花)', fan: 1, desc: 'Have no flowers or seasons' },
  { id: 'seat-flower', name: 'Seat Flower (正花)', fan: 0, desc: 'Have the flower and/or season matching your seat (0, 1, or 2 points)' },
  { id: 'flower-set', name: 'Set of Flowers (一台花)', fan: 2, desc: 'Have all 4 flowers or all 4 seasons' },
  { id: 'seven-flowers', name: '7 Flowers (花糊)', fan: 3, desc: 'Draw 7 flowers/seasons' },
  { id: 'eight-flowers', name: '8 Flowers (八仙過海)', fan: 8, desc: 'Draw 8 flowers/seasons' },
];

const seatNumberMap: Record<string, number> = { e: 1, s: 2, w: 3, n: 4 };

export function calculateFlowerScenarios(
  selected: Record<string, number>,
  seatWind: string
): Record<string, { applies: boolean; fan: number }> {
  const bonus = getSortedTiles(selected).filter((t) => isBonusTile(t.id));
  const flowerCount = bonus.filter((t) => t.id.charAt(0) === 'f').length;
  const seasonCount = bonus.filter((t) => t.id.charAt(0) === 'n').length;
  const totalBonus = bonus.length;
  const seatNum = seatNumberMap[seatWind];

  const hasFlowerSet = flowerCount === 4;
  const hasSeasonSet = seasonCount === 4;

  let seatFlowerFan = 0;
  if (bonus.some((t) => t.id === 'f' + seatNum) && !hasFlowerSet) seatFlowerFan++;
  if (bonus.some((t) => t.id === 'n' + seatNum) && !hasSeasonSet) seatFlowerFan++;

  return {
    'no-flowers': { applies: totalBonus === 0, fan: 1 },
    'seat-flower': { applies: seatFlowerFan > 0, fan: seatFlowerFan },
    'flower-set': { applies: hasFlowerSet || hasSeasonSet, fan: 2 },
    'seven-flowers': { applies: totalBonus === 7, fan: 3 },
    'eight-flowers': { applies: totalBonus === 8, fan: 8 },
  };
}

export interface WindDragonScenario {
  id: string;
  name: string;
  fan: number;
  desc: string;
  stepper?: boolean;
  max?: number;
}

export const windDragonScenarios: WindDragonScenario[] = [
  { id: 'seat-wind', name: 'Seat Wind (門風)', fan: 1, desc: 'A meld of your seat wind.' },
  { id: 'prevailing-wind', name: 'Prevailing Wind (圈風)', fan: 1, desc: 'A meld of the prevailing (table) wind.' },
  { id: 'dragons', name: 'Dragons (三元)', fan: 0, desc: '1 fan per dragon triplet/kong (0–3).', stepper: true, max: 3 },
];

export function detectWindDragonFaan(
  selected: Record<string, number>,
  seatWind: string,
  tableWind: string
): Record<string, { applies: boolean; fan: number }> {
  const mainIds = getMainIds(selected);
  const counts = getCounts(mainIds);

  const hasMeld = (id: string) => (counts[id] || 0) >= 3;

  const seatWindId = 'w' + seatWind;
  const tableWindId = 'w' + tableWind;
  const isDoubleWind = seatWind === tableWind && hasMeld(seatWindId);

  const dragonCount = ['dr', 'dg', 'dw'].filter(hasMeld).length;

  return {
    'seat-wind': { applies: hasMeld(seatWindId), fan: isDoubleWind ? 2 : 1 },
    'prevailing-wind': { applies: hasMeld(tableWindId) && !isDoubleWind, fan: 1 },
    'dragons': { applies: true, fan: dragonCount },
  };
}

export function getWindDragonFan(
  state: Record<string, boolean | number>,
  selected: Record<string, number>,
  seatWind: string,
  tableWind: string
): number {
  const detected = detectWindDragonFaan(selected, seatWind, tableWind);
  let total = 0;
  windDragonScenarios.forEach((s) => {
    if (s.stepper) {
      const value = (state[s.id] as number | undefined) ?? 0;
      total += Math.min(value, detected[s.id]!.fan);
    } else if (state[s.id] && detected[s.id]!.applies) {
      total += detected[s.id]!.fan;
    }
  });
  return total;
}

export interface WinningCondition {
  id: string;
  name: string;
  fan: number;
  desc: string;
  highlight: boolean;
}

export const winningConditions: WinningCondition[] = [
  { id: 'self-draw', name: 'Self Draw (自摸)', desc: 'Won by drawing the winning tile yourself', fan: 1, highlight: true },
  { id: 'concealed', name: 'Concealed Hand (門前清)', desc: 'No open melds (chows or pungs claimed from others). Hands that are strictly concealed by definition (e.g., Seven Pairs, Thirteen Orphans, Self Triplets, Nine Gates) do not receive this additional point.', fan: 1, highlight: true },
  { id: 'robbing-kong', name: 'Robbing the Kong (槓上開花)', desc: 'Won by claiming the tile used to promote a kong', fan: 1, highlight: false },
  { id: 'last-tile', name: 'Last Catch (海底撈月)', desc: 'Won on the final drawable tile from the wall or final discard', fan: 1, highlight: false },
  { id: 'win-by-kong', name: 'Win by Kong (槓上開花)', desc: 'The winning tile is from a replacement tile due to a Kong or a Bonus Tile. Implies self-pick (which adds 1 additional faan).', fan: 1, highlight: false },
  { id: 'win-by-double-kong', name: 'Win by Double-Kong (槓上槓)', desc: 'Similar to Win by Kong, except that the tile used to make the Kong was itself an extra tile from declaring a Kong. Implies self-pick (which adds 1 additional faan).', fan: 8, highlight: false },
  { id: 'heavenly-hand', name: 'Heavenly Hand (天糊)', desc: 'East wins with the initial hand', fan: 13, highlight: false },
  { id: 'earthly-hand', name: 'Earthly Hand (地糊)', desc: "Non-East player wins on East's first discard", fan: 13, highlight: false },
];
