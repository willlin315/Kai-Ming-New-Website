import routes from '../content/routes.json';
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const legacyRoutes = routes.map((route) => route.key);
