# TurboKeep: one image, one port, one volume (/data). Build: docker build -t turbokeep .
# The JavaScript is built once on the builder's own architecture and only copied into each target image, so a multi-arch build does not run pnpm under emulation.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm build

FROM node:22-alpine
ARG VERSION=dev
ENV NODE_ENV=production PORT=8080 TURBOKEEP_DATA=/data TURBOKEEP_WEB=/app/web TURBOKEEP_VERSION=$VERSION
WORKDIR /app
COPY --from=build /app/apps/server/dist/server.mjs ./server.mjs
COPY --from=build /app/apps/web/dist ./web
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
