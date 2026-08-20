export interface TileDef {
  id: string;
  c: string;
  img: string;
  max: number;
}

export interface SuitGroup {
  label: string;
  tiles: TileDef[];
}

function tileImagePath(id: string): string {
  const suit = id.charAt(0);
  const rank = id.charAt(1);
  const base = '/svg/mahjong/';
  if (suit === 'm') return `${base}MJ${rank}wan.svg`;
  if (suit === 's') return `${base}MJ${rank}tiao.svg`;
  if (suit === 'p') return `${base}MJ${rank}bing.svg`;
  if (suit === 'w') {
    const windName = { e: 'East', s: 'South', w: 'West', n: 'North' }[rank];
    return `${base}MJ${windName}wind.svg`;
  }
  if (suit === 'd') {
    const archerName = { r: 'Red', g: 'Green', w: 'White' }[rank];
    return `${base}MJ${archerName}archer.svg`;
  }
  if (suit === 'f') {
    const flowerName = { '1': 'mei', '2': 'lan', '3': 'ju', '4': 'zhu' }[rank];
    return `${base}MJ${flowerName}.svg`;
  }
  if (suit === 'n') {
    const seasonName = { '1': 'spring', '2': 'summer', '3': 'autumn', '4': 'winter' }[rank];
    return `${base}MJ${seasonName}.svg`;
  }
  return '';
}

