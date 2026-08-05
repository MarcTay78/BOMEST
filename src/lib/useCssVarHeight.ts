import { useLayoutEffect, useRef } from 'react';

/** Measures the ref'd element's height and publishes it as a CSS var on :root, so sibling sticky bars can stack via top: var(--x). */
export function useCssVarHeight<T extends HTMLElement>(varName: string) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setVar = () => document.documentElement.style.setProperty(varName, `${el.offsetHeight}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [varName]);

  return ref;
}
