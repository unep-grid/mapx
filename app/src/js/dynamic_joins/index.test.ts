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
    expect(getColorForValue(5, scale, colorNa)).toBe('#ffff00');
  });
  it('getColorForValue returns NA color for invalid values', () => {
    expect(getColorForValue(null as any, scale, colorNa)).toBe(colorNa);
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

describe('5. Static Filter Integration', () => {
  // Mock data that simulates the reported issue
  const mockData = [
    { id: 1, region: 'A', aggregation: 'sum', value: 100 },
    { id: 2, region: 'B', aggregation: 'max', value: 200 },
    { id: 3, region: 'C', aggregation: 'std', value: 150 }, // Should be filtered out
    { id: 4, region: 'A', aggregation: 'sum', value: 120 },
    { id: 5, region: 'D', aggregation: 'std', value: 180 }, // Should be filtered out
    { id: 6, region: 'B', aggregation: 'max', value: 250 },
    { id: 7, region: 'E', aggregation: 'min', value: 80 },
  ];

  // Helper function to simulate static filter application (from DynamicJoin._apply_static_filter)
  function applyStaticFilter(data: any[], staticFilters: any[]) {
    const compiledFilters = staticFilters.map(({ field, operator, value }) => ({
      field,
      op: operators.get(operator) || (() => true),
      value,
    }));

    return data.filter((row) =>
      compiledFilters.every(({ field, op, value }) => op(row[field], value))
    );
  }

  // Helper function to simulate dropdown options generation (from build_tom_select.ts)
  function buildDropdownOptions(data: any[], fieldName: string) {
    const counts: Record<string, number> = {};
    for (const row of data) {
      const v = row[fieldName];
      if (v != null) {
        const key = String(v);
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([value, count]) => ({ value, text: `${value} (${count})` }))
      .sort((a, b) => (a.value > b.value ? 1 : a.value < b.value ? -1 : 0));
  }

  // Helper function to simulate slider range calculation (from build_slider.ts)
  function calculateSliderRange(data: any[], fieldName: string) {
    const values = data.map((row) => row[fieldName]).filter(v => v != null).map(Number);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  it('static filters properly exclude data from base table', () => {
    const staticFilters = [
      { field: 'aggregation', operator: '!=', value: 'std' }
    ];

    const filteredData = applyStaticFilter(mockData, staticFilters);

    // Verify that 'std' aggregation rows are excluded
    expect(filteredData).toHaveLength(5); // Original 7 - 2 'std' rows = 5
    expect(filteredData.every(row => row.aggregation !== 'std')).toBe(true);

    // Verify that other aggregation types are preserved
    const aggregationTypes = new Set(filteredData.map(row => row.aggregation));
    expect(aggregationTypes).toEqual(new Set(['sum', 'max', 'min']));
  });

  it('dropdown options are built from filtered data, not raw data', () => {
    const staticFilters = [
      { field: 'aggregation', operator: '!=', value: 'std' }
    ];

    // Simulate the OLD behavior (using raw data - WRONG)
    const optionsFromRawData = buildDropdownOptions(mockData, 'aggregation');

    // Simulate the NEW behavior (using filtered data - CORRECT)
    const filteredData = applyStaticFilter(mockData, staticFilters);
    const optionsFromFilteredData = buildDropdownOptions(filteredData, 'aggregation');

    // Verify the problem existed before the fix
    const rawDataHasStd = optionsFromRawData.some(opt => opt.value === 'std');
    expect(rawDataHasStd).toBe(true); // Raw data would show 'std' option

    // Verify the fix works correctly
    const filteredDataHasStd = optionsFromFilteredData.some(opt => opt.value === 'std');
    expect(filteredDataHasStd).toBe(false); // Filtered data should NOT show 'std' option

    // Verify correct options are available
    const availableOptions = optionsFromFilteredData.map(opt => opt.value).sort();
    expect(availableOptions).toEqual(['max', 'min', 'sum']);

    // Verify counts are correct for filtered data
    const sumOption = optionsFromFilteredData.find(opt => opt.value === 'sum');
    expect(sumOption?.text).toBe('sum (2)'); // 2 sum entries in filtered data
  });

  it('slider ranges are calculated from filtered data, not raw data', () => {
    const staticFilters = [
      { field: 'value', operator: '>', value: 100 } // Exclude values <= 100
    ];

    // Simulate the OLD behavior (using raw data - WRONG)
    const rangeFromRawData = calculateSliderRange(mockData, 'value');

    // Simulate the NEW behavior (using filtered data - CORRECT)
    const filteredData = applyStaticFilter(mockData, staticFilters);
    const rangeFromFilteredData = calculateSliderRange(filteredData, 'value');

    // Verify the problem existed before the fix
    expect(rangeFromRawData.min).toBe(80); // Raw data includes value=80
    expect(rangeFromRawData.max).toBe(250);
    expect(rangeFromRawData.count).toBe(7);

    // Verify the fix works correctly
    expect(rangeFromFilteredData.min).toBe(120); // Filtered data excludes values <= 100
    expect(rangeFromFilteredData.max).toBe(250);
    expect(rangeFromFilteredData.count).toBe(5); // Only 5 values > 100

    // Verify that the minimum value in slider would be correct
    expect(rangeFromFilteredData.min).toBeGreaterThan(100);
  });

  it('handles multiple static filters correctly', () => {
    const staticFilters = [
      { field: 'aggregation', operator: '!=', value: 'std' },
      { field: 'value', operator: '>=', value: 120 }
    ];

    const filteredData = applyStaticFilter(mockData, staticFilters);

    // Should exclude 'std' aggregation AND values < 120
    expect(filteredData).toHaveLength(3); // sum(120), max(200), max(250)
    expect(filteredData.every(row => row.aggregation !== 'std')).toBe(true);
    expect(filteredData.every(row => row.value >= 120)).toBe(true);

    // Verify dropdown options reflect both filters
    const options = buildDropdownOptions(filteredData, 'aggregation');
    const availableOptions = options.map(opt => opt.value).sort();
    expect(availableOptions).toEqual(['max', 'sum']);

    // Verify slider range reflects both filters
    const range = calculateSliderRange(filteredData, 'value');
    expect(range.min).toBe(120);
    expect(range.max).toBe(250);
  });

  it('handles edge case when static filters eliminate all data', () => {
    const staticFilters = [
      { field: 'value', operator: '>', value: 1000 } // No values > 1000
    ];

    const filteredData = applyStaticFilter(mockData, staticFilters);

    expect(filteredData).toHaveLength(0);

    // Dropdown should have no options
    const options = buildDropdownOptions(filteredData, 'aggregation');
    expect(options).toHaveLength(0);

    // Slider range calculation with empty data returns Infinity values
    const range = calculateSliderRange(filteredData, 'value');
    expect(range.min).toBe(Infinity);
    expect(range.max).toBe(-Infinity);
    expect(range.count).toBe(0);
  });
});
