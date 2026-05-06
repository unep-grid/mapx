/**
 * Sort layer helper.
 *
 * Last layer will be on top.
 *
 * @param {Array} layers Layers list, optionally with metadata attribute
 * @param {Boolean} reverse Reverse pos, keep priority
 */
export function sortLayers(layers, reverse) {
  layers.sort((a, b) => {
    const ap = a.metadata?.position ?? 0;
    const ar = a.metadata?.priority ?? 0;
    const bp = b.metadata?.position ?? 0;
    const br = b.metadata?.priority ?? 0;
    const d1 = reverse ? bp - ap : ap - bp;
    if (d1 !== 0) {
      return d1;
    }
    return ar - br;
  });
}
