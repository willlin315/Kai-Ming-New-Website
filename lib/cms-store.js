import peopleSeed from '../content/people.json';
export const CMS_KEY = 'km-cms-workspace-v1';
export const ROSTER_REVISION = 2;
export function mergePeople(data) {
  const existing = Array.isArray(data?.people) ? data.people : [];
  const candidates = !data?.peopleImported ? peopleSeed : (data.rosterRevision || 0) < ROSTER_REVISION ? peopleSeed.filter(p => p.id.startsWith('center-')) : [];
  return [...existing, ...candidates.filter(p => !existing.some(x => x.id === p.id))].map(p => {
    const source = peopleSeed.find(x => x.id === p.id);
    // Display locations are anchored to the existing page slots, independent of group edits.
    return { ...p, phone: p.phone || '', featured: p.featured ?? false, placements: source?.placements || [] };
  });
}
export function readPeopleDrafts() {
  try {
    const data = JSON.parse(localStorage.getItem(CMS_KEY));
    if (!Array.isArray(data?.people) || !data.people.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.title === 'string' && typeof p.bio === 'string')) return null;
    return mergePeople(data);
  } catch { return null; }
}
