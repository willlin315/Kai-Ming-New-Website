# Kai Ming website + CMS on Railway (single Next.js service, SQLite on a volume).
FROM node:24-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Type/compile check during the image build; pages are built again at start-up (below).
RUN npm run check && npx next build
ENV NODE_ENV=production
# The SQLite volume (/data) is only mounted at runtime, so the production build that
# prerenders pages from published CMS content runs when the container starts.
CMD ["npm", "run", "start:railway"]
