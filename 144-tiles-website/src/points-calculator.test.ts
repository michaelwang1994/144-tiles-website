import { describe, it, expect } from 'vitest';
import {
  detectHandPatterns,
  getHandPatternFan,
  handPatterns,
  calculateFlowerScenarios,
  findDecompositions,
  isValidWinningHand,
  detectWindDragonFaan,
  getWindDragonFan,
  isStrictlyConcealedHand,
} from './points-calculator';

function selectedFromIds(ids: string[]): Record<string, number> {
  const selected: Record<string, number> = {};
  ids.forEach((id) => {
    selected[id] = (selected[id] || 0) + 1;
  });
  return selected;
}

function ids(...groups: string[][]): string[] {
  return groups.flat();
}

function repeat(id: string, n: number): string[] {
  return Array(n).fill(id);
}

describe('detectHandPatterns', () => {
  it('detects Common Hand (all sequences)', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 1), repeat('m2', 1), repeat('m3', 1),
        repeat('m4', 1), repeat('m5', 1), repeat('m6', 1),
        repeat('s2', 1), repeat('s3', 1), repeat('s4', 1),
        repeat('p6', 1), repeat('p7', 1), repeat('p8', 1),
        repeat('we', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['common-hand']).toBe(true);
    expect(detected['all-triplets']).toBe(false);
  });

  it('detects All in Triplets', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 3),
        repeat('m5', 3),
        repeat('s9', 3),
        repeat('we', 3),
        repeat('dr', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['all-triplets']).toBe(true);
    expect(detected['common-hand']).toBe(false);
  });

  it('detects Mixed One Suit', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 1), repeat('m2', 1), repeat('m3', 1),
        repeat('m4', 1), repeat('m5', 1), repeat('m6', 1),
        repeat('m7', 1), repeat('m8', 1), repeat('m9', 1),
        repeat('m1', 1), repeat('m2', 1), repeat('m3', 1),
        repeat('dr', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['mixed-one-suit']).toBe(true);
    expect(detected['all-one-suit']).toBe(false);
  });

  it('detects All One Suit', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 1), repeat('m2', 1), repeat('m3', 1),
        repeat('m4', 1), repeat('m5', 1), repeat('m6', 1),
        repeat('m7', 1), repeat('m8', 1), repeat('m9', 1),
        repeat('m3', 2),
        repeat('m6', 1), repeat('m7', 1), repeat('m8', 1)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['all-one-suit']).toBe(true);
    expect(detected['mixed-one-suit']).toBe(false);
  });

  it('detects Mixed Orphans', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 3),
        repeat('m9', 3),
        repeat('s1', 3),
        repeat('dr', 3),
        repeat('we', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['mixed-orphans']).toBe(true);
    expect(detected['all-triplets']).toBe(true);
  });

  it('detects Small Dragons', () => {
    const selected = selectedFromIds(
      ids(
        repeat('dr', 3),
        repeat('dg', 3),
        repeat('dw', 2),
        repeat('m2', 1), repeat('m3', 1), repeat('m4', 1),
        repeat('s6', 1), repeat('s7', 1), repeat('s8', 1)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['small-dragons']).toBe(true);
    expect(detected['great-dragons']).toBe(false);
  });

  it('detects Great Dragons', () => {
    const selected = selectedFromIds(
      ids(
        repeat('dr', 3),
        repeat('dg', 3),
        repeat('dw', 3),
        repeat('m2', 1), repeat('m3', 1), repeat('m4', 1),
        repeat('we', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['great-dragons']).toBe(true);
    expect(detected['small-dragons']).toBe(false);
  });

  it('detects Small Winds', () => {
    const selected = selectedFromIds(
      ids(
        repeat('we', 3),
        repeat('ws', 3),
        repeat('ww', 3),
        repeat('wn', 2),
        repeat('m2', 1), repeat('m3', 1), repeat('m4', 1)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['small-winds']).toBe(true);
    expect(detected['great-winds']).toBe(false);
  });

  it('detects Seven Pairs', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 2),
        repeat('m5', 2),
        repeat('s9', 2),
        repeat('p3', 2),
        repeat('we', 2),
        repeat('dr', 2),
        repeat('dg', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['seven-pairs']).toBe(true);
  });

  it('detects All Honor Tiles', () => {
    const selected = selectedFromIds(
      ids(
        repeat('we', 3),
        repeat('ws', 3),
        repeat('ww', 3),
        repeat('dr', 2),
        repeat('dg', 3)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['all-honor-tiles']).toBe(true);
  });

  it('detects Orphans', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 3),
        repeat('m9', 3),
        repeat('s1', 3),
        repeat('s9', 3),
        repeat('p9', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['orphans']).toBe(true);
  });

  it('detects Nine Gates', () => {
    // 1112345678999 + extra 5
    const selected = selectedFromIds(
      ids(
        repeat('m1', 3),
        repeat('m2', 1),
        repeat('m3', 1),
        repeat('m4', 1),
        repeat('m5', 2),
        repeat('m6', 1),
        repeat('m7', 1),
        repeat('m8', 1),
        repeat('m9', 3)
      )
    );
    expect(isValidWinningHand(selected)).toBe(true);
    expect(findDecompositions(Object.keys(selected).flatMap((id) => Array(selected[id]).fill(id)))).toHaveLength(1);
    const detected = detectHandPatterns(selected);
    expect(detected['nine-gates']).toBe(true);
    expect(detected['all-one-suit']).toBe(true);
  });

  it('detects Great Winds', () => {
    const selected = selectedFromIds(
      ids(
        repeat('we', 3),
        repeat('ws', 3),
        repeat('ww', 3),
        repeat('wn', 3),
        repeat('m5', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['great-winds']).toBe(true);
    expect(detected['small-winds']).toBe(false);
  });

  it('detects All Kongs', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 4),
        repeat('m5', 4),
        repeat('s9', 4),
        repeat('we', 4),
        repeat('dr', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['all-kongs']).toBe(true);
  });

  it('does not auto-detect Self Triplets', () => {
    const selected = selectedFromIds(
      ids(
        repeat('m1', 3),
        repeat('m5', 3),
        repeat('s9', 3),
        repeat('we', 3),
        repeat('dr', 2)
      )
    );
    const detected = detectHandPatterns(selected);
    expect(detected['self-triplets']).toBe(false);
  });

  it('returns no patterns for an invalid hand', () => {
    const selected = selectedFromIds(ids(repeat('m1', 3), repeat('m2', 2)));
    const detected = detectHandPatterns(selected);
    expect(Object.values(detected).some(Boolean)).toBe(false);
  });
});

