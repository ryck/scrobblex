# Scrobblex

[![Docker](https://github.com/ryck/scrobblex/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/ryck/scrobblex/actions/workflows/docker-publish.yml)
[![latest version](https://img.shields.io/github/tag/ryck/scrobblex.svg)](https://github.com/ryck/scrobblex/releases)
[![MIT License](https://img.shields.io/github/license/ryck/scrobblex.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Pulls from DockerHub](https://img.shields.io/docker/pulls/rickgc/scrobblex.svg)](https://hub.docker.com/r/rickgc/scrobblex)

## Description

Self-hosted app that enables Plex scrobbling integration with Trakt via webhooks.

Plex provides webhook integration for all Plex Pass subscribers, and users of their servers. A webhook is a request that the Plex application sends to third party services when a user takes an action, such as watching a movie or episode.

You can ask Plex to send these webhooks to this tool, which will then log those plays in your Trakt account.

## Installation

Scrobblex is designed to be run in Docker. You can host it right on your Plex server!

To run it yourself, first create an API application through Trakt [here](https://trakt.tv/oauth/applications). Set the Allowed Hostnames to be the URI you will hit to access Scrobblex, plus /authorize. So if you're exposing your server at http://10.20.30.40:3090, you'll set it to http://10.20.30.40:3090/authorize. Bare IP addresses and ports are totally fine, but keep in mind your Scrobblex instance _must_ be accessible to _all_ the Plex servers you intend to play media from.

Once Scrobblex is running, just go to http://$YOUR_IP:$PORT/ (ie: http://10.20.30.40:3090/) and a web page will guide you to get your token.

### Using docker run

```bash
docker run \
  --name=scrobbler \
  --restart always \
  -v <path to configs>:/app/data \
  -e TRAKT_ID=<trakt_id> \
  -e TRAKT_SECRET=<trakt_secret> \
  -p 3090:3090 \
  rickgc/scrobblex:latest
```

### Using docker-compose.yml

```yaml
services:
  scrobbled:
    image: rickgc/scrobblex:latest
    container_name: scrobblex
    restart: always
    ports:
      - 3090:3090
    environment:
      - TRAKT_ID=YOUR_TRAKT_ID
      - TRAKT_SECRET=YOUR_TRAKT_SECRET
      - LOG_LEVEL=info
    volumes:
      - ./scrobblex:/app/data
```

### compile from source

```bash
git clone https://github.com/ryck/scrobblex.git && cd scrobblex
npm install
npm run start
```

## Environment Variables

| Variable     | Default   | Description                        |
| ------------ | --------- | ---------------------------------- |
| TRAKT_ID     | undefined | Trakt application ID               |
| TRAKT_SECRET | undefined | Trakt application secret           |
| PORT         | 3090      | Exposed express port               |
| LOG_LEVEL    | info      | winston log level: ie: info, debug |

## Thanks To...

[XanderStrike](https://github.com/XanderStrike) for his [goplaxt](https://github.com/XanderStrike/goplaxt) project. Scrobblex is basically the same thing, but in NodeJS, so kudos to him!

## License

MIT
