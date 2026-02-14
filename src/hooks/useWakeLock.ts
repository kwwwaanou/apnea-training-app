import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive) {
        try {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock active');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      } else if (wakeLock.current) {
        wakeLock.current.release();
        wakeLock.current = null;
        console.log('Wake Lock released');
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock.current) {
        wakeLock.current.release();
      }
    };
  }, [isActive]);
};
