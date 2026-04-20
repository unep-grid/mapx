export function shouldIgnoreIncomingThemeUpdate({
  queryThemeId,
  incomingThemeId,
}) {
  if (!queryThemeId) {
    return false;
  }

  return incomingThemeId !== queryThemeId;
}
