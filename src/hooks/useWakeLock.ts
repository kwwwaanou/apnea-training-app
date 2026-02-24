import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
  const wakeLock = useRef<any>(null);

  // Pour le request
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive) {
        try {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock active');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    requestWakeLock();
  }, [isActive]);

  // Pour le release (séparé)
  useEffect(() => {
    return () => {
      if (wakeLock.current) {
        wakeLock.current.release();
        wakeLock.current = null;
        console.log('Wake Lock released');
      }
    };
  }, []);
};
