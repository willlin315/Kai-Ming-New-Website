# Home page editing

The English CMS now has Pages > Home. Six section groups expose 80 plain-text fields and 10 photos from the existing Home template. The layout, navigation, links, section order and other pages remain code-owned. Photo replacements share one source across locales, with alt text and crop focus. Text values have English, Traditional Chinese and Spanish variants; plain text preserves the template's surrounding typography and links and cannot inject HTML.

`content/home-fields.json` is the server-owned field registry, generated with `node scripts/seed-home.mjs` from the fixed Home HTML. `content/home-content.json` contains the initial translated values. Do not regenerate field IDs against a changed template without migrating existing database values. Home's header and footer are not part of this collection.

The API seeds one `pages/home` document in the existing `cms_documents` PostgreSQL table without replacing an existing document. Save and Publish use the existing revision protection and audit trail. Unknown page IDs, missing/unknown fields, invalid locale structures, unsafe photo URL schemes and invalid crop positions are rejected. Unpublishing the fixed Home page is disabled.

Save draft stores every language and shared photo selection together. Publish copies the saved draft to the public snapshot. The public Home reads `/public/pages` after hydration, retaining its bundled initial content as the fallback if the API is unavailable. This version does not rebuild static pages on publish; search crawlers without JavaScript can see the bundled initial content. Draft preview uses `?cmsPreview=1` and the current browser's saved CMS cache, never an unauthenticated private-draft API. Save first, then open the preview. A browser-local draft can be previewed without database credentials; publishing requires the development API connection.

Company cutover still requires Google SSO, production configuration, media migration and backups as described in the existing handoff. Home is a pilot before exposing other fixed pages.
