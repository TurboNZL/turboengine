# TurboMusic server: one image, one port (47813), one volume (/data). Build it yourself: docker build -t turbomusic .
# The JavaScript is built once on the builder's own architecture and only copied into each target image, so a multi-arch build does not run pnpm under emulation.
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @turbomusic/web --filter @turbomusic/core --filter @turbomusic/server --filter @turbomusic/electron \
 && pnpm --filter @turbomusic/web build \
 && node apps/electron/scripts/build.mjs

FROM node:22-bookworm-slim
ARG VERSION=dev
ARG TARGETARCH
# ffmpeg converts and probes audio; yt-dlp (its standalone build, which updates itself) downloads from YouTube. Node, already in the image, is the JavaScript runtime yt-dlp needs for YouTube.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl && rm -rf /var/lib/apt/lists/* \
 && mkdir /opt/ytdlp && chown node:node /opt/ytdlp \
 && case "$TARGETARCH" in amd64) f=yt-dlp_linux ;; arm64) f=yt-dlp_linux_aarch64 ;; *) echo "unsupported architecture: $TARGETARCH" >&2; exit 1 ;; esac \
 && curl -fsSL -o /opt/ytdlp/yt-dlp "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$f" && chmod 755 /opt/ytdlp/yt-dlp && chown node:node /opt/ytdlp/yt-dlp \
 && ln -s /opt/ytdlp/yt-dlp /usr/local/bin/yt-dlp \
 && echo '--js-runtimes node' > /etc/yt-dlp.conf
ENV NODE_ENV=production TURBOMUSIC_DATA_DIR=/data TURBOMUSIC_PORT=47813 TURBOMUSIC_HOST=0.0.0.0 TURBOMUSIC_WEB_DIR=/app/web TURBOMUSIC_YTDLP=/opt/ytdlp/yt-dlp TURBOMUSIC_VERSION=$VERSION
WORKDIR /app
COPY --from=build /app/apps/electron/dist/headless.mjs ./headless.mjs
COPY --from=build /app/apps/web/dist ./web
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# the volume's mount point belongs to the app's user, otherwise a fresh named volume is root-owned and nothing can be written
RUN chmod 755 docker-entrypoint.sh && mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 47813
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:'+process.env.TURBOMUSIC_PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "--disable-warning=ExperimentalWarning", "headless.mjs"]
