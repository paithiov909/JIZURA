// Data gate shared by Node contracts and the real catalog UI check.
export function validateCatalog(entries) {
  const fail = reason => {throw new Error(`Catalog: ${reason}`);};
  const ids = new Set();
  const words = (value, label) => {if (!Array.isArray(value) || !value.length || value.some(s => typeof s !== 'string' || !s.trim())) fail(label);};
  for (const e of entries) {
    const key = `${e.group}/${e.id}`;
    if (ids.has(key)) fail(`duplicate ${key}`); ids.add(key);
    if (!['layout','enter','hold','exit','decor','image'].includes(e.group) || !e.id || e.status !== 'implemented') fail(`identity/status ${key}`);
    const kind = e.group === 'layout' ? 'layout' : e.group === 'decor' ? 'decor' : e.group === 'image' ? 'image' : 'motion';
    if (e.kind !== kind || !['builtin','caller-example','native-image','standard-image'].includes(e.origin)) fail(`kind/origin ${key}`);
    if (typeof e.autoSelect !== 'boolean' || (e.origin !== 'builtin' && e.autoSelect)) fail(`autoSelect ${key}`);
    for (const f of ['name','description']) if (typeof e[f] !== 'string' || !e[f].trim()) fail(`${f} ${key}`);
    for (const f of ['tags','moods','movements','uses','conditions','constraints']) words(e[f], `${f} ${key}`);
    if (e.suitability?.status !== 'hypothesis' || !e.suitability.reason) fail(`suitability ${key}`);
    if (e.provenance?.description !== 'source') fail(`provenance ${key}`);
    words(e.provenance.sources, `sources ${key}`); words(e.provenance.evidence, `evidence ${key}`);
    if (!['review','custom','image-effects','batch'].includes(e.visual?.route) || !e.visual.candidate || !e.visual.composition ||
      !Number.isSafeInteger(e.visual.frame) || e.visual.frame < 0 || !/^dist\/remotion\/stage(?:08|09|10|13)\/[\w-]+\.mp4$/.test(e.visual.video)) fail(`visual ${key}`);
    if (e.group === 'decor' && !['back','front'].includes(e.layer)) fail(`layer ${key}`);
    if (e.group === 'image' && !['2d','webgl2'].includes(e.backend)) fail(`backend ${key}`);
    if (!e.parameters || typeof e.parameters !== 'object') fail(`parameters ${key}`);
    for (const [name, p] of Object.entries(e.parameters)) {
      const at = `${key}.${name}`;
      if (!p.description?.trim() || !['effective','ignored'].includes(p.usage)) fail(`parameter description/usage ${at}`);
      if (!['fixed','seeded'].includes(p.default?.kind)) fail(`default ${at}`);
      if (p.type === 'number') {
        if (!Number.isFinite(p.min) || !Number.isFinite(p.max) || p.min > p.max || !['input','editor'].includes(p.bounds)) fail(`bounds ${at}`);
        if (p.integer && (!Number.isSafeInteger(p.min) || !Number.isSafeInteger(p.max))) fail(`integer bounds ${at}`);
      } else if (p.type === 'enum') {words(p.values, `enum ${at}`); if (new Set(p.values).size !== p.values.length) fail(`enum duplicate ${at}`);}
      else if (p.type !== 'boolean') fail(`type ${at}`);
      if (p.default.kind === 'fixed') {
        const v = p.default.value;
        if (p.type === 'number' && (typeof v !== 'number' || !Number.isFinite(v) || v < p.min || v > p.max ||
          (p.exclusiveMax && v === p.max) || (p.integer && !Number.isSafeInteger(v)))) fail(`numeric default ${at}`);
        if (p.type === 'boolean' && typeof v !== 'boolean') fail(`boolean default ${at}`);
        if (p.type === 'enum' && !p.values.includes(v)) fail(`enum default ${at}`);
      }
    }
  }
  return ids.size;
}
