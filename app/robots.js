export const dynamic = 'force-static';
export default function robots() {
  // This is a development preview. Enable indexing only after the production launch checklist.
  return { rules: { userAgent: '*', disallow: '/' } };
}
