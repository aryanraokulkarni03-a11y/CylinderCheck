import { useState, useEffect } from 'react';

/**
 * Hook to dynamically load Leaflet CSS and JS.
 * Ensures the heavy map library is only fetched when a map component mounts.
 */
export function useLeaflet() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.L) {
      setLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLoaded(true);
    script.onerror = () => console.error("Failed to load Leaflet");
    document.head.appendChild(script);
  }, []);

  return loaded;
}
