// Shared URL-slug rules for CMS posts. Mirrors slugify() in backend/main.py.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX = 80;

export function slugify(title = '', id = '') {
  let slug = String(title).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length > MAX) slug = slug.slice(0, MAX).replace(/-[^-]*$/, '') || slug.slice(0, MAX);
  slug = slug.replace(/-+$/g, '');
  if (slug) return slug;
  const suffix = String(id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return suffix ? `post-${suffix}` : 'post';
}

export function uniqueSlug(base, taken) {
  const used = taken instanceof Set ? taken : new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
