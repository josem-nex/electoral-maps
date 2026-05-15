import { useEffect, useState } from 'react';

export function useIsMobile(maxWidth = 639): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia(`(max-width: ${maxWidth}px)`).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [maxWidth]);
  return isMobile;
}
