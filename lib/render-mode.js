// CMS_RENDER_ON_DEMAND=1 (set in the Dockerfile): the image is built without the database,
// because the Railway volume is only mounted at runtime. Pages are then not prerendered at
// build time; each page renders on its first visit from the live database and is cached
// until Publish revalidates it. Local and CI builds keep prerendering every page.
export const renderOnDemand = () => process.env.CMS_RENDER_ON_DEMAND === '1';
