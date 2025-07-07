import type { SeriesDataPoint } from "./types";

export interface GenerateSeriesOptions {
  /**
   * Set to true to create data with missing matches for some sites.
   * This allows you to demo the difference between left and inner joins:
   * - Left join: shows all sites (1-8), unmatched sites get colorNa
   * - Inner join: only shows sites with data matches, hides unmatched sites
   */
  includeMissingMatches?: boolean;
  /**
   * Array of site IDs to exclude from the generated data.
   * Default: [3, 6, 7] - these sites will have no data matches
   */
  missingSites?: number[];
}

export function generate_series(options: GenerateSeriesOptions = {}): SeriesDataPoint[] {
  const { includeMissingMatches = false, missingSites = [3, 6, 7] } = options;

  const scenarios = ["a", "b", "c", "d"];
  const variables = ["temp", "co2", "caco3"];
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  const teams = ["x", "y", "z"];
  const allSites = [1, 2, 3, 4, 5, 6, 7, 8];

  // Filter out missing sites if includeMissingMatches is true
  const sites = includeMissingMatches
    ? allSites.filter(site => !missingSites.includes(site))
    : allSites;

  const data: SeriesDataPoint[] = [];

  // Base values for each variable type to make them more realistic
  const baseValues: Record<string, number> = {
    temp: 15,    // Base temperature in Celsius
    co2: 400,    // Base CO2 in ppm
    caco3: 50    // Base CaCO3 percentage
  };

  // Scaling factors to get values in 1-8 range while maintaining realism
  const scalingFactors: Record<string, number> = {
    temp: 2,     // Temperature varies ±16°C (15 ± 16 = -1 to 31°C)
    co2: 50,     // CO2 varies ±400ppm (400 ± 400 = 0 to 800ppm)
    caco3: 10    // CaCO3 varies ±80% (50 ± 80 = -30 to 130%)
  };

  for (const site of sites) {
    for (const scenario of scenarios) {
      for (const variable of variables) {
        for (const year of years) {
          for (const team of teams) {
            // Create shifting pattern based on year index
            const yearIndex = years.indexOf(year);
            const basePattern = [1, 2, 3, 4, 5, 6, 7, 8];

            // Shift the pattern based on year (rotates the array)
            const shiftedPattern = [
              ...basePattern.slice(yearIndex % 8),
              ...basePattern.slice(0, yearIndex % 8)
            ];

            // Get the value for this site from the shifted pattern
            const patternValue = shiftedPattern[site - 1]; // site is 1-indexed

            // Add some variation based on scenario, team, and variable
            const scenarioOffset = scenarios.indexOf(scenario) * 2;
            const teamOffset = teams.indexOf(team) * 5;
            const variableOffset = variables.indexOf(variable) * 0.2;

            // Calculate final value with slight randomization
            const rawValue = patternValue + scenarioOffset + teamOffset + variableOffset;

            // Scale to realistic range for the variable type
            const scaledValue = baseValues[variable] + (rawValue - 4.5) * scalingFactors[variable];

            // Round to appropriate precision
            const finalValue = variable === 'temp' ?
              Math.round(scaledValue * 10) / 10 : // 1 decimal for temp
              Math.round(scaledValue); // whole numbers for others

            data.push({
              did: site,
              value: finalValue,
              year,
              team,
              scenario,
              variable,
            });
          }
        }
      }
    }
  }

  return data;
}
