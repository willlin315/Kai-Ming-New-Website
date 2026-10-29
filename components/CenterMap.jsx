'use client';
import { useState } from 'react';
import { useHomeText } from './HomeContent';

// Home "Discover Our Centers Near You": center list on the left, selected center + Google map on the right
// (same layout as the old kaiming.org home page). Text still comes from the Home CMS fields.
// The map uses Google's keyless embed, so no API key is needed.
const COORDS = [
  [37.8001313114391, -122.40070958309667], [37.79779652166321, -122.40731902352566],
  [37.79515443367511, -122.40809660475077], [37.806398013928636, -122.41439501267433],
  [37.79312672064887, -122.421548760876], [37.78136475594817, -122.48591985118844],
  [37.781733493864266, -122.49563961650259], [37.74398623828355, -122.49510784241618],
  [37.772712444854136, -122.39214205705017],
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
  const [lat, lng] = COORDS[active] || COORDS[0];
  const mapSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=15&hl=${MAP_LANG[locale] || 'en'}&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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
