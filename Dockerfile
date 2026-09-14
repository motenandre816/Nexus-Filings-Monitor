# Builds the full Nexus app: Express API + built SPA, served from one origin.
# Used by CI (image build check) and Render (production deploy).

FROM node:22-alpine

WORKDIR /app

# pnpm version is pinned by the packageManager field; corepack enforces it.
RUN corepack enable

# Copy the whole workspace so pnpm can resolve all workspace packages, then
# install exactly what the lockfile pins.
COPY . .
RUN pnpm install --frozen-lockfile

# Render passes service env vars as build args; the SPA build needs the Clerk
# public key and proxy URL baked in at build time.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL

RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000

# MIGRATE_ON_START applies the Drizzle schema (drizzle-kit push --force) before
# booting the server. Idempotent; set to "false" to skip.
CMD ["sh", "-c", "if [ \"$MIGRATE_ON_START\" = \"true\" ]; then pnpm --filter @workspace/db run push-force; fi; node --enable-source-maps artifacts/api-server/dist/index.mjs"]
