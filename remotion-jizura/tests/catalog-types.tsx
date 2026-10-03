import {getEffectCatalog, searchEffects, type CatalogEntry, type CatalogQuery, type CatalogParameter} from 'remotion-jizura';
const source: readonly CatalogEntry[] = getEffectCatalog();
const query: CatalogQuery = {group: 'image', tags: ['glitch'], conditions: ['2d'], uses: ['短いキメ']};
export const result = searchEffects(query, source);
const p: CatalogParameter = source[0].parameters.sx;
if (p.type === 'number') console.log(p.min, p.max, p.bounds);
// @ts-expect-error Legacy unimplemented groups cannot be searched as executable catalog groups.
searchEffects({group: 'trans'});
// @ts-expect-error Catalog metadata cannot be used as a Cut effect declaration.
const cut: import('remotion-jizura').JizuraCutProps = {text: '朝', layout: source[0]};
