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
