const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default {
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  // Static widget folders in public/ are served by their index.html (the old static export did this automatically).
  async rewrites() {
    return { beforeFiles: [{ source: '/widgets/eligibility/', destination: '/widgets/eligibility/index.html' }] };
  },
};
