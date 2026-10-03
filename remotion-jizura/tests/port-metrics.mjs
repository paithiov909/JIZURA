// Shared in Node and the real browser. No global pixel tolerance.
export function pixelDifference(actual, expected) {
  if (!actual.length || actual.length !== expected.length || actual.length % 4) throw new Error('Invalid/empty RGBA comparison');
  let differentPixels = 0, maxRaw = 0, maxAlpha = 0, maxPremultiplied = 0;
  for (let i = 0; i < actual.length; i += 4) {
    let changed = false;
    for (let j = 0; j < 4; j++) {const d = Math.abs(actual[i + j] - expected[i + j]); maxRaw = Math.max(maxRaw, d); changed ||= d !== 0;}
    maxAlpha = Math.max(maxAlpha, Math.abs(actual[i + 3] - expected[i + 3]));
    for (let j = 0; j < 3; j++) maxPremultiplied = Math.max(maxPremultiplied,
      Math.abs(Math.round(actual[i + j] * actual[i + 3] / 255) - Math.round(expected[i + j] * expected[i + 3] / 255)));
    differentPixels += Number(changed);
  }
  return {differentPixels, maxRaw, maxAlpha, maxPremultiplied};
}
export function requirePixels(actual, expected, acquisition = 'raw', label = '') {
  const diff = pixelDifference(actual, expected);
  const ok = acquisition === 'canvas-screenshot'
    ? diff.maxRaw <= 1 && diff.maxAlpha === 0 && diff.maxPremultiplied === 0
    : diff.differentPixels === 0;
  if (!ok) throw new Error(`Pixel mismatch ${label}: ${JSON.stringify(diff)}`);
  return diff;
}
export function requireResolvedProps(composition, inputProps) {
  if (composition.props.caseId !== inputProps.caseId || !!composition.props.edit !== !!inputProps.edit ||
      composition.props.fontSrc !== inputProps.fontSrc) throw new Error('Stale Composition props: re-run selectComposition with the new inputProps');
}
export function requireVisible(actual, blank, label) {
  const diff = pixelDifference(actual, blank);
  if (diff.differentPixels === 0) throw new Error(`Empty/blank anchor ${label}`);
  return diff.differentPixels;
}
