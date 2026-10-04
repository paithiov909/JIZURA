// Caller-owned font lifetime. Scene uses the registered face without src.
export async function preloadLoopFont(src: string): Promise<() => void> {
  const resolved = new URL(src, document.baseURI).href;
  const face = new FontFace('Noto Sans JP', `url(${JSON.stringify(resolved)})`, {weight: '700', style: 'normal'});
  try {
    await face.load(); document.fonts.add(face);
    const loaded = await document.fonts.load('normal 700 64px "Noto Sans JP"', '静かな夜を越え新しい朝希望光');
    if (face.status !== 'loaded' || !loaded.includes(face)) throw new Error('Exact font face did not load');
    return () => document.fonts.delete(face);
  } catch (error) {
    document.fonts.delete(face);
    throw new Error(`Noto Sans JP700 preload failed. Source: ${src} (resolved: ${resolved}). Check public-dir / CORS / valid font. ${String(error)}`);
  }
}
