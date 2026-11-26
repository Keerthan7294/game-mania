import { useEffect, useRef, useState } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef(null);
  const [active, setActive] = useState(false);

  const request = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setActive(true);
        wakeLockRef.current.addEventListener('release', () => setActive(false));
      }
    } catch (e) {
      console.warn('[WakeLock]', e.message);
    }
  };

  const release = async () => {
    try {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
      setActive(false);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
        request();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, []);

  return { request, release, active };
}
