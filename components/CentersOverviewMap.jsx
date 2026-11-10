'use client';
import { useEffect, useRef } from 'react';

// Our Centers: map of San Francisco with a red pin on each of the nine centers (no name labels on the map).
// It can be dragged and zoomed directly (drag / pinch / double-click / +- buttons; the mouse wheel zooms after the
// map has been clicked, so scrolling the page never gets stuck on it). Clicking a pin shows the center's name and a
// link to its Google Maps page.
// Built with Leaflet (loaded from cdnjs) on OpenStreetMap tiles: Google's free embed can't show our own pins
// and still be moved, and the Google Maps JavaScript API needs an API key.
const CENTERS = [
  ['Broadway Center', '820 Battery St, San Francisco, CA 94133', 37.7990376, -122.4010161],
  ['Rainbow Center', '799 Pacific Ave, San Francisco, CA 94133', 37.7966594, -122.4076874],
  ['Dr. T.K.L. Center', '950 Powell St, San Francisco, CA 94108', 37.7935972, -122.409325],
  ['North Beach Center', '1170 Columbus Ave, San Francisco, CA 94133', 37.8048328, -122.4164561],
  ["St. Luke's Center", '1755 Clay St, San Francisco, CA 94109', 37.7920526, -122.4222367],
  ['Geary Center', '6221 Geary Blvd, San Francisco, CA 94121', 37.779676, -122.4863517],
  ['Richmond Center', '426 33rd Ave, San Francisco, CA 94121', 37.7810497, -122.4931908],
  ['Sunset Center', '2800 Taraval St, San Francisco, CA 94116', 37.7423131, -122.4962156],
  ['PMsquare Center', '671 China Basin St, San Francisco, CA 94158', 37.7717345, -122.3923388],
];
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const TITLE = { 'zh-Hant': '啟明各中心地圖', es: 'Mapa de los centros de Kai Ming' };
const OPEN = { 'zh-Hant': '在 Google 地圖開啟', es: 'Abrir en Google Maps' };
const PIN = '<svg viewBox="0 0 24 34" width="24" height="34" aria-hidden="true"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 34 12 34s12-13.2 12-22.1C24 5.3 18.6 0 12 0z" fill="#EA4335" stroke="#B31412" stroke-width="1"/><circle cx="12" cy="12" r="4.2" fill="#B31412"/></svg>';

let leafletPromise;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = `${LEAFLET}leaflet.css`;
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = `${LEAFLET}leaflet.js`; script.async = true;
      script.onload = () => resolve(window.L); script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}
const escape = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function CentersOverviewMap({ locale = 'en', id, className }) {
  const box = useRef(null);
  useEffect(() => {
    let map; let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.25 });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const icon = L.divIcon({ className: 'km-centers-overview__pin', html: PIN, iconSize: [24, 34], iconAnchor: [12, 34], popupAnchor: [0, -30] });
      const points = CENTERS.map(([name, address, lat, lng]) => {
        const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Kai Ming Head Start ${name}, ${address}`)}`;
        L.marker([lat, lng], { icon, title: `Kai Ming ${name}`, alt: `Kai Ming ${name}` }).addTo(map)
          .bindPopup(`<strong>Kai Ming ${escape(name)}</strong><br>${escape(address)}<br><a href="${href}" target="_blank" rel="noopener">${OPEN[locale] || 'Open in Google Maps'}</a>`);
        return [lat, lng];
      });
      map.fitBounds(points, { padding: [36, 36] });
      // Mouse-wheel zoom only once someone clicks into the map; leaving the map turns it off again.
      map.on('click focus', () => map.scrollWheelZoom.enable());
      map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    }).catch(() => {});
    return () => { cancelled = true; if (map) map.remove(); };
  }, [locale]);
  return <div id={id} className={`${className || ''} km-centers-overview`}>
    <div ref={box} className="km-centers-map" role="region" aria-label={TITLE[locale] || 'Map of Kai Ming centers'} />
  </div>;
}
