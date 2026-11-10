// Our Centers: Google map with all nine centers pinned, embedded from the "Kai Ming Head Start — Nine Centers"
// Google My Maps map (shared as "anyone with the link can view"). It can be dragged and zoomed directly, and clicking
// a pin shows that center. To move or rename a pin, edit that map in Google My Maps; the website updates by itself.
// My Maps puts a title bar (map name, owner) across the top of the embed; the iframe is shifted up so the bar sits
// outside the visible frame.
const MAP_ID = '1p7nqZ77jZ8uTJ2CYP6iZnVFTJdqln-M';
const TITLE = { 'zh-Hant': '啟明各中心地圖', es: 'Mapa de los centros de Kai Ming' };
const HL = { 'zh-Hant': 'zh-TW', es: 'es' };

export default function CentersOverviewMap({ locale = 'en', id, className }) {
  const src = `https://www.google.com/maps/d/embed?mid=${MAP_ID}&ll=37.7736,-122.4443&z=12&hl=${HL[locale] || 'en'}`;
  return <div id={id} className={`${className || ''} km-centers-overview`}>
    <iframe className="km-centers-map" src={src} title={TITLE[locale] || 'Map of Kai Ming centers'} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
  </div>;
}