export const suits: SuitGroup[] = [
  {
    label: 'Numbers',
    tiles: [
      { id: 'm1', c: '🀇', img: tileImagePath('m1'), max: 4 },
      { id: 'm2', c: '🀈', img: tileImagePath('m2'), max: 4 },
      { id: 'm3', c: '🀉', img: tileImagePath('m3'), max: 4 },
      { id: 'm4', c: '🀊', img: tileImagePath('m4'), max: 4 },
      { id: 'm5', c: '🀋', img: tileImagePath('m5'), max: 4 },
      { id: 'm6', c: '🀌', img: tileImagePath('m6'), max: 4 },
      { id: 'm7', c: '🀍', img: tileImagePath('m7'), max: 4 },
      { id: 'm8', c: '🀎', img: tileImagePath('m8'), max: 4 },
      { id: 'm9', c: '🀏', img: tileImagePath('m9'), max: 4 },
    ],
  },
  {
    label: 'Strings',
    tiles: [
      { id: 's1', c: '🀐', img: tileImagePath('s1'), max: 4 },
      { id: 's2', c: '🀑', img: tileImagePath('s2'), max: 4 },
      { id: 's3', c: '🀒', img: tileImagePath('s3'), max: 4 },
      { id: 's4', c: '🀓', img: tileImagePath('s4'), max: 4 },
      { id: 's5', c: '🀔', img: tileImagePath('s5'), max: 4 },
      { id: 's6', c: '🀕', img: tileImagePath('s6'), max: 4 },
      { id: 's7', c: '🀖', img: tileImagePath('s7'), max: 4 },
      { id: 's8', c: '🀗', img: tileImagePath('s8'), max: 4 },
      { id: 's9', c: '🀘', img: tileImagePath('s9'), max: 4 },
    ],
  },
  {
    label: 'Coins',
    tiles: [
      { id: 'p1', c: '🀙', img: tileImagePath('p1'), max: 4 },
      { id: 'p2', c: '🀚', img: tileImagePath('p2'), max: 4 },
      { id: 'p3', c: '🀛', img: tileImagePath('p3'), max: 4 },
      { id: 'p4', c: '🀜', img: tileImagePath('p4'), max: 4 },
      { id: 'p5', c: '🀝', img: tileImagePath('p5'), max: 4 },
      { id: 'p6', c: '🀞', img: tileImagePath('p6'), max: 4 },
      { id: 'p7', c: '🀟', img: tileImagePath('p7'), max: 4 },
      { id: 'p8', c: '🀠', img: tileImagePath('p8'), max: 4 },
      { id: 'p9', c: '🀡', img: tileImagePath('p9'), max: 4 },
    ],
  },
  {
    label: 'Winds',
    tiles: [
      { id: 'we', c: '🀀', img: tileImagePath('we'), max: 4 },
      { id: 'ws', c: '🀁', img: tileImagePath('ws'), max: 4 },
      { id: 'ww', c: '🀂', img: tileImagePath('ww'), max: 4 },
      { id: 'wn', c: '🀃', img: tileImagePath('wn'), max: 4 },
    ],
  },
  {
    label: 'Archers',
    tiles: [
      { id: 'dr', c: '🀄\uFE0E', img: tileImagePath('dr'), max: 4 },
      { id: 'dg', c: '🀅', img: tileImagePath('dg'), max: 4 },
      { id: 'dw', c: '🀆', img: tileImagePath('dw'), max: 4 },
    ],
  },
  {
    label: 'Flowers',
    tiles: [
      { id: 'f1', c: '🀢', img: tileImagePath('f1'), max: 1 },
      { id: 'f2', c: '🀣', img: tileImagePath('f2'), max: 1 },
      { id: 'f3', c: '🀤', img: tileImagePath('f3'), max: 1 },
      { id: 'f4', c: '🀥', img: tileImagePath('f4'), max: 1 },
    ],
  },
  {
    label: 'Seasons',
    tiles: [
      { id: 'n1', c: '🀦', img: tileImagePath('n1'), max: 1 },
      { id: 'n2', c: '🀧', img: tileImagePath('n2'), max: 1 },
      { id: 'n3', c: '🀨', img: tileImagePath('n3'), max: 1 },
      { id: 'n4', c: '🀩', img: tileImagePath('n4'), max: 1 },
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

export interface LockedGroup {
  type: 'chow' | 'pung' | 'kong';
  tiles: string[];
}

export function findDecompositionsWithLockedGroups(
  freeIds: string[],
  lockedGroups: LockedGroup[]
): Decomposition[] {
  const results: Decomposition[] = [];
  const groupsNeeded = 4 - lockedGroups.length;
  if (groupsNeeded < 0) return results;

  const counts = getCounts(freeIds);
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
        const locked = lockedGroups.map((g) => {
          const tile = g.tiles[0]!;
          const mappedType = g.type === 'chow' ? 'sequence' : g.type === 'kong' ? 'kong' : 'triplet';
          return { type: mappedType as 'sequence' | 'triplet' | 'kong', tile };
        });
        results.push({ groups: [...locked, ...currentGroups] });
      }
      return;
    }
    const t = smallestId();
    if (!t) return;

    const countT = counts[t] || 0;

    if (kongsLeft > 0 && countT >= 4) {
      remove(t, 4);
      currentGroups.push({ type: 'kong', tile: t });
      tryGroups(groupsLeft - 1, kongsLeft - 1, currentGroups);
      currentGroups.pop();
      add(t, 4);
    }

    if (countT >= 3) {
      remove(t, 3);
      currentGroups.push({ type: 'triplet', tile: t });
      tryGroups(groupsLeft - 1, kongsLeft, currentGroups);
      currentGroups.pop();
      add(t, 3);
    }

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

  const freeKongsAllowed = freeIds.length - 3 * groupsNeeded - 2;
  if (freeKongsAllowed < 0) return results;

  ids.forEach((id) => {
    if ((counts[id] || 0) >= 2) {
      remove(id, 2);
      tryGroups(groupsNeeded, freeKongsAllowed, []);
      add(id, 2);
    }
  });

  return results;
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
  { id: 'chicken-hand', name: 'Chicken Hand (雞糊)', fan: 0, desc: '4 triples and 1 pair but does not match any scoring pattern.', limit: false, auto: true },
  { id: 'common-hand', name: 'Common Hand (平糊)', fan: 1, desc: 'Every meld is a Chow (sequence).', limit: false, auto: true },
  { id: 'all-triplets', name: 'All in Triplets (對對糊)', fan: 3, desc: 'Every meld is a Pong or Kong.', limit: false, auto: true },
  { id: 'mixed-one-suit', name: 'Mixed One Suit (混一色)', fan: 3, desc: 'Only honor tiles and tiles from one suit.', limit: false, auto: true },
  { id: 'all-one-suit', name: 'All One Suit (清一色)', fan: 7, desc: 'All tiles from one suit, formed into 4 melds and 1 pair.', limit: false, auto: true },
  { id: 'mixed-orphans', name: 'Mixed Orphans (花幺九)', fan: 1, desc: 'Pongs/Kongs of Ones, Nines, or Honor tiles only.', limit: false, auto: true },
  { id: 'small-archers', name: 'Small Archers (小三元)', fan: 3, desc: 'Melds of 2 archers and a pair of the 3rd archer.', limit: false, auto: true },
  { id: 'great-archers', name: 'Great Archers (大三元)', fan: 5, desc: 'Melds of all 3 archers.', limit: false, auto: true },
  { id: 'small-winds', name: 'Small Winds (小四喜)', fan: 6, desc: 'Melds of 3 winds and a pair of the 4th wind.', limit: false, auto: true },
  { id: 'seven-pairs', name: 'Seven Pairs (七對子)', fan: 4, desc: 'Hand consists of seven pairs.', limit: false, auto: true },
  { id: 'all-honor-tiles', name: 'All Honor Tiles (字一色)', fan: 10, desc: 'All honor tiles.', limit: true, auto: true },
  { id: 'self-triplets', name: 'Self Triplets (四暗刻)', fan: 10, desc: 'Every meld is a concealed Pong or concealed Kong.', limit: true, auto: false },
  { id: 'orphans', name: 'Orphans (么九)', fan: 10, desc: 'Pongs/Kongs of Ones and Nines only.', limit: true, auto: true },
  { id: 'nine-gates', name: 'Nine Gates (九子連環)', fan: 10, desc: 'One suit 1112345678999, must be totally concealed.', limit: true, auto: true },
  { id: 'great-winds', name: 'Great Winds (大四喜)', fan: 13, desc: 'Melds of all 4 winds.', limit: true, auto: true },
  { id: 'all-kongs', name: 'All Kongs (十八羅漢)', fan: 13, desc: 'Hand containing four Kongs (and a pair).', limit: true, auto: true },
  { id: 'thirteen-orphans', name: 'Thirteen Orphans (國士無雙)', fan: 13, desc: 'One of each terminal and honor tile, plus a duplicate.', limit: true, auto: true },
];

export const sampleHands: Record<string, Record<string, number>> = {
  'chicken-hand': { m1: 1, m2: 1, m3: 1, m5: 3, s4: 1, s5: 1, s6: 1, p7: 1, p8: 1, p9: 1, p2: 2 },
  'common-hand': { m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1, m7: 1, m8: 1, m9: 1, s1: 1, s2: 1, s3: 1, p1: 2 },
  'all-triplets': { m1: 3, m2: 3, m3: 3, m4: 3, p1: 2 },
  'mixed-one-suit': { m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1, m7: 1, m8: 1, m9: 1, we: 2, ws: 3 },
  'all-one-suit': { m1: 3, m2: 3, m3: 3, m4: 1, m5: 1, m6: 1, m7: 2 },
  'mixed-orphans': { m1: 3, m9: 3, s1: 3, s9: 3, we: 2 },
  'small-archers': { dr: 3, dg: 3, dw: 2, m1: 3, m2: 3 },
  'great-archers': { dr: 3, dg: 3, dw: 3, we: 2, m1: 3 },
  'small-winds': { we: 3, ws: 3, ww: 3, wn: 2, dr: 3 },
  'seven-pairs': { m1: 2, m2: 2, m3: 2, m7: 2, we: 2, p5: 2, p6: 2 },
  'all-honor-tiles': { we: 3, ws: 3, ww: 3, dr: 3, dw: 2 },
  'self-triplets': { m1: 3, m2: 3, m3: 3, m4: 3, p1: 2 },
  'orphans': { m1: 3, m9: 3, s1: 3, s9: 3, p1: 2 },
  'nine-gates': { m1: 3, m2: 1, m3: 1, m4: 1, m5: 2, m6: 1, m7: 1, m8: 1, m9: 3 },
  'great-winds': { we: 3, ws: 3, ww: 3, wn: 3, m1: 2 },
  'all-kongs': { m1: 4, m2: 4, m3: 4, m4: 4, m5: 2 },
  'thirteen-orphans': { m1: 1, m9: 1, s1: 1, s9: 1, p1: 1, p9: 1, we: 1, ws: 1, ww: 1, wn: 1, dr: 1, dg: 1, dw: 2 },
};

export function getMainTiles(selected: Record<string, number>): TileDef[] {
  return getSortedTiles(selected).filter((t) => !isBonusTile(t.id));
}

export function getMainIds(selected: Record<string, number>): string[] {
  return idsFromTiles(getMainTiles(selected));
}

const thirteenOrphanIds = ['m1', 'm9', 's1', 's9', 'p1', 'p9', 'we', 'ws', 'ww', 'wn', 'dr', 'dg', 'dw'];

function isThirteenOrphans(counts: Record<string, number>): boolean {
  const allOrphansPresent = thirteenOrphanIds.every((id) => (counts[id] || 0) >= 1);
  const hasDuplicate = thirteenOrphanIds.some((id) => counts[id] === 2);
  const onlyOrphans = Object.keys(counts).every((id) => thirteenOrphanIds.includes(id));
  const noExcess = thirteenOrphanIds.every((id) => (counts[id] || 0) <= 2);
  return allOrphansPresent && hasDuplicate && onlyOrphans && noExcess;
}

export function isValidWinningHand(
  selected: Record<string, number>,
  lockedGroups: LockedGroup[] = []
): boolean {
  const mainIds = getMainIds(selected);
  if (mainIds.length < 14) return false;
  const counts = getCounts(mainIds);
  const keys = Object.keys(counts);

  if (lockedGroups.length === 0) {
    if (mainIds.length === 14 && keys.length === 7 && keys.every((id) => counts[id] === 2)) return true;
    if (mainIds.length === 14 && isThirteenOrphans(counts)) return true;
    return findDecompositions(mainIds).length > 0;
  }

  const lockedTiles = lockedGroups.flatMap((g) => g.tiles);
  const freeIds = mainIds.slice().sort();
  lockedTiles.forEach((id) => {
    const idx = freeIds.indexOf(id);
    if (idx !== -1) freeIds.splice(idx, 1);
  });
  return findDecompositionsWithLockedGroups(freeIds, lockedGroups).length > 0;
}

export function detectHandPatterns(
  selected: Record<string, number>,
  lockedGroups: LockedGroup[] = []
): Record<string, boolean> {
  const detected: Record<string, boolean> = {};
  handPatterns.forEach((p) => {
    detected[p.id] = false;
  });

  const mainIds = getMainIds(selected);
  if (mainIds.length === 0 || !isValidWinningHand(selected, lockedGroups)) return detected;

  const counts = getCounts(mainIds);

  const lockedTiles = lockedGroups.flatMap((g) => g.tiles);
  const freeIds = mainIds.slice().sort();
  lockedTiles.forEach((id) => {
    const idx = freeIds.indexOf(id);
    if (idx !== -1) freeIds.splice(idx, 1);
  });
  const decomps =
    lockedGroups.length === 0
      ? findDecompositions(mainIds)
      : findDecompositionsWithLockedGroups(freeIds, lockedGroups);

  // Seven pairs and Thirteen Orphans cannot coexist with declared melds.
  if (lockedGroups.length === 0) {
    if (mainIds.length === 14 && Object.keys(counts).length === 7 && Object.keys(counts).every((id) => counts[id] === 2)) {
      detected['seven-pairs'] = true;
    }

    if (mainIds.length === 14 && isThirteenOrphans(counts)) {
      detected['thirteen-orphans'] = true;
    }
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

  // Archer patterns
  const archerIds = ['dr', 'dg', 'dw'];
  const archerTrips = archerIds.filter((id) => (counts[id] || 0) >= 3);
  const archerPairs = archerIds.filter((id) => (counts[id] || 0) === 2);
  if (archerTrips.length === 3) detected['great-archers'] = true;
  if (archerTrips.length === 2 && archerPairs.length === 1) detected['small-archers'] = true;

  // Wind patterns
  const windIds = ['we', 'ws', 'ww', 'wn'];
  const winarcherTripCount = windIds.filter((id) => (counts[id] || 0) >= 3);
  const winarcherPairCount = windIds.filter((id) => (counts[id] || 0) === 2);
  if (winarcherTripCount.length === 4) detected['great-winds'] = true;
  if (winarcherTripCount.length === 3 && winarcherPairCount.length === 1) detected['small-winds'] = true;

  // Nine gates: one suit 1112345678999 plus one extra tile of the same suit
  if (lockedGroups.length === 0 && !hasHonor && suitKeys.length === 1 && mainIds.length === 14) {
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

  // Chicken hand: valid winning hand with no other scoring pattern
  if (isValidWinningHand(selected, lockedGroups) && !handPatterns.some((p) => p.id !== 'chicken-hand' && detected[p.id])) {
    detected['chicken-hand'] = true;
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

const strictlyConcealedHandIds: string[] = [];

export function isStrictlyConcealedHand(state: Record<string, boolean>): boolean {
  return strictlyConcealedHandIds.some((id) => state[id]);
}

export interface PotentialHand {
  id: string;
  name: string;
  fan: number;
  desc: string;
  ready: boolean;
  note: string;
}

function suitLabel(suit: string): string {
  const found = suits.find((s) => s.tiles[0]?.id.charAt(0) === suit);
  return found ? found.label : suit;
}

export function analyzePotentialHands(
  selected: Record<string, number>,
  lockedGroups: LockedGroup[] = []
): PotentialHand[] {
  const mainIds = getMainIds(selected);
  const total = mainIds.length;
  if (total === 0) return [];

  const counts = getCounts(mainIds);
  const detected = detectHandPatterns(selected, lockedGroups);
  const stats = getHandStats(selected);
  const freeTiles = stats.max - stats.total;
  const hasLockedChow = lockedGroups.some((g) => g.type === 'chow');
  const hasLockedMeld = lockedGroups.length > 0;

  const suitCounts: Record<string, number> = {};
  let honorCount = 0;
  mainIds.forEach((id) => {
    if (isSuited(id)) {
      const s = parseTile(id).suit;
      suitCounts[s] = (suitCounts[s] || 0) + 1;
    } else {
      honorCount++;
    }
  });
  const suitKeys = Object.keys(suitCounts);
  const dominantSuit = suitKeys.length
    ? suitKeys.reduce((a, b) => (suitCounts[a]! > suitCounts[b]! ? a : b))
    : null;

  const pairs = Object.values(counts).filter((c) => c === 2).length;
  const triplets = Object.values(counts).filter((c) => c >= 3).length;
  const kongs = Object.values(counts).filter((c) => c === 4).length;

  const hasSequence = Object.keys(counts).some((id) => {
    if (!isSuited(id)) return false;
    const parsed = parseTile(id);
    if (parsed.rank > 7) return false;
    const t2 = nextId(id)!;
    const t3 = nextId(t2)!;
    return (counts[id] || 0) > 0 && (counts[t2] || 0) > 0 && (counts[t3] || 0) > 0;
  });

  const archerCounts = { dr: counts.dr || 0, dg: counts.dg || 0, dw: counts.dw || 0 };
  const windCounts = { we: counts.we || 0, ws: counts.ws || 0, ww: counts.ww || 0, wn: counts.wn || 0 };

  const nonWindIds = mainIds.filter((id) => id.charAt(0) !== 'w');
  const nonWindCount = nonWindIds.length;
  const nonArcherIds = mainIds.filter((id) => !['dr', 'dg', 'dw'].includes(id));
  const nonArcherCount = nonArcherIds.length;

  const out: PotentialHand[] = [];

  handPatterns.forEach((p) => {
    if (detected[p.id]) {
      out.push({ ...p, ready: true, note: 'Already achieved' });
      return;
    }

    let possible = false;
    let note = '';

    switch (p.id) {
      case 'common-hand': {
        const hasTripletOrKong = Object.values(counts).some((c) => c >= 3);
        const allSuited = mainIds.every(isSuited);
        if (!hasTripletOrKong && allSuited) {
          possible = true;
          let seq = 0;
          Object.keys(counts).forEach((id) => {
            if (isSuited(id)) {
              const parsed = parseTile(id);
              if (parsed.rank <= 7) {
                const t2 = nextId(id)!;
                const t3 = nextId(t2)!;
                if ((counts[id] || 0) > 0 && (counts[t2] || 0) > 0 && (counts[t3] || 0) > 0) {
                  seq++;
                }
              }
            }
          });
          note = seq > 0 ? `${seq} sequence(s) already possible` : 'No triplets yet — all sequences possible';
        }
        break;
      }
      case 'all-triplets': {
        if (hasLockedChow) break;
        const distinctTiles = Object.keys(counts).length;
        if (distinctTiles <= 5) {
          possible = true;
          note = `${triplets} triplet(s)/kong(s), ${pairs} pair(s)`;
        }
        break;
      }
      case 'mixed-one-suit': {
        possible = suitKeys.length <= 1;
        if (possible) note = dominantSuit ? `All suited tiles are ${suitLabel(dominantSuit)}` : 'Honor-only so far';
        break;
      }
      case 'all-one-suit': {
        possible = suitKeys.length <= 1 && honorCount === 0;
        if (possible) note = dominantSuit ? `All tiles are ${suitLabel(dominantSuit)}` : '';
        break;
      }
      case 'mixed-orphans': {
        const allOrphanOrHonor = mainIds.every(
          (id) => !isSuited(id) || parseTile(id).rank === 1 || parseTile(id).rank === 9
        );
        if (allOrphanOrHonor) {
          possible = true;
          const orphanCount = mainIds.filter(
            (id) => isSuited(id) && (parseTile(id).rank === 1 || parseTile(id).rank === 9)
          ).length;
          note = `${orphanCount} terminal tile(s)`;
        }
        break;
      }
      case 'orphans': {
        const allTerminal =
          mainIds.every((id) => !isSuited(id) || parseTile(id).rank === 1 || parseTile(id).rank === 9) &&
          honorCount === 0;
        if (allTerminal) {
          possible = true;
          note = `${mainIds.length} terminal tile(s)`;
        }
        break;
      }
      case 'all-honor-tiles': {
        possible = honorCount === total;
        note = 'All tiles are honors';
        break;
      }
      case 'seven-pairs': {
        if (hasLockedMeld) break;
        const invalid = Object.values(counts).some((c) => c > 4);
        const pairCount = Object.values(counts).reduce((sum, c) => sum + Math.floor(c / 2), 0);
        const singleCount = Object.values(counts).reduce((sum, c) => sum + (c % 2), 0);
        if (!invalid && pairCount + singleCount <= 7) {
          possible = true;
          note = `${pairCount} pair(s), ${singleCount} single(s)`;
        }
        break;
      }
      case 'small-archers': {
        if (nonArcherCount <= 6) {
          const archerPairCount = Object.values(archerCounts).filter((c) => c >= 2).length;
          const archerTripCount = Object.values(archerCounts).filter((c) => c >= 3).length;
          if (archerTripCount >= 1 && archerPairCount + archerTripCount >= 2) {
            possible = true;
            note = `${archerTripCount} archer triplet(s), ${archerPairCount} archer pair(s)`;
          }
        }
        break;
      }
      case 'great-archers': {
        if (nonArcherCount <= 3) {
          const archerTripCount = Object.values(archerCounts).filter((c) => c >= 3).length;
          if (archerTripCount >= 1) {
            possible = true;
            note = `${archerTripCount} archer triplet(s)`;
          }
        }
        break;
      }
      case 'small-winds': {
        if (nonWindCount <= 3) {
          const wPairs = Object.values(windCounts).filter((c) => c >= 2).length;
          const wTrips = Object.values(windCounts).filter((c) => c >= 3).length;
          if (wTrips >= 1 && wPairs + wTrips >= 2) {
            possible = true;
            note = `${wTrips} wind triplet(s), ${wPairs} wind pair(s)`;
          }
        }
        break;
      }
      case 'great-winds': {
        if (nonWindCount <= 2 && (nonWindCount !== 2 || nonWindIds[0] === nonWindIds[1])) {
          const wTrips = Object.values(windCounts).filter((c) => c >= 3).length;
          if (wTrips >= 1) {
            possible = true;
            note = `${wTrips} wind triplet(s)`;
          }
        }
        break;
      }
      case 'nine-gates': {
        if (suitKeys.length === 1 && honorCount === 0) {
          const suit = suitKeys[0]!;
          const hasBase = [1, 2, 3, 4, 5, 6, 7, 8, 9].every(
            (r) => counts[suit + r] && counts[suit + r]! >= 1
          );
          if (hasBase) {
            possible = true;
            note = 'One-suit 1-9 base complete';
          }
        }
        break;
      }
      case 'all-kongs': {
        if (kongs > 0) {
          possible = true;
          note = `${kongs} kong(s)`;
        }
        break;
      }
      case 'self-triplets': {
        if (!hasSequence && triplets + pairs >= 2) {
          possible = true;
          note = `${triplets} triplet(s)/kong(s), ${pairs} pair(s)`;
        }
        break;
      }
      case 'thirteen-orphans': {
        const orphanIds = ['m1', 'm9', 's1', 's9', 'p1', 'p9', 'we', 'ws', 'ww', 'wn', 'dr', 'dg', 'dw'];
        const allOrphanTiles = mainIds.every((id) => orphanIds.includes(id));
        const noExcess = Object.values(counts).every((c) => c <= 2);
        if (allOrphanTiles && noExcess) {
          possible = true;
          const distinct = orphanIds.filter((id) => (counts[id] || 0) > 0).length;
          const duplicates = Object.values(counts).filter((c) => c === 2).length;
          note = `${distinct}/13 distinct, ${duplicates} duplicate`;
        }
        break;
      }
    }

    if (possible) {
      const target = p.id === 'all-kongs' ? 18 : 14;
      const needed = target - total;
      if (needed > 0 && needed <= freeTiles) {
        out.push({ ...p, ready: false, note });
      }
    }
  });

  return out;
}

export interface FlowerScenario {
  id: string;
  name: string;
  fan: number;
  desc: string;
}

export const flowerScenarios: FlowerScenario[] = [
  { id: 'no-flowers', name: 'No Flowers (无花)', fan: 1, desc: 'Have no flowers or seasons' },
  { id: 'seat-flower', name: 'Seat Flower (正花)', fan: 0, desc: 'Have the flower and/or season matching your seat (0, 1, or 2 fan)' },
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

export interface WindArcherScenario {
  id: string;
  name: string;
  fan: number;
  desc: string;
  stepper?: boolean;
  max?: number;
}

export const windArcherScenarios: WindArcherScenario[] = [
  { id: 'seat-wind', name: 'Seat Wind (門風)', fan: 1, desc: 'A meld of your seat wind.' },
  { id: 'prevailing-wind', name: 'Prevailing Wind (圈風)', fan: 1, desc: 'A meld of the prevailing (table) wind.' },
  { id: 'archers', name: 'Archers (三元)', fan: 0, desc: '0/1/2/3 fan per archer triplet/kong (0–3).', stepper: true, max: 3 },
];

export function detectWindArcherFaan(
  selected: Record<string, number>,
  seatWind: string,
  tableWind: string
): Record<string, { applies: boolean; fan: number }> {
  const mainIds = getMainIds(selected);
  const counts = getCounts(mainIds);

  const hasMeld = (id: string) => (counts[id] || 0) >= 3;

  const seatWindId = 'w' + seatWind;
  const tableWindId = 'w' + tableWind;

  const archerCount = ['dr', 'dg', 'dw'].filter(hasMeld).length;

  return {
    'seat-wind': { applies: hasMeld(seatWindId), fan: 1 },
    'prevailing-wind': { applies: hasMeld(tableWindId), fan: 1 },
    'archers': { applies: true, fan: archerCount },
  };
}

export function getWindArcherFan(
  state: Record<string, boolean | number>,
  selected: Record<string, number>,
  seatWind: string,
  tableWind: string
): number {
  const detected = detectWindArcherFaan(selected, seatWind, tableWind);
  let total = 0;
  windArcherScenarios.forEach((s) => {
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
  { id: 'concealed', name: 'Concealed Hand (門前清)', desc: 'No open melds (chows or pungs claimed from others).', fan: 1, highlight: true },
  { id: 'robbing-kong', name: 'Robbing the Kong (槓上開花)', desc: 'Won by claiming the tile used to promote a kong', fan: 1, highlight: false },
  { id: 'last-tile', name: 'Last Catch (海底撈月)', desc: 'Won on the final drawable tile from the wall or final discard', fan: 1, highlight: false },
  { id: 'win-by-kong', name: 'Win by Kong (槓上開花)', desc: 'The winning tile is from a replacement tile due to a Kong or a Bonus Tile. Implies self-pick (which adds 1 additional fan).', fan: 1, highlight: false },
  { id: 'win-by-double-kong', name: 'Win by Double-Kong (槓上槓)', desc: 'Similar to Win by Kong, except that the tile used to make the Kong was itself an extra tile from declaring a Kong. Implies self-pick (which adds 1 additional fan).', fan: 8, highlight: false },
  { id: 'heavenly-hand', name: 'Heavenly Hand (天糊)', desc: 'East wins with the initial hand', fan: 13, highlight: false },
  { id: 'earthly-hand', name: 'Earthly Hand (地糊)', desc: "Non-East player wins on East's first discard", fan: 13, highlight: false },
];
