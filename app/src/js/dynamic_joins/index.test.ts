import { describe, it, expect } from 'vitest';
import { generate_series } from './generate_series';
import { getColorForValue, getLegendClasses, aggregators, operators } from './helpers';
import chroma from 'chroma-js';

describe('1. Aggregation Functions', () => {
  it('calculates sum correctly', () => {
    expect(aggregators.sum([1, 2, 3])).toBe(6);
  });
  it('finds max value correctly', () => {
    expect(aggregators.max([1, 5, 3])).toBe(5);
  });
  it('finds min value correctly', () => {
    expect(aggregators.min([1, -2, 3])).toBe(-2);
  });
  it('calculates median correctly for odd length', () => {
    expect(aggregators.median([1, 5, 2, 8, 3])).toBe(3);
  });
  it('calculates median correctly for even length', () => {
    expect(aggregators.median([1, 6, 2, 8, 3, 5])).toBe(4);
  });
  it('finds mode correctly', () => {
    expect(aggregators.mode([1, 2, 2, 3, 3, 3, 4])).toBe('3');
  });
  it('gets first element correctly', () => {
    expect(aggregators.first([10, 20, 30])).toBe(10);
  });
  it('gets last element correctly', () => {
    expect(aggregators.last([10, 20, 30])).toBe(30);
  });
  it('handles none aggregator correctly', () => {
    expect(aggregators.none([42])).toBe(42);
  });
});

describe('2. Operator Functions', () => {
  it('handles "==" operator', () => {
    expect(operators.get('==')?.(5, 5)).toBe(true);
    expect(operators.get('==')?.(5, '5')).toBe(true);
    expect(operators.get('==')?.(5, 6)).toBe(false);
  });
  it('handles ">" operator', () => {
    expect(operators.get('>')?.(10, 5)).toBe(true);
    expect(operators.get('>')?.(5, 10)).toBe(false);
  });
  it('handles "<=" operator', () => {
    expect(operators.get('<=')?.(5, 5)).toBe(true);
    expect(operators.get('<=')?.(4, 5)).toBe(true);
    expect(operators.get('<=')?.(6, 5)).toBe(false);
  });
});

describe('3. Helper Functions', () => {
  const scale = chroma.scale(['yellow', 'red']).classes([0, 10, 20, 30]);
  const colorNa = '#ccc';

  it('getColorForValue returns correct color', () => {
    expect(getColorForValue([5], scale, colorNa)).toBe('#ffff00');
  });
  it('getColorForValue returns NA color for invalid values', () => {
    expect(getColorForValue([null as any], scale, colorNa)).toBe(colorNa);
  });
  it('getLegendClasses returns correct class structure', () => {
    const classes = getLegendClasses(scale, colorNa);
    expect(classes).toHaveLength(3);
    expect(classes[0].lowerBound).toBe(0);
    expect(classes[0].upperBound).toBe(10);
    expect(classes[1].label).toBe('(10, 20]');
  });
});

describe('4. Data Series Generation', () => {
  it('generates data with the correct structure', () => {
    const data = generate_series();
    expect(data[0]).toHaveProperty('did');
    expect(data[0]).toHaveProperty('value');
    expect(data[0]).toHaveProperty('year');
  });
  it('respects includeMissingMatches option', () => {
    const allData = generate_series({ includeMissingMatches: false });
    const partialData = generate_series({ includeMissingMatches: true, missingSites: [3, 6] });
    const allSites = new Set(allData.map(d => d.did));
    const partialSites = new Set(partialData.map(d => d.did));
    expect(allSites.has(3)).toBe(true);
    expect(partialSites.has(3)).toBe(false);
  });
});
