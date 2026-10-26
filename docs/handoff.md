# Engineering handoff notes

This file lists the data and decisions prepared before engineers take over the API,
admin, form submission and donation work. Those integrations are intentionally **not**
built here. The forms are layout only and do not submit anything.

## Data files

| File | Contents |
| --- | --- |
| `content/handoff/centers.json` | All 9 centers: names (en / zh-Hant / es), address, phone, hours, ages, capacity, classrooms, programs, features, map link, 3D tour, legacy URL, tour-request mailto. `licenseNumber` and `photo` are still empty. |
| `content/handoff/site-settings.json` | Site name, slogan, main phone / email / address, social links, funders, language list, SEO env vars. |
| `content/seo.json` | Meta description for each of the 24 pages in 3 languages (used by `getMetadata`). |
| `content/i18n/site.json` | Translation dictionary keyed by the English text. New image alt text was added here. |
| `content/people.json`, `content/blog-posts.json`, `content/eligibility-migration.json` | Migration seeds. `sourceUrl` / `sourcePage` fields keep the original Wix address as provenance only; they are not rendered on the public site. |

## Open decisions

- **Enrollment form destination**: to be confirmed with Eugene. The form layout is kept; nothing is submitted.
- **Tour requests**: the old Wix Bookings "Book a Tour" buttons now open an email to info@kaiming.org with the center in the subject. Replace with the real booking flow when it is chosen.
- **Donation**: layout only. Share buttons point to the new site's Donate page.
- **Center license numbers and photos**: not published on either site.
- **Privacy / Terms pages**: the old site has Privacy.aspx and Terms.aspx; there is no equivalent page yet (they redirect to the home page).
- **Old enrollment URL**: `Enrollment.aspx` redirects to `/how-to-enroll/` once kaiming.org points to Vercel. The "Apply" links currently use `https://www.kaiming.org/Enrollment.aspx?lang=`, so move the application to its new home before the domain switch.

## Launch switches (environment variables)

| Variable | Default | At launch |
| --- | --- | --- |
| `SITE_URL` | `https://kai-ming-new-website.vercel.app` | `https://www.kaiming.org` (canonical, hreflang, sitemap, share links) |
| `SITE_INDEXABLE` | not set → `robots.txt` blocks all, pages are `noindex` | `true` → allow indexing, block `/admin/` and `/styleguide/` |
| `NEXT_PUBLIC_CMS_API_URL` | Railway CMS API | production CMS API |

## Redirects (`vercel.json`)

- `/` → `/en/` (temporary).
- Old kaiming.org pages (`Default.aspx`, `About.aspx`, `People.aspx`, `Centers.aspx`, `CenterDetail.aspx?Cid=1…9`, `Preschool.aspx`, `IT.aspx`, `HomeBased.aspx`, `Curriculum.aspx`, `Enrollment.aspx?lang=…`, `Careers.aspx`, `Volunteer.aspx`, `DonateMain.aspx`, …) → new pages, permanent. The old site switched language by postback, so only Enrollment has language-specific targets.
- Original Wix page names (`copy-of-…`) → clean URLs.

## Language codes

Chinese uses `zh-Hant` everywhere: the `lang` attribute, hreflang, sitemap and CMS translations. The URL path is `/zh/`.

## Content status (trilingual)

| Area | en | zh-Hant | es | Notes |
| --- | --- | --- | --- | --- |
| 24 pages | ✓ | ✓ | ✓ | Through `content/i18n/site.json`; review sheet shared separately. |
| Page meta descriptions | ✓ | ✓ | ✓ | `content/seo.json`. |
| Image alt text | ✓ | ✓ | ✓ | File-name alt text was replaced on 64 images. Decorative icons keep `alt=""`. |
| People (33) | ✓ | ✓ | ✓ | Titles and bios translated in the CMS; names stay in English. |
| Blog posts | partial | titles only | titles only | The 3 imported Wix posts have no article body yet; the "124" post is a test post. |

## Blog URL slugs

Slugs are now automatic. The CMS fills the slug from the English title while you type, and leaves it alone once you edit it or the post is published. If a post is saved or published without a slug, the backend generates one: lowercase ASCII words joined by hyphens, plus `-2`, `-3` when a slug is already taken. Titles without Latin letters, such as Chinese titles, become `post-<id>`. On startup the backend also gives existing posts without a slug a generated one. Shared rules are in `lib/slug.js` and `slugify()` in `backend/main.py`.

## Editable fields by page

| Page | Editable now | Suggested CMS fields |
| --- | --- | --- |
| Home | ✓ All text and images (CMS → Pages → Home) | — |
| Our People | ✓ People records and their page placements | — |
| News & Story | ✓ Posts (title, slug, image, summary, body, 3 languages) | — |
| 9 center pages | Staff cards come from People; other content is fixed HTML | Center record from `centers.json`; hero photo; tour link |
| Our Centers | Fixed HTML | List built from `centers.json` |
| Preschool / Infant & Toddler / Prenatal & Home-Based / Learning Approach / Family Support | Fixed HTML | Hero title + image, intro, section cards (title, text, image) |
| Our Story / Our Mission | Fixed HTML | Hero, timeline items, section text and images |
| Enrollment | Fixed HTML + eligibility widget | Steps, documents list, income table (yearly), form destination |
| Careers / Volunteer | Fixed HTML | Hero, intro, openings link |
| Donate | Fixed HTML | Hero, impact text, donation provider link |
| Header / footer | Fixed HTML | `site-settings.json` (contact, social, Apply link) |

## Brand glossary

| English | 繁體中文 | Español |
| --- | --- | --- |
| Kai Ming Head Start | 啟明 Head Start | Kai Ming Head Start |
| Potential Has No Limits | 潛能無限 | El potencial no tiene límites |
| Preschool | 學前教育 | Preescolar |
| Kindergarten | 幼兒園 (never 幼稚園) | Kínder |
| Infant & Toddler | 嬰幼兒照護 | Bebés y niños pequeños |
| Prenatal & Home-Based | 產前與到宅服務 | Servicios prenatales y en el hogar |
| Learning Approach | 學習方式 | Enfoque educativo |
| Family Support | 家庭支援 | Apoyo familiar |
| Our Centers | 我們的中心 | Nuestros centros |
| Enrollment | 入學申請 | Inscripciones |
| Apply Now | 立即申請 | Solicitar ahora |
| Find A Center | 尋找中心 | Buscar un centro |
| Book a Tour | 預約參觀 | Programar una visita |
| Our People | 我們的團隊 | Nuestro equipo |
| News & Story | 新聞與故事 | Noticias e historias |
| Careers | 加入我們 | Empleos |
| Volunteer | 志工服務 | Voluntariado |
| Donate | 捐款支持 | Donar |
| Executive Director | 執行長 | Director ejecutivo |
| Site Manager | 中心主任 | Responsable del centro |
| Family Service Specialist | 家庭服務專員 | Especialista de servicios familiares |
| Board Chairperson | 董事長 | Presidente de la Junta |

Center names keep their English proper names in every language, for example "Geary 中心" and "Centro Geary".
