# English, Traditional Chinese and Spanish content

Public routes use `/en/`, `/zh/` and `/es/`. The Chinese content locale is `zh-Hant`. The language switcher preserves the page key, and article switches preserve the slug and source language. Existing page keys are retained so internal links and People placements remain stable.

Fixed page text and shared navigation translations are versioned in `content/i18n/site.json`. Server rendering translates exact source text nodes and selected accessibility attributes; styles, scripts, links to forms, field values and image assets are not translated as text. Names and addresses remain unchanged where appropriate. Text embedded inside images is not translated. New source wording needs a new dictionary entry.

CMS documents store `translations` keyed by `en`, `zh-Hant`, and `es`, in PostgreSQL `cms_documents` draft and published JSON. Existing top-level fields remain the original source content. People translations contain name/title/bio; Blog translations contain title/summary/body/bodyHtml. Photos, page slots, article slug, contacts and original-language selection are shared. One save stores every language draft and one Publish publishes the entire saved document, including all its translations. Language variants are not independently published in this version.

The CMS interface stays English. Its English, Traditional Chinese and Spanish editing buttons change only the editable content language. Empty translated fields fall back to original content on the public website; no runtime machine translation service is used. A translated empty value does not intentionally hide source text.

On startup, `backfill_translations` adds missing exact-source translations to existing draft and published snapshots. It never replaces an existing translated field, never copies an unpublished English edit into a published snapshot, and preserves People IDs and placements. Each affected document gets a new revision and an `add-translations` audit event. Open editors must reload/reconnect after this deployment to retrieve current revisions. Repeated starts are idempotent. Backups include all translations.

The three legacy Blog records link to externally hosted articles. Their card titles are translated, but external Wix article bodies are not imported or translated. The current test article contains numeric text, which remains unchanged. Editors can add translated article bodies in the CMS. New articles use a shared slug and the original-language value to load the matching source record.

Review translations in context before production launch, especially employment benefits, eligibility statements, quotes and professional titles. The eligibility widget already has its own language resources and receives `en`, `zh-hk` or `es`. Pages retain the existing static-export architecture; article SEO and clean server-rendered article URLs are separate work. Development previews remain noindex.

Before company cutover, back up the database and media volume, verify all three language routes, and check desktop/mobile layout, long Spanish text, form label/value separation, language links, translated People slots and draft/published isolation. Fixed page translations are versioned files; CMS content translations reside in PostgreSQL. Neither contains credentials.
