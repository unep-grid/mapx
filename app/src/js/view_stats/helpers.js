export const VIEW_STATS_MONTHS = 60;

export function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

export function normalizeMonth(value) {
  if (!value) {
    return "";
  }
  return String(value).slice(0, 7);
}

export function buildMonthKeys(referenceDate = new Date(), n = VIEW_STATS_MONTHS) {
  const date = new Date(referenceDate);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const out = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }

  return out;
}

export function fillMonthlyCounts(rows = [], monthKeys = buildMonthKeys()) {
  const countByMonth = new Map(monthKeys.map((month) => [month, 0]));

  for (const row of rows || []) {
    const month = normalizeMonth(row.month);
    if (countByMonth.has(month)) {
      countByMonth.set(month, normalizeCount(row.count));
    }
  }

  return monthKeys.map((month) => ({
    month,
    count: countByMonth.get(month) || 0,
  }));
}

export function limitCountryRows(rows = [], limit = 20, othersLabel = "Others") {
  const data = (rows || []).map((row) => ({
    country: row.country || "?",
    count: normalizeCount(row.count),
  }));

  if (data.length <= limit) {
    return data;
  }

  const shown = data.slice(0, limit);
  const others = data.slice(limit);
  shown.push({
    country: othersLabel,
    count: others.reduce((sum, row) => sum + row.count, 0),
  });

  return shown;
}

export function groupCountryMonthRows(rows = [], monthKeys = buildMonthKeys()) {
  const grouped = new Map(monthKeys.map((month) => [month, []]));
  let max = 0;

  for (const row of rows || []) {
    const month = normalizeMonth(row.month);
    const country = row.country;

    if (!country || !grouped.has(month)) {
      continue;
    }

    const count = normalizeCount(row.count);
    max = Math.max(max, count);
    grouped.get(month).push({
      name: country,
      value: count,
    });
  }

  return {
    max,
    months: monthKeys.map((month) => ({
      month,
      data: grouped.get(month) || [],
    })),
  };
}

export function aggregateCountryMonthRange(
  rows = [],
  monthKeys = buildMonthKeys(),
  range = [0, monthKeys.length - 1],
) {
  const start = Math.max(0, Math.min(range[0], range[1]));
  const end = Math.min(monthKeys.length - 1, Math.max(range[0], range[1]));
  const months = new Set(monthKeys.slice(start, end + 1));
  const counts = new Map();
  let max = 0;

  for (const row of rows || []) {
    const country = row.country;
    const month = normalizeMonth(row.month);

    if (!country || country === "?" || !months.has(month)) {
      continue;
    }

    const count = (counts.get(country) || 0) + normalizeCount(row.count);
    counts.set(country, count);
    max = Math.max(max, count);
  }

  return {
    max,
    countries: [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export function sumMonthlyRange(
  rows = [],
  monthKeys = buildMonthKeys(),
  range = [0, monthKeys.length - 1],
) {
  const start = Math.max(0, Math.min(range[0], range[1]));
  const end = Math.min(monthKeys.length - 1, Math.max(range[0], range[1]));
  const months = new Set(monthKeys.slice(start, end + 1));
  let total = 0;

  for (const row of fillMonthlyCounts(rows, monthKeys)) {
    if (months.has(row.month)) {
      total += normalizeCount(row.count);
    }
  }

  return total;
}

export function buildCountryMapData(aggregated) {
  const countries = aggregated?.countries || [];

  return countries
    .filter((row) => row.country && row.country !== "?")
    .map((row) => ({
      name: row.country,
      count: normalizeCount(row.count),
      value: normalizeCount(row.count),
    }));
}

export function buildClassPieces(max, n = 5) {
  const upper = Math.max(0, normalizeCount(max));

  if (upper <= 0) {
    return [];
  }

  const step = Math.ceil(upper / n);
  const pieces = [];

  for (let i = 0; i < n; i++) {
    const min = i * step + 1;
    const pieceMax = Math.min((i + 1) * step, upper);

    if (min <= pieceMax) {
      pieces.push({ min, max: pieceMax });
    }
  }

  return pieces;
}

export function formatMonthLabel(month, locale) {
  const [year, monthIndex] = String(month).split("-").map(Number);
  if (!year || !monthIndex) {
    return month;
  }

  return new Intl.DateTimeFormat(locale || undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}