describe('getHandPatternFan', () => {
  it('sums non-limit hand patterns', () => {
    const state: Record<string, boolean> = {
      'common-hand': true,
      'all-triplets': true,
    };
    const result = getHandPatternFan(state);
    expect(result.fan).toBe(4);
    expect(result.limit).toBe(false);
  });

  it('uses the highest limit hand when a limit hand is selected', () => {
    const state: Record<string, boolean> = {
      'all-triplets': true,
      'great-winds': true,
      'all-kongs': true,
    };
    const result = getHandPatternFan(state);
    expect(result.limit).toBe(true);
    expect(result.fan).toBe(13);
  });

  it('returns 0 when nothing is selected', () => {
    const result = getHandPatternFan({});
    expect(result.fan).toBe(0);
    expect(result.limit).toBe(false);
  });
});

describe('calculateFlowerScenarios', () => {
  it('detects no flowers', () => {
    const result = calculateFlowerScenarios({}, 'e');
    expect(result['no-flowers']!.applies).toBe(true);
    expect(result['no-flowers']!.fan).toBe(1);
  });

  it('detects seat flower', () => {
    const selected = selectedFromIds(ids(repeat('f1', 1)));
    const result = calculateFlowerScenarios(selected, 'e');
    expect(result['seat-flower']!.applies).toBe(true);
    expect(result['seat-flower']!.fan).toBe(1);
  });

  it('does not count seat flower when it is part of a flower set', () => {
    const selected = selectedFromIds(ids(['f1', 'f2', 'f3', 'f4']));
    const result = calculateFlowerScenarios(selected, 'e');
    expect(result['flower-set']!.applies).toBe(true);
    expect(result['flower-set']!.fan).toBe(2);
    expect(result['seat-flower']!.applies).toBe(false);
    expect(result['seat-flower']!.fan).toBe(0);
  });

  it('counts seat season separately from a flower set as 3 fan total', () => {
    const selected = selectedFromIds(ids(['f1', 'f2', 'f3', 'f4', 'n1']));
    const result = calculateFlowerScenarios(selected, 'e');
    expect(result['flower-set']!.applies).toBe(true);
    expect(result['flower-set']!.fan).toBe(2);
    expect(result['seat-flower']!.applies).toBe(true);
    expect(result['seat-flower']!.fan).toBe(1);
  });
});

