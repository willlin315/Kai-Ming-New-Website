'use client';
import { useState } from 'react';
import { useHomeText } from './HomeContent';

// Home "Discover Our Centers Near You": center list on the left, selected center + Google map on the right
// (same layout as the old kaiming.org home page). Text still comes from the Home CMS fields.
// The map uses Google's keyless embed, so no API key is needed.
// PLACES: each center's Google Maps listing name + street address (checked 2026-11-03: every query opens that
// center's own Google Maps place). Directions opens that place page.
// PIN: the exact coordinates of each of those Google places. The embedded map is pointed at the coordinates rather
// than the place name so it shows only the red pin, without Google's place-info box in the corner.
// Order matches the center list on the home page.
const PLACES = [
  'Kai Ming Head Start Broadway Center, 820 Battery St, San Francisco, CA 94133',
  'Kai Ming Head Start Rainbow Center, 799 Pacific Ave, San Francisco, CA 94133',
  'Kai Ming Head Start Dr. T.K.L. Center, 950 Powell St, San Francisco, CA 94108',
  'Kai Ming Head Start North Beach Center, 1170 Columbus Ave, San Francisco, CA 94133',
  "Kai Ming Head Start St. Luke's Center, 1755 Clay St, San Francisco, CA 94109",
  'Kai Ming Head Start Geary Center, 6221 Geary Blvd, San Francisco, CA 94121',
  'Kai Ming Head Start Richmond Center, 426 33rd Ave, San Francisco, CA 94121',
  'Kai Ming Head Start Sunset Center, 2800 Taraval St, San Francisco, CA 94116',
  'Kai Ming Head Start PMsquare Center, 671 China Basin St, San Francisco, CA 94158',
];
const PIN = [
  [37.7990376, -122.4010161], [37.7966594, -122.4076874], [37.7935972, -122.409325],
  [37.8048328, -122.4164561], [37.7920526, -122.4222367], [37.779676, -122.4863517],
  [37.7810497, -122.4931908], [37.7423131, -122.4962156], [37.7717345, -122.3923388],
];
const MAP_LANG = { en: 'en', 'zh-Hant': 'zh-TW', es: 'es' };
const TEXT = {
  en: { details: 'Center details', directions: 'Directions', map: 'Map of' },
  'zh-Hant': { details: '查看中心', directions: '路線', map: '地圖：' },
  es: { details: 'Ver el centro', directions: 'Cómo llegar', map: 'Mapa de' },
};
const stripNumber = (value) => value.replace(/^\s*\d+\.\s*/, '');

function CenterButton({ index, center, active, onSelect }) {
  const name = stripNumber(useHomeText(center.name));
  return <button type="button" className="km-centers__pick" aria-pressed={active} onClick={() => onSelect(index)}>
    <span className="km-centers__num" aria-hidden="true">{index + 1}</span>{name}
  </button>;
}

export default function CenterMap({ locale = 'en', id, fields }) {
  const [active, setActive] = useState(0);
  const text = TEXT[locale] || TEXT.en;
  const center = fields.centers[active];
  const name = stripNumber(useHomeText(center.name));
  const program = useHomeText(center.program);
  const address = useHomeText(center.address);
  const place = encodeURIComponent(PLACES[active] || PLACES[0]);
  const [lat, lng] = PIN[active] || PIN[0];
  const mapSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${MAP_LANG[locale] || 'en'}&output=embed`;
  // Opens the center's Google Maps page (with its own Directions button), not a bare coordinate.
  const directions = `https://www.google.com/maps/search/?api=1&query=${place}`;
  return <section id={id} className="km-centers" aria-labelledby="km-centers-title">
    <div className="km-centers__inner">
      <div className="km-centers__list">
        <h2 id="km-centers-title">{useHomeText(fields.title)}</h2>
        <p className="km-centers__intro">{useHomeText(fields.intro)}</p>
        <div className="km-centers__picks">
          {fields.centers.map((item, index) => <CenterButton key={item.name} index={index} center={item} active={index === active} onSelect={setActive} />)}
        </div>
        <a className="km-centers__all" href={fields.allHref}>{useHomeText(fields.allLabel)}</a>
      </div>
      <div className="km-centers__card" aria-live="polite">
        <p className="km-centers__name"><span className="km-centers__num" aria-hidden="true">{active + 1}</span>{name}</p>
        <p className="km-centers__program">{program}</p>
        <p className="km-centers__address">{address}</p>
        <iframe key={active} className="km-centers__map" src={mapSrc} title={`${text.map} ${name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        <p className="km-centers__links">
          {center.href && <a href={center.href}>{text.details}</a>}
          <a href={directions} target="_blank" rel="noopener">{text.directions}</a>
        </p>
      </div>
    </div>
  </section>;
}
