import React, { useEffect, useRef } from 'react';

export const CITY_COORDS = {
  "Delhi": [28.6139, 77.2090], "Mumbai": [19.0760, 72.8777],
  "Bangalore": [12.9716, 77.5946], "Chennai": [13.0827, 80.2707],
  "Kolkata": [22.5726, 88.3639], "Hyderabad": [17.3850, 78.4867],
  "Pune": [18.5204, 73.8567], "Ahmedabad": [23.0225, 72.5714],
  "Jaipur": [26.9124, 75.7873], "Lucknow": [26.8467, 80.9462],
  "Kanpur": [26.4499, 80.3319], "Nagpur": [21.1458, 79.0882],
  "Indore": [22.7196, 75.8577], "Bhopal": [23.2599, 77.4126],
  "Vizag": [17.6868, 83.2185]
};

export const CITY_KEYS_LOWER = Object.keys(CITY_COORDS).map(c => c.toLowerCase());

export function getCity(title) {
  const t = title.toLowerCase();
  for (let c of CITY_KEYS_LOWER) {
    if (t.includes(c)) return CITY_COORDS[Object.keys(CITY_COORDS).find(k => k.toLowerCase() === c) || c] ? c : null;
  }
  return null;
}

export default function NewsMap({ cityHasNews, selectedCity, onSelectCity, centerCoords }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const L_ref = useRef(null);

  useEffect(() => {
    let unmounted = false;
    const initMap = async () => {
      if (!window.L) {
        if (!document.querySelector('link[href*="leaflet@"]')) {
          const lk = document.createElement("link");
          lk.rel = "stylesheet";
          lk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(lk);
        }
        await new Promise(r => {
          const sc = document.createElement("script");
          sc.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          sc.onload = r;
          document.head.appendChild(sc);
        });
      }
      if (unmounted) return;
      L_ref.current = window.L;
      
      if (!mapInst.current && mapRef.current) {
        // Find if dark mode is active
        const isDark = document.documentElement.getAttribute("data-theme") === "dark" || 
                       (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
                       
        mapInst.current = L_ref.current.map(mapRef.current, {
          center: centerCoords || [22.5, 78.5],
          zoom: 4,
          zoomControl: false,
          maxBounds: [[6.5, 68], [35.5, 97]],
        });
        
        const tileUrl = isDark
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
          
        L_ref.current.tileLayer(tileUrl, {
          attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19
        }).addTo(mapInst.current);
      }
      drawMarkers();
    };

    const drawMarkers = () => {
      if (!mapInst.current || !L_ref.current) return;
      
      mapInst.current.eachLayer(l => { 
        if (l instanceof L_ref.current.Marker) mapInst.current.removeLayer(l); 
      });
      
      Object.entries(CITY_COORDS).forEach(([city, coords]) => {
        const hasNews = !!cityHasNews[city.toLowerCase()];
        const isSelected = selectedCity === city.toLowerCase();
        
        const iconHtml = `
          <div class="news-map-marker flex items-center justify-center p-2 rounded-full cursor-pointer transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
            <div class="w-3 h-3 rounded-full bg-accent relative z-10 shadow-[0_0_10px_rgba(255,107,0,0.8)] border-2 border-bg-body"></div>
            ${hasNews ? '<div class="absolute inset-0 rounded-full bg-accent/30 animate-ping"></div>' : ''}
          </div>
        `;
        
        const icon = L_ref.current.divIcon({ html: iconHtml, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L_ref.current.marker(coords, { icon }).addTo(mapInst.current);
        marker.on("click", () => onSelectCity(isSelected ? null : city.toLowerCase()));
      });
    };

    initMap();
    return () => { unmounted = true; };
  }, [cityHasNews, selectedCity, onSelectCity, centerCoords]);

  return <div ref={mapRef} className="w-full h-full min-h-[400px] lg:min-h-full bg-bg-inset rounded-[var(--radius-lg)] overflow-hidden" />;
}