describe('detectWindDragonFaan', () => {
  it('detects seat wind', () => {
    const selected = selectedFromIds(ids(repeat('we', 3)));
    const result = detectWindDragonFaan(selected, 'e', 's');
    expect(result['seat-wind']!.applies).toBe(true);
    expect(result['seat-wind']!.fan).toBe(1);
    expect(result['prevailing-wind']!.applies).toBe(false);
  });

  it('detects double wind as 2 fan', () => {
    const selected = selectedFromIds(ids(repeat('we', 3)));
    const result = detectWindDragonFaan(selected, 'e', 'e');
    expect(result['seat-wind']!.applies).toBe(true);
    expect(result['seat-wind']!.fan).toBe(2);
    expect(result['prevailing-wind']!.applies).toBe(false);
  });

  it('detects prevailing wind', () => {
    const selected = selectedFromIds(ids(repeat('ws', 3)));
    const result = detectWindDragonFaan(selected, 'e', 's');
    expect(result['prevailing-wind']!.applies).toBe(true);
    expect(result['prevailing-wind']!.fan).toBe(1);
  });

  it('detects dragon count', () => {
    const selected = selectedFromIds(ids(repeat('dr', 3), repeat('dg', 3), repeat('dw', 3)));
    const result = detectWindDragonFaan(selected, 'e', 's');
    expect(result['dragons']!.fan).toBe(3);
  });
});

describe('getWindDragonFan', () => {
  it('sums selected wind and dragon faan', () => {
    const selected = selectedFromIds(ids(repeat('we', 3), repeat('dr', 3), repeat('dg', 3)));
    const state = { 'seat-wind': true, 'dragons': 2 };
    expect(getWindDragonFan(state, selected, 'e', 's')).toBe(3);
  });

  it('counts double wind as 2 fan', () => {
    const selected = selectedFromIds(ids(repeat('we', 3)));
    const state = { 'seat-wind': true };
    expect(getWindDragonFan(state, selected, 'e', 'e')).toBe(2);
  });

  it('caps dragon fan at detected count', () => {
    const selected = selectedFromIds(ids(repeat('dr', 3)));
    const state = { 'dragons': 3 };
    expect(getWindDragonFan(state, selected, 'e', 's')).toBe(1);
  });
});

describe('isStrictlyConcealedHand', () => {
  it('returns true for Seven Pairs', () => {
    expect(isStrictlyConcealedHand({ 'seven-pairs': true })).toBe(true);
  });

  it('returns true for Self Triplets', () => {
    expect(isStrictlyConcealedHand({ 'self-triplets': true })).toBe(true);
  });

  it('returns true for Nine Gates', () => {
    expect(isStrictlyConcealedHand({ 'nine-gates': true })).toBe(true);
  });

  it('returns false for other hands', () => {
    expect(isStrictlyConcealedHand({ 'common-hand': true, 'all-triplets': true })).toBe(false);
  });
});
