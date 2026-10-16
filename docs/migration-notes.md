# Wix design to Next.js: migration findings

The Wix site is a design reference only. The existing company backend will own CMS editing and form submissions; no Wix backend integration is included.

## Source comparison

- Source: https://willlin3.wixsite.com/kai-ming-head-start
- Compared the 24 English routes present in the original HTML export with their published Wix counterparts.
- The original file uses an iframe, hash navigation, embedded fonts and SVG image placeholders. It contains desktop markup, not the responsive Wix mobile layouts.
- Restored image sources by stable image/component IDs and matching container positions. Where repeater item IDs changed, matched staff photos using names in the same staff card.
- Rebuilt the news list as a React component after finding incomplete shared styling and repeated blurred thumbnail matches in the original export. Its three article images were matched to their published article titles.
- Recovered gallery items from each page's published gallery data. These photos were not included as image elements in the original export.
- Downloaded image assets into public/media. Runtime pages do not fetch photos, JavaScript or styles from Wix. docs/photo-migration.json records the source URLs and local files.
- Photo copies are resized/optimized for website use. These are not an archival export of every original file in Wix Media Manager.

## Next.js implementation

- Next.js App Router statically generates the English page routes.
- Main page content is present in the generated HTML, without a site iframe or a hash router.
- Header/footer rendering and accessible gallery behaviour use reusable React components.
- Preserved source desktop markup and CSS as an initial migration layer in content/pages. This is not yet a complete rewrite of every Wix component into a bespoke React design system.
- lib/content.js is the local content provider; replace it with the company CMS API once that interface is available.
- Slideshows use a three-second interval and can be paused; reduced-motion users do not get autoplay.
- Form previews do not submit data. Donations, bookings and application workflows await their respective integrations.

## Remaining work before production

- Review responsive layouts visually on real phones and tablets; the new reflow layer replaces the inherited desktop minimum width below 1001px.
- Add complete Chinese and Spanish content, equivalent routes and language switching. Do not label English copies as translated pages.
- Replace the inherited copy-of route names with the final approved URL structure, and map the existing production site's URLs to permanent redirects.
- Implement individual blog article pages and review links that still lead to the design-reference website or existing external systems.
- Connect the company CMS and form APIs, with documented field contracts and content update strategy.
- Add approved per-page descriptions, structured data and language annotations; set the final canonical domain and sitemap.
- Review maps, donation/payment workflows, video playback, form dropdowns and tracking separately. Copying photos does not migrate these service integrations.
- Review/approve crops and image descriptions. Filename-based alt text from the source still needs an editorial pass.
- Keep previews out of indexing. Preview metadata also sets noindex; robots.txt currently disallows crawling; enable production indexing only at launch.

## Deployment

The existing root index.html is retained to keep the current GitHub Pages preview available during review. The Next.js source lives alongside it; Next builds its own output in out/. The validation workflow builds and uploads this output as an artifact, without changing production hosting.

Set NEXT_PUBLIC_BASE_PATH=/Kai-Ming-New-Website for GitHub Pages. Leave it empty when deploying at the root of the final domain. A hosting/deployment decision is still required to replace the current preview with the Next.js build.

## Verification

- Content/asset checks and the Next.js production build passed.
- All 24 English page URLs were opened in Chromium with eager image decoding; no broken images or browser JavaScript errors were found.
- Desktop screenshots were inspected for the homepage, Broadway Center and the repaired news list.
- This does not establish full mobile or pixel-by-pixel parity with Wix.

## Responsive layout update (2026-10-14)

- PageView loads shared responsive rules after each retained Wix stylesheet. Desktop geometry above 1000px remains in place. Narrow layouts reset fixed mesh geometry, stack column strips and form fields, and resize media without scaling down the entire page.
- Up to 1000px, a native mobile navigation exposes all existing English navigation groups with expandable submenus, Apply Now and Find A Center. Escape closes the menu and restores focus; crossing the desktop breakpoint closes it.
- Personnel repeaters use two columns on tablets and one below 601px. Tab panels retain their inputs; form controls use readable 16px text. Galleries and maps fit the available width.
- Source empty backplate boxes are excluded from narrow-screen flow; background photo columns retain space.
- Validation: production build and asset checks; DOM interaction checks on all 24 English pages; regression checks for both tabbed pages and all 16 enrollment dropdowns. These tests do not measure browser layout.
- Browser visual QA was unavailable in this session. Confirm text wrapping, photo crops, footer spacing and actual horizontal overflow at 375px, 390px, 768px, 1000px and desktop width before production launch.

## Enrollment eligibility calculator (2026-10-14)

The original exported HTML contained an empty HtmlComponent at comp-muoke23s. Recovered its published iframe code and copied it to public/widgets/eligibility/index.html. EligibilityCalculator renders the local widget, adjusts its height, and connects its Apply Online and Submit Inquiry messages to the existing tabs. The source translations, FY2026–27 income table and decision logic are preserved; no Wix service is required at runtime. The original Google Fonts stylesheet is retained. Input remains in the widget and is not submitted or stored. Provenance and source hash are in content/eligibility-migration.json. Income tables are a copied source snapshot and require the company's normal review when guidelines change.
