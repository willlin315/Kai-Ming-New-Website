# Kai Ming website + CMS on Railway (single Next.js service, SQLite on a volume at /data).
FROM node:24-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# The volume is not mounted during the image build, so pages are not prerendered here:
# each page renders on its first visit from the live database (lib/render-mode.js).
ENV CMS_RENDER_ON_DEMAND=1
ENV NEXT_BUILD_CPUS=2
# Railway passes service variables to the build only when declared as ARG.
# These are read by the few routes that are still built statically (robots, metadata).
ARG SITE_URL
ARG SITE_INDEXABLE
ENV SITE_URL=$SITE_URL SITE_INDEXABLE=$SITE_INDEXABLE
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check && npx next build
ENV NODE_ENV=production
# Start immediately; the schema setup runs on the first request (the health check).
CMD ["npm", "run", "start:railway"]
