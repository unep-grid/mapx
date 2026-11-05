/**
 * Prepare vt style rules for the legend, in place:
 * - sprite "none" becomes null;
 * - consecutive rules with the same value / value_to are merged into the
 *   first one, which inherits the sprite of the duplicate (e.g. a pattern
 *   layer rendered above a color layer).
 * @param {Array<Object>} rules Rules from getViewMapboxLayers
 * @return {Array<Object>} The same, mutated, rules array
 */
export function dedupeLegendRules(rules) {
  let pos = 0;
  const idRulesToRemove = [];
  for (const rule of rules) {
    const ruleNext = rules[++pos];
    const hasSprite = rule?.sprite !== "none";
    const nextHasSprite = !!ruleNext && ruleNext?.sprite !== "none";

    const isDuplicated =
      ruleNext &&
      ruleNext.value === rule.value &&
      ruleNext.value_to === rule.value_to;

    if (!hasSprite) {
      rule.sprite = null;
    }

    if (isDuplicated) {
      if (nextHasSprite) {
        rule.sprite = ruleNext.sprite;
      }
      idRulesToRemove.push(pos);
    }
  }

  while (idRulesToRemove.length) {
    const rulePos = idRulesToRemove.pop();
    rules.splice(rulePos, 1);
  }
  return rules;
}
