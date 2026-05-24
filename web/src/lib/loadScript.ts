// Cache of in-flight script loads so we don't double-fetch
const cache = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const existing = cache.get(src);
  if (existing) return existing;

  const p = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-loaded-src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.loadedSrc = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });

  cache.set(src, p);
  return p;
}
