import { useEffect, useRef } from 'react';

export const useWakeLock = (isActive: boolean) => {
  const wakeLock = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (!isActive) return;

    const setupWakeLock = async () => {
      // iOS fallback: use silent looping video to keep screen awake
      if (isIOS) {
        try {
          // Create a silent video element to prevent screen from sleeping
          videoRef.current = document.createElement('video');
          videoRef.current.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAG21kYXQAAAGzABAHAAABthADAowdbb9/AAAC7W1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIYdHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAA=';
          videoRef.current.loop = true;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;
          
          await videoRef.current.play();
          console.log('iOS Wake Lock (video fallback) active');
        } catch (err) {
          console.error('iOS Wake Lock fallback failed:', err);
        }
        return;
      }

      // Standard Wake Lock API for other browsers
      if ('wakeLock' in navigator) {
        try {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock active');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    setupWakeLock();

    // Cleanup
    return () => {
      if (wakeLock.current) {
        wakeLock.current.release();
        wakeLock.current = null;
        console.log('Wake Lock released');
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current = null;
        console.log('iOS Wake Lock (video fallback) released');
      }
    };
  }, [isActive, isIOS]);
};
