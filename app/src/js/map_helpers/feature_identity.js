export const FEATURE_ID_PROPERTY = "__mx_feature_id";

export const NO_FEATURE_FILTER = ["==", ["literal", 1], 0];

export function isValidFeatureIdentity(value) {
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return false;
}

export function setFeatureIdentityProperty(properties, id) {
  if (!properties || !isValidFeatureIdentity(id)) {
    return;
  }

  Object.defineProperty(properties, FEATURE_ID_PROPERTY, {
    configurable: true,
    enumerable: false,
    value: id,
    writable: true,
  });
}

export function getFeatureIdentity(item) {
  if (!item) {
    return {};
  }

  const gid = item?.properties?.gid ?? item?.gid;
  const id = item?.id ?? item?.[FEATURE_ID_PROPERTY];

  return {
    gid: isValidFeatureIdentity(gid) ? gid : undefined,
    id: isValidFeatureIdentity(id) ? id : undefined,
  };
}

export function uniqueFeatureIdentities(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    if (!isValidFeatureIdentity(value)) {
      continue;
    }

    const key = `${typeof value}:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }

  return out;
}

function buildStringMatchFilter(input, values) {
  const labels = uniqueFeatureIdentities(values).map((value) => `${value}`);
  if (labels.length === 0) {
    return null;
  }
  return ["match", ["to-string", input], labels, true, false];
}

export function buildFeatureIdentityFilter(items = []) {
  const gids = [];
  const ids = [];

  for (const item of items || []) {
    const identity = getFeatureIdentity(item);
    if (isValidFeatureIdentity(identity.gid)) {
      gids.push(identity.gid);
    } else if (isValidFeatureIdentity(identity.id)) {
      ids.push(identity.id);
    }
  }

  const filters = [];
  const filterGids = buildStringMatchFilter(["get", "gid"], gids);
  const filterIds = buildStringMatchFilter(["id"], ids);

  if (filterGids) {
    filters.push(filterGids);
  }
  if (filterIds) {
    filters.push(filterIds);
  }

  if (filters.length === 0) {
    return NO_FEATURE_FILTER;
  }
  if (filters.length === 1) {
    return filters[0];
  }
  return ["any", ...filters];
}
