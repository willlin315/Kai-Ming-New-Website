// Our Centers: a Google map of San Francisco with our own red pin on each of the nine centers (no name labels).
// The map is Google's keyless embed centred on fixed coordinates, so no API key is needed. Pins are drawn on top at
// the same Web Mercator position Google uses; the map itself doesn't pan/zoom (that would move it away from the
// pins), and clicking anywhere opens Google Maps. Each pin opens that center's Google Maps page.
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
const CENTER = [37.7736, -122.4443];
const ZOOM = 12;
const project = (lat, lng) => {
  const size = 256 * 2 ** ZOOM;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
};
const [CX, CY] = project(...CENTER);
const HL = { 'zh-Hant': 'zh-TW', es: 'es' };
const TITLE = { 'zh-Hant': '啟明各中心地圖', es: 'Mapa de los centros de Kai Ming' };

export default function CentersOverviewMap({ locale = 'en', id, className }) {
  const hl = HL[locale] || 'en';
  const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Kai Ming Head Start San Francisco')}`;
  return <div id={id} className={`${className || ''} km-centers-overview`}>
    <iframe className="km-centers-map" src={`https://maps.google.com/maps?ll=${CENTER[0]},${CENTER[1]}&z=${ZOOM}&hl=${hl}&output=embed`}
      title={TITLE[locale] || 'Map of Kai Ming centers'} loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
    <a className="km-centers-overview__open" href={search} target="_blank" rel="noopener" aria-hidden="true" tabIndex={-1} />
    {CENTERS.map(([name, address, lat, lng]) => {
      const [x, y] = project(lat, lng);
      return <a key={name} className="km-centers-overview__pin" title={`Kai Ming ${name}`} aria-label={`Kai Ming ${name}`}
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Kai Ming Head Start ${name}, ${address}`)}`}
        target="_blank" rel="noopener"
        style={{ left: `calc(50% + ${(x - CX).toFixed(1)}px)`, top: `calc(50% + ${(y - CY).toFixed(1)}px)` }}>
        <svg viewBox="0 0 24 34" aria-hidden="true"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 34 12 34s12-13.2 12-22.1C24 5.3 18.6 0 12 0z" fill="#EA4335" stroke="#B31412" strokeWidth="1"/><circle cx="12" cy="12" r="4.2" fill="#B31412"/></svg>
      </a>;
    })}
  </div>;
}
