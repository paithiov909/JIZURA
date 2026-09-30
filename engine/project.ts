import type { Project } from './types.ts';
import type { LegacyFacade, LegacyValue } from './legacy-types.ts';
export default function install(J: LegacyFacade): void {
J.mergeProject = function(input: unknown): Project {
  const p = input as LegacyValue;
  const d = J.defaultProject();
  const o: Project = Object.assign(d, p || {});
  o.fx = Object.assign(J.defaultProject().fx, (p && p.fx) || {});
  o.timing = Object.assign(J.defaultProject().timing, (p && p.timing) || {});
  const en = J.defaultProject().enabled;
  for (const g of Object.keys(en)) en[g] = Object.assign(en[g], ((p && p.enabled) || {})[g] || {});
  o.enabled = en;
  o.overrides = (p && p.overrides) || {};
  o.locks = { tech: {}, params: {} };
  // project files are untrusted: only plain keys may be locked, and only on (never a value we did not write)
  for (const [g, on] of Object.entries((p && p.locks && p.locks.tech) || {})) if (on === true && /^[\w-]+$/.test(g)) o.locks.tech[g] = true;
  for (const [k, on] of Object.entries((p && p.locks && p.locks.params) || {})) if (on === true && /^[\w-]+$/.test(k)) o.locks.params[k] = true;
  delete o.appVersion;
  // project files are untrusted: colours must be colours, font keys plain keys (they end up in the page's HTML / CSS)
  o.colors = { enabled: !!(p && p.colors && p.colors.enabled) };
  for (const [k, v] of Object.entries((p && p.colors) || {})) {
    if (k === 'enabled') continue;
    if (typeof v === 'boolean') o.colors[k] = v;
    else if (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) o.colors[k] = v;
  }
  o.userFonts = (Array.isArray(p && p.userFonts) ? p.userFonts : []).filter((uf: LegacyValue) => uf && J.SAFE_FONT_KEY.test(uf.key))
    .map((uf: LegacyValue) => ({ key: uf.key, label: String(uf.label || uf.key).slice(0, 80), family: J.safeFamily(uf.family || uf.key.slice(5)), weight: J.clamp(parseInt(uf.weight, 10) || 400, 100, 900) }));
  for (const uf of o.userFonts!) if (!J.FONTS[uf.key]) J.addUserFont(uf.key, uf.label, uf.family, uf.weight);
  migrateOrder(o, p);
  o.themeId = p && typeof p.themeId === 'string' && J.THEMES && J.THEMES[p.themeId] ? p.themeId : null;
  o.fonts = {};
  for (const [role, k] of Object.entries((p && p.fonts) || {})) if (typeof k === 'string' && J.FONTS[k] && /^[\w-]+$/.test(role)) o.fonts[role] = k;
  return o;
}
/* v0.10: untagged lines of an LRC text now stay where they are written — move per-line settings of older projects along */
function migrateOrder(o: Project, p: LegacyValue) {
  const was = p && p.timingOrder; o.timingOrder = 2;
  if (!p || was === 2) return;
  const map = J.parseOrderV1(o.lyrics || ''); if (!map) return;
  const mv = (obj: LegacyValue) => { const r: LegacyValue = {}; for (const [k, v] of Object.entries(obj || {})) { const i = +k; r[Number.isInteger(i) && map[i] != null ? map[i] : k] = v; } return r; };
  o.timing.lineTimes = mv(o.timing.lineTimes); o.overrides = mv(o.overrides);
  const R = o.exportRange;
  if (R && Number.isInteger(R.from) && Number.isInteger(R.to)) {
    const idx: LegacyValue = []; for (let i = R.from; i <= R.to && i < map.length; i++) idx.push(map[i]);
    o.exportRange = idx.length ? { from: Math.min(...idx), to: Math.max(...idx) } : null;
  }
}

}
