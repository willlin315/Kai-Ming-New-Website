# CMS phase 1: editor prototype

Visit `/admin/` (prefixed by NEXT_PUBLIC_BASE_PATH when set).

This static prototype supports Blog drafts and People drafts, preview, browser-local persistence, JSON backup and restore. It does not publish content, upload images, authenticate users, enforce HR/Marketing roles, or connect to a database. The route is accessible to anyone who can access the preview site; no internal information should be entered. Saved data stays in the current browser. No enrollment or family records belong in this CMS.

Three existing Blog records are seeded with title, image and Wix source URL only. Their article bodies are not migrated. People are intentionally empty until verified staff content is imported. The draft preview renders plain text, never executable HTML. Image URLs accept HTTPS or same-site absolute paths.

## Next integration

- Confirm the Google central-login integration with IT: issuer, audience, authorized account scope and server-side role claims.
- Use FastAPI/PostgreSQL consistent with IT's current stack. Keep the public Next.js site static initially; publish approved CMS content through a server-side build/deployment workflow, or choose server rendering with IT.
- Separate Marketing (Blog write/publish), HR (People write/publish), and admin capabilities. Enforce all permissions on the server, never by hiding UI buttons.
- Model posts with ID, locale, title, unique slug per locale, summary, body, media reference, draft/published state, timestamps and revision number. Model people with ID, name, title, center ID, department, public email, media reference, biography and sort order. Confirm the center catalog before converting the prototype's free-text center field into a relation.
- Add authenticated media uploads to Cloud Storage, revision checks, audit history and publish preview before enabling public publication.
- Replace browser persistence with authenticated CMS endpoints. Only published content should reach public article pages and People / center pages. Plan one-time draft import and staff-content migration.

Phase 1 is for approving the editing workflow and field set; it is not a production CMS.

## Rich editing and People migration (2026-10-16)

- Blog supports a rich-text body with headings, font sizes, bold/italic/underline, lists, alignment, links, undo/redo and inline images. Cover, inline and profile images can be selected from local files; raster uploads are resized to 1400px maximum and converted to JPEG for browser draft storage. This is not a server media upload. Animated GIFs become still images. Draft storage has the browser's quota and backup files are limited to 5MB on import.
- `content/people.json` is the public People source; the same records seed the editor. Fifteen people and their public photographs were retrieved from the rendered Wix Our People page on 2026-10-16. Original source photo URLs are retained for provenance. Locally hosted JPEGs are resized from downloaded originals to 800px maximum.
- The rendered page contains Jerry Yang, six team directors and eight board members. All six director Read more dialogs use the identical quote. The source lists both Dora Pulido Tobiassen and Melinda Deng as Director of Finance. Both details were preserved without correction; content owner review is needed. No individual board biographies were exposed by the page; those fields remain empty.
- `/en/our-people/` now renders the versioned People records, with a featured leader, Our Team, Board Members and Center Staff groups. No center assignment was inferred from the Our People page. Staff can be assigned to a center in the editor, but individual center landing-page rosters are not wired yet.
- `/en/our-people/?cmsPreview=1` reads saved CMS People drafts in the same browser, using the existing storage key. Normal page visitors see versioned content, not another user's local drafts. Editing does not publish or synchronize across devices. Saving a person persists the imported roster; users upgrading from the old editor retain their own drafts and receive imported people once.
- Rendering uses an explicit HTML element/style allowlist. Pasted markup is inserted as plain text; scripts, event attributes and unsafe image/link schemes are excluded from the rendered article preview.

These changes supersede the initial notes that People are empty and that body editing is plain-text only. Authentication, server-side persistence and publication remain the next integration phase.

## English collection interface and placement registry

The CMS interface defaults to English. People uses a Wix-style collection table: Name, Title, Photo, Email, Phone, Bio / Quote, Group, and Appears on / Position. The full registry contains 33 existing placement records: 15 on Our People and two on each of nine center pages. Center entries were imported from the retained website page content and reuse already downloaded local photographs. No center roster was inferred or moved. Two Humberto Felix records are intentionally retained because Broadway and Dr. T.K.L. have different existing role/biography slots.

Placement metadata is anchored to existing page and component IDs. The center renderer retains original wrappers and geometry while substituting editable fields. People collection filters and per-row preview links expose actual placement. Adding a new record does not automatically add a website slot. Existing center-page count and position remain unchanged; center drafts preview via `?cmsPreview=1` in the same browser.

Older local CMS drafts receive the 18 center records once via roster revision 2. Existing edited records are retained. Backup import restores editable fields but takes known placement bindings from versioned source, preventing accidental page moves. Locations are displayed separately from editable groups.
