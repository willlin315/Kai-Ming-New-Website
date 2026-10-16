# Kai Ming website: deployment handoff

Status recorded: 2026-10-16. This is a development deployment, not a production launch approval.

## Source and preview

- Repository: https://github.com/willlin315/Kai-Ming-New-Website
- CMS branch: `feat/cms-editor`; PR #8 targets `nextjs-photo-migration` and is not yet merged as of this handoff.
- Reviewed deployment source: `87351c7a2dde055292c251433767c800e272e098`. Verify the current remote head before deployment.
- CMS: https://kai-ming-new-website-git-feat-cms-editor-willlin315.vercel.app/admin/
- Development API: https://kai-ming-new-website-production.up.railway.app
- Railway project: Kai Ming CMS Development. Its environment label is `production`, but the application explicitly runs in development mode.
- Frontend: Next.js/React static export on Vercel. API: FastAPI, SQLAlchemy, psycopg. Database: Railway PostgreSQL.

## Confirmed behavior

- Public HTTPS health endpoint returns HTTP 200 and reports development mode.
- Public collections contain 33 People placement records and three legacy Blog records.
- Unauthenticated `/admin/content` returns HTTP 401.
- CORS allows the exact CMS preview origin.
- Vercel `NEXT_PUBLIC_CMS_API_URL` is configured for preview branch `feat/cms-editor`.
- The CMS connection form displays the Railway API URL.
- Backend integration tests previously passed locally and in GitHub Actions against PostgreSQL 17; frontend validation/build previously passed.

Authenticated saving and publishing on the hosted deployment still need an end-to-end acceptance test. Do not treat API reachability as proof of this workflow.

## Content and editorial behavior

People retain existing page slots: 15 Our People records and 18 center placements across nine centers. Do not deduplicate or reorder records automatically. Blog supports cover images, inline images, rich text and font sizes. Save draft and Publish are separate operations. Public pages fetch published snapshots after loading. The existing Blog index is `/en/blog/`; development article details use `/en/story/?slug=...&language=en`.

All new interfaces must be English. Preserve the existing localization structure. Scope currently includes Blog and People; a general page builder is not implemented.

## Launch blockers and ownership

| Item | Preparation before handoff | Daniel / company integration |
| --- | --- | --- |
| Staff authentication | Define editor/publisher permissions and sign-in behavior | Supply central Google login protocol, issuer, audience/client setup and allowed staff/roles; verify tokens server-side |
| Authorization and audit | Implement/test role checks and named actor audit | Approve role membership and access lifecycle |
| Media | Implement uploads, validation, image descriptions and deletion rules | Provision Cloud Storage bucket, service identity and access policy |
| Blog delivery | Clean article URLs, article metadata, canonical URLs, social cards and sitemap | Select static rebuild or server-rendered deployment approach |
| Database lifecycle | Versioned migrations; export/import and restore rehearsal | Provision Cloud SQL, backups, retention and network connection |
| Deployment | Container and environment documentation, CI validation | Company GCP project/region, Cloud Run, Secret Manager and deploy identity |
| Website acceptance | Desktop/mobile, keyboard/accessibility, links, language routes, People slots, images | Approve final content and production launch |
| Enrollment | Verify actual form destination and successful submission | Confirm enrollment system endpoint/access and responsible owner |
| Analytics and domain | Inventory GA4/GTM events, redirects, sitemap and robots behavior | Approve production domain, DNS, analytics identifiers and cutover |

The current standalone shared bearer token grants all editorial permissions and refuses production mode. It must be replaced with company authentication before staff rollout. Photos currently use data URLs in JSON with a request-size cap; this is not the final media architecture.

## Environment contract

| Variable | Current development usage | Production requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_CMS_API_URL` | Public Railway HTTPS API origin, Vercel preview branch only | Public company API origin; never credentials |
| `DATABASE_URL` | Private Railway Postgres references with `postgresql+psycopg://` scheme | Cloud SQL connection, supplied privately by Secret Manager/runtime configuration |
| `CMS_ENV` | `development` | Production support must first be implemented with company authentication |
| `CMS_DEV_TOKEN` | Development credential in Railway only | Remove from production authentication flow |
| `CMS_ALLOWED_ORIGINS` | Exact preview origin | Exact approved website/CMS origins |
| `PORT` | Railway runtime port | Cloud Run runtime port |
| `RAILWAY_DOCKERFILE_PATH` | `backend/Dockerfile`, repository root build context | Not needed on Cloud Run; build the same Dockerfile with repository root context |

Never copy credentials into Git, frontend bundles, screenshots or this handoff. Transfer secrets through an approved secret manager. Existing content is imported only when absent; restarting does not overwrite editorial data.

## Acceptance and cutover sequence

1. Create a clearly identified disposable test article in the development CMS. Save, reload/reconnect, and verify the draft persists without appearing publicly.
2. Publish it; verify public API and a separate browser session show the published version. Save an unpublished edit and verify the public version remains unchanged. Test stale revision conflict and unpublish.
3. Confirm all 33 People placements and nine center layouts remain intact. Check image/cover upload and rich-text rendering on mobile.
4. Implement and verify remaining launch blockers above. Review and merge the approved source through PRs.
5. Provision company staging resources. Apply migrations, import a development export without overwriting newer company data, and verify media references. Rehearse backup restoration.
6. Run the same acceptance flow in staging with company login and role-specific accounts. Verify unauthorized writes, origins and draft isolation.
7. Freeze editing, back up content/media, complete final import, deploy the approved release, switch DNS and validate real enrollment submissions and analytics.
8. Keep a known-good release and pre-cutover backup. Roll back the application only when schema compatibility is confirmed; database rollback requires a reviewed restore plan.

Do not delete Railway/Vercel development resources until company staging has passed acceptance and content backups are verified.

## Multilingual update

See `docs/multilingual-content.md` for the three-language implementation. Website routes now include English, Traditional Chinese and Spanish; fixed copy is versioned in `content/i18n/site.json`. CMS records store translations within the existing draft/published snapshots in PostgreSQL, preserving People placement IDs. All languages publish together per record. The media library now stores new image files on a Railway persistent volume; a Cloud Storage provider is still required before company Cloud Run hosting. Will reported successful hosted article draft/publish and independent image upload/display tests on 2026-10-16.
