import React, { useEffect, useRef, useId } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSense({ slot, format = 'auto', style, className }: AdSenseProps) {
  const elementId = useId();
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Load AdSense script only once
    const loadScript = () => {
      if (!document.querySelector('script[src*="adsbygoogle"]')) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${import.meta.env.VITE_ADSENSE_PUB_ID}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
    };

    // Initialize ad only if not already done
    const initializeAd = () => {
      if (!initialized.current && adRef.current) {
        initialized.current = true;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.warn('AdSense initialization error:', error);
        }
      }
    };

    loadScript();

    // Wait for script to load before initializing
    const timer = setTimeout(initializeAd, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
      initialized.current = false;
    };
  }, [elementId]);

  return (
    <div ref={adRef} className={className} id={elementId}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          minWidth: '300px',
          ...style,
        }}
        data-ad-client={`ca-pub-${import.meta.env.VITE_ADSENSE_PUB_ID}`}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}