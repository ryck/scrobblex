<h1 align="center">
  <a href="https://github.com/ryck/scrobblex">
    <!-- Please provide path to your logo here -->
    <img src="docs/images/scrobblex.png" alt="scrobblex">
  </a>
</h1>

<div align="center">
  scrobblex
  <br />
  <br />
  <a href="https://github.com/ryck/scrobblex/issues/new?assignees=&labels=bug&template=01_BUG_REPORT.md&title=bug%3A+">Report a Bug</a>
  ·
  <a href="https://github.com/ryck/scrobblex/issues/new?assignees=&labels=enhancement&template=02_FEATURE_REQUEST.md&title=feat%3A+">Request a Feature</a>
  .<a href="https://github.com/ryck/scrobblex/discussions">Ask a Question</a>
</div>

<div align="center">
<br />

[![Project license](https://img.shields.io/github/license/ryck/scrobblex.svg?style=flat-square)](LICENSE)

[![Pull Requests welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg?style=flat-square)](https://github.com/ryck/scrobblex/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
[![code with love by ryck](https://img.shields.io/badge/%3C%2F%3E%20with%20%E2%99%A5%20by-ryck-ff1414.svg?style=flat-square)](https://github.com/ryck)


![Plex Pass](https://img.shields.io/badge/plex-pass-orange?style=flat-square&logo=plex&label=%20&labelColor=gray)
[![Docker](https://github.com/ryck/scrobblex/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/ryck/scrobblex/actions/workflows/docker-publish.yml)
[![latest version](https://img.shields.io/github/tag/ryck/scrobblex.svg)](https://github.com/ryck/scrobblex/releases)
[![MIT License](https://img.shields.io/github/license/ryck/scrobblex.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Pulls from DockerHub](https://img.shields.io/docker/pulls/rickgc/scrobblex.svg)](https://hub.docker.com/r/rickgc/scrobblex)
</div>

<details open="open">
<summary>Table of Contents</summary>

- [About](#about)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Usage](#usage)
  - [Docker](#docker)
    - [Using docker run](#using-docker-run)
    - [Using compose.yml](#using-composeyml)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Support](#support)
  - [WebsiteFAQ](#websitefaq)
    - [How to get ypur Plex ID](#how-to-get-ypur-plex-id)
- [Contributing](#contributing)
- [Authors \& contributors](#authors--contributors)
- [Security](#security)
- [License](#license)
- [Acknowledgements](#acknowledgements)

</details>

---

## About


Scrobblex is a self-hosted nodejs app that enables Plex scrobbling integration with Trakt via webhooks. It also allows you to push your ratings to Trakt.

Plex provides webhook integration for all Plex Pass subscribers, and users of their servers. A webhook is a request that the Plex application sends to third party services when a user takes an action, such as watching a movie or episode.

You can ask Plex to send these webhooks to this app, which will then log those plays in your Trakt account.

<details>
<summary>Screenshots</summary>
<br>

This is basically a command line app, so there are no screenshots really, BUT I wanted to have at least some pretty logs:

![Screenshot](https://github.com/ryck/scrobblex/blob/master/docs/screenshot.png?raw=true)

</details>

### Built With

- NodejS
- Express
- TailwindCSS

## Getting Started

You don't need a Trakt VIP account to use this app (scrobblex will take care of that), BUT you need a Plex Pass subscription in order to have access to webhooks.

### Usage

```bash
git clone https://github.com/ryck/scrobblex.git && cd scrobblex
npm install
npm run start
```

Once Scrobblex is running, just go to http://$YOUR_IP:$PORT/ (ie: http://10.20.30.40:3090/) and a web page will guide you to get your token.

### Docker

Scrobblex is designed to be run in Docker. You can host it right on your Plex server!

To run it yourself, first create an API application through Trakt [here](https://trakt.tv/oauth/applications). Set the Allowed Hostnames to be the URI you will hit to access Scrobblex, plus /authorize. So if you're exposing your server at http://10.20.30.40:3090, you'll set it to http://10.20.30.40:3090/authorize. Bare IP addresses and ports are totally fine, but keep in mind your Scrobblex instance _must_ be accessible to _all_ the Plex servers you intend to play media from.

Again, once Scrobblex is running, just go to http://$YOUR_IP:$PORT/ (ie: http://10.20.30.40:3090/) and a web page will guide you to get your token.

#### Using docker run

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

#### Using compose.yml

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


## Environment Variables

| Variable     | Default   | Description                                             |
| ------------ | --------- | ------------------------------------------------------- |
| TRAKT_ID     | undefined | Trakt application ID                                    |
| TRAKT_SECRET | undefined | Trakt application secret                                |
| PLEX_ID      | undefined | Plex ID (if you only want to scrobble for certain user) |
| PORT         | 3090      | Exposed express port                                    |
| LOG_LEVEL    | info      | winston log level: ie: info, debug                      |



## Roadmap

See the [open issues](https://github.com/ryck/scrobblex/issues) for a list of proposed features (and known issues).

- [Top Feature Requests](https://github.com/ryck/scrobblex/issues?q=label%3Aenhancement+is%3Aopen+sort%3Areactions-%2B1-desc) (Add your votes using the 👍 reaction)
- [Top Bugs](https://github.com/ryck/scrobblex/issues?q=is%3Aissue+is%3Aopen+label%3Abug+sort%3Areactions-%2B1-desc) (Add your votes using the 👍 reaction)
- [Newest Bugs](https://github.com/ryck/scrobblex/issues?q=is%3Aopen+is%3Aissue+label%3Abug)

## Support

Reach out to the maintainer at one of the following places:

- [GitHub Discussions](https://github.com/ryck/scrobblex/discussions)
- Contact options listed on [this GitHub profile](https://github.com/ryck)

### WebsiteFAQ
#### How to get ypur Plex ID

Apparently, Plex does not expose the Plex ID in the web interface anymore (it used to be on your profile page, but not anymore).

To get your Plex ID:
1. Go to Payments on the [Plex website](https://clients.plex.tv/users/payments)
2. Using dev tools on your browser, look for `name="plex-user-id"` in the HTML
3. The `content` attribute of that tag is your Plex ID

Example:

```html
<meta name="plex-user-id" content="123456789">
```


## Contributing

First off, thanks for taking the time to contribute! Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make will benefit everybody else and are **greatly appreciated**.


Please read [our contribution guidelines](docs/CONTRIBUTING.md), and thank you for being involved!

## Authors & contributors

The original setup of this repository is by [Ricardo Gonzalez](https://github.com/ryck).

For a full list of all authors and contributors, see [the contributors page](https://github.com/ryck/scrobblex/contributors).

## Security

scrobblex follows good practices of security, but 100% security cannot be assured.
scrobblex is provided **"as is"** without any **warranty**. Use at your own risk.

_For more information and to report security issues, please refer to our [security documentation](docs/SECURITY.md)._

## License

This project is licensed under the **MIT license**.

See [LICENSE](LICENSE) for more information.

## Acknowledgements

[XanderStrike](https://github.com/XanderStrike) for his [goplaxt](https://github.com/XanderStrike/goplaxt) project (now sadly dicontinued). It was a great inspiration for this project. Scrobblex is basically the same thing, but in NodeJS, so kudos to him!

If you want something more powerful, (or something that doesn't need a plexx pass), check [PlexTraktSync](https://github.com/Taxel/PlexTraktSync), it's an awesome project.