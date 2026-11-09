import { translate } from '../lib/i18n';

// Our Story: the 1975-2018 timeline, rebuilt from the old timeline picture (media/d4d56851041d3ce41cf4.webp) so the
// text is real, translatable and readable on phones. The photos are shown straight from that same picture (each one
// is a crop of it: background-size/position below), so no new image files are needed.
// Desktop/tablet: horizontal line with the years along it. Phone: vertical line, one milestone per row.
const ITEMS = [
  { year: '1975', text: 'Established', photo: { size: '708.89%', pos: '3.041% 88.462%', ratio: '270/193' }, alt: 'Kai Ming staff and families at a Head Start Awareness Month event' },
  { year: '1980', text: 'Kai Ming became a delegate Head Start Agency. Operated four centers in Chinatown', photo: { size: '653.24%', pos: '25.293% 88.462%', ratio: '293/193' }, alt: 'Kai Ming Head Start class of 1985-1986 with their teachers' },
  { year: '', text: 'Continued to assess the needs of the community and expanded services to Richmond, Sunset and Financial Districts' },
  { year: '2014', text: 'Kai Ming became one of the Head Start Agency Grantees', photo: { size: '747.66%', pos: '72.376% 88.506%', ratio: '256/191' }, alt: 'Kai Ming staff group photo' },
  { year: '2018', text: 'Early Head Start, STEP, ABC, Prenatal Project', photo: { size: '688.49%', pos: '96.088% 87.427%', ratio: '278/196' }, alt: 'Kai Ming, STEP and ABC (Art-Based Chinese Bilingual Curriculum) logos', logo: true },
];

export default function OurStoryTimeline({ id, className, locale = 'en' }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return <div id={id} className={`${className || ''} km-timeline`}>
    <ol className="km-timeline__list">
      {ITEMS.map((item) => <li key={item.text} className={`km-timeline__item${item.year ? '' : ' km-timeline__item--no-year'}`}>
        <p className="km-timeline__year">{item.year || ' '}</p>
        <span className="km-timeline__tick" aria-hidden="true" />
        <p className="km-timeline__text">{translate(item.text, locale)}</p>
        {item.photo && <span role="img" aria-label={translate(item.alt, locale)} className={`km-timeline__photo${item.logo ? ' km-timeline__photo--logo' : ''}`}
          style={{ backgroundImage: `url(${base}/media/d4d56851041d3ce41cf4.webp)`, backgroundSize: `${item.photo.size} auto`, backgroundPosition: item.photo.pos, aspectRatio: item.photo.ratio }} />}
      </li>)}
    </ol>
  </div>;
}
