import React, { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle';
  dataFullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const AdBanner = ({
  dataAdSlot,
  dataAdFormat = 'auto',
  dataFullWidthResponsive = true,
  className,
  style
}: AdBannerProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [adError, setAdError] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const adInitialized = useRef(false);

  useEffect(() => {
    const uniqueId = `ad-${dataAdSlot}-${Math.random().toString(36).substring(7)}`;
    if (adRef.current) {
      adRef.current.id = uniqueId;
    }

    const initializeAd = () => {
      if (adInitialized.current || !adRef.current) return;

      try {
        if (!(window as any).adsbygoogle) {
          (window as any).adsbygoogle = [];
        }

        const existingAd = document.querySelector(`#${uniqueId} .adsbygoogle`);
        if (existingAd && (existingAd as any).innerHTML.trim() !== '') {
          setAdLoaded(true);
          return;
        }

        adInitialized.current = true;
        (window as any).adsbygoogle.push({});
        setAdLoaded(true);
      } catch (error) {
        console.error('AdBanner initialization error:', error);
        setAdError(true);
      }
    };

    const checkAdStatus = () => {
      if (!adRef.current) return;
      
      const adIframe = adRef.current.querySelector('iframe');
      if (!adIframe || adIframe.clientHeight <= 0) {
        setAdError(true);
      }
    };

    const timeoutId = setTimeout(checkAdStatus, 2000);
    
    if (!adInitialized.current) {
      initializeAd();
    }

    return () => {
      clearTimeout(timeoutId);
      if (adRef.current) {
        adRef.current.innerHTML = '';
        adInitialized.current = false;
      }
    };
  }, [dataAdSlot]);

  if (adError || !adLoaded) {
    return null;
  }

  return (
    <div ref={adRef} className={className}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          minWidth: '300px',
          ...style
        }}
        data-ad-client={`ca-pub-${import.meta.env.VITE_ADSENSE_PUB_ID}`}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
};

export default AdBanner;