import { useEffect, useState } from 'react';

type LocState = 'loading' | 'ready' | 'denied' | 'error';

export default function LocationBadge() {
  const [state, setState] = useState<LocState>('loading');
  const [place, setPlace] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const address = data.address || {};
          const city = address.city || address.town || address.village || address.suburb || '';
          const region = address.state || '';
          setPlace([city, region].filter(Boolean).join(', ') || 'Location found');
          setState('ready');
        } catch {
          setState('error');
        }
      },
      () => setState('denied'),
      { timeout: 8000 }
    );
  }, []);

  const icon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  if (state === 'loading') return <div className="location-badge">{icon}<span>Detecting location…</span></div>;
  if (state === 'denied') return <div className="location-badge">{icon}<span>Location access denied</span></div>;
  if (state === 'error') return <div className="location-badge">{icon}<span>Location unavailable</span></div>;

  return <div className="location-badge">{icon}<span>Delivering to {place}</span></div>;
}