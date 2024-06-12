FROM node:lts-alpine as base

LABEL org.opencontainers.image.title "Scrobblex"
LABEL org.opencontainers.image.description "Self-hosted app that enables Plex scrobbling integration with Trakt via webhooks"
LABEL org.opencontainers.image.url="https://github.com/ryck/scrobblex"
LABEL org.opencontainers.image.source='https://github.com/ryck/scrobblex'
LABEL org.opencontainers.image.licenses='MIT'

ENV NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ENV PORT=3090
ENV PORT $PORT
ENV LOG_LEVEL=info
ENV LOG_LEVEL $LOG_LEVEL


HEALTHCHECK CMD curl --fail http://localhost:${PORT}/healthcheck || exit 1

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE ${PORT}

CMD ["node",  "src/index.js"]
