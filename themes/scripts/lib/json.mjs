/** JSON for humans: two-space indent, but a list of plain numbers stays on one line ([240, 12, 7]). */
export const stringify = (value) =>
  JSON.stringify(value, null, 2).replace(/\[\s+(-?[\d.]+(?:,\s+-?[\d.]+)*)\s+\]/g, (_m, inner) => '[' + inner.replace(/,\s+/g, ', ') + ']') + '\n';
