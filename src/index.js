import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import { fromUnixTime, differenceInHours } from 'date-fns';
import axios from 'axios';
import chalk from 'chalk';
import { LocalStorage } from 'node-localstorage';

const app = express();
const PORT = process.env.PORT || 3090;

const upload = multer({ storage: multer.memoryStorage() });
import 'dotenv/config';

const localStorage = new LocalStorage('./data');
const log = console.log;

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/favicon.ico', express.static('favicon.ico'));

app.set('view engine', 'ejs');

const getAction = ({ event, viewOffset = 99.9, duration }) => {
  const progress = Number.parseFloat((viewOffset / duration) * 100).toFixed(2);
  let res = {
    action: 'start', // start, pause, stop
    progress: progress, //0, 90
  };
  switch (event) {
    case 'media.play':
      res.action = 'start';
      res.progress = progress;
      break;
    case 'media.pause':
      res.action = 'pause';
      res.progress = progress;
      break;
    case 'media.resume':
      res.action = 'start';
      res.progress = progress;
      break;
    case 'media.stop':
      res.action = 'stop';
      res.progress = 0;
      break;
    case 'media.scrobble':
      res.action = 'stop';
      res.progress = progress;
      break;
  }
  return res;
};

// Handle determine if an item is a show or a movie
const handle = ({ payload, access_token }) => {
  const events = ['media.play', 'media.pause', 'media.resume', 'media.stop', 'media.scrobble'];
  const { librarySectionType } = payload.Metadata;
  if (!events.includes(payload.event)) {
    log(`❌ ${chalk.red(`Event ${payload.event} is not supported`)}`);
    return;
  }
  if (librarySectionType == 'show') {
    handleShow({ payload, access_token });
  } else if (librarySectionType == 'movie') {
    handleMovie({ payload, access_token });
  }
};

const scrobbleRequest = async ({ action, body, access_token, title }) => {
  try {
    await axios.post(`https://api.trakt.tv/scrobble/${action}`, JSON.stringify(body), {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_ID,
        'trakt-api-version': '2',
      },
    });
    log(`\n📡 Scrobbling ${title} (${action})`);
  } catch (err) {
    log(`❌ ${chalk.red(`Scrobble API error: ${err.message}`)}`);
  }
};

const handleMovie = async ({ payload, access_token }) => {
  const { event } = payload;
  const { viewOffset, duration } = payload.Metadata;
  const { action, progress } = getAction({ event, viewOffset, duration });
  const movie = await findMovie(payload);
  if (!movie) {
    log(`❌ ${chalk.red(`Couldn't find movie info`)}`);
    return;
  }
  const body = {
    movie,
    progress,
  };

  const title = `🎬 ${payload.Metadata.title}`;
  scrobbleRequest({ action, body, access_token, title });
};
const handleShow = async ({ payload, access_token }) => {
  const { event } = payload;
  const { viewOffset, duration } = payload.Metadata;
  const { action, progress } = getAction({ event, viewOffset, duration });
  const episode = await findEpisode(payload);

  if (!episode) {
    log(`❌ ${chalk.red(`Couldn't find episode info`)}`);
    return;
  }
  const body = {
    episode,
    progress,
  };

  const title = `📺 ${payload.Metadata.title}`;
  scrobbleRequest({ action, body, access_token, title });
};

const findMovie = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const id = Guid[0].id.substring(7);

  log(`\n🔍 Finding movie for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}://${id}`);

  try {
    const response = await axios.get(`https://api.trakt.tv/search/${service}/${id}?type=movie`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_ID,
      },
    });

    const movie = response.data[0].movie;
    const { title, year, ids } = movie;
    log(`\n🎬 Movie found: ${title} (${year}) - IDs: ${JSON.stringify(ids)}`);

    return movie;
  } catch (err) {
    // Error handling here
    log(`\n❌ ${chalk.red(`Search movie API error: ${err.message}`)}`);
  }
};

const findEpisode = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const id = Guid[0].id.substring(7);
  log(
    `\n🔍 Finding show for ${payload.Metadata.grandparentTitle} (${payload.Metadata.year}) - ${payload.Metadata.parentTitle} - ${payload.Metadata.title} using ${service}://${id}`,
  );

  try {
    const response = await axios.get(`https://api.trakt.tv/search/${service}/${id}?type=episode`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_ID,
      },
    });

    const episode = response.data[0].episode;
    const { season, number, title, ids } = episode;
    log(
      `\n📺 Episode found: S${season.toString().padStart(2, '0')}E${number
        .toString()
        .padStart(2, '0')} - ${title} - IDs: ${JSON.stringify(ids)}`,
    );
    return episode;
  } catch (err) {
    log(`\n❌ ${chalk.red(`Search episode API error: ${err.message}`)}`);
  }
};

app.post('/api', upload.single('thumb'), async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  const event = payload.event;
  const type = payload.Metadata.type;
  const title = payload.Metadata.title;

  log(`\n❗️ Event: ${event} 🏷️ Type: ${type} 🔖 Title: ${title}`);

  const tokens = localStorage.getItem('tokens');

  if (!tokens || tokens == 'undefined') {
    log(`\n❌ ${chalk.red(`Error reading the file.`)}`);
    log(`\nℹ️ Have you authorized the application? Go to ${req.protocol}://${req.get('host')} to do it if needed.`);
    return res.status(401);
  }
  let { access_token, refresh_token, created_at } = JSON.parse(tokens);

  if (!access_token) {
    throw new Error('No access token found! Please authorize the application again...');
  }

  if (!refresh_token) {
    throw new Error('No access token found! Please authorize the application again...');
  }

  const tokenAge = differenceInHours(new Date(), new Date(fromUnixTime(created_at)));
  if (tokenAge > 1440) {
    // tokens expire after 3 months, so we refresh after 2
    log(`\n🔐 Token expired, refreshing...`);
    const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;

    const tokens = await authRequest({ grant_type: 'refresh_token', redirect_uri, refresh_token });

    if (tokens) {
      const data = JSON.stringify(tokens);
      localStorage.setItem('tokens', data);
      access_token = tokens.access_token;
    } else {
      log(`\n❌ ${chalk.red(`No tokens found!`)}`);
      return res.status(401);
    }
  }

  handle({ payload, access_token });
  return res.status(200);
});

app.get('/healthcheck', async (_req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
  };
  try {
    res.status(200).send(healthcheck);
  } catch (e) {
    healthcheck.message = e;
    res.status(503).send(healthcheck);
  }
});

app.get('/', async (req, res) => {
  res.render('pages/index', {
    self_url: `${req.protocol}://${req.get('host')}`,
    client_id: process.env.TRAKT_ID,
    authorized: false,
  });
});

const authRequest = async ({ code, redirect_uri, refresh_token, grant_type }) => {
  log(`\n🔑 Getting token`);
  const client_id = process.env.TRAKT_ID;
  const client_secret = process.env.TRAKT_SECRET;

  const body = {
    code,
    refresh_token,
    client_id,
    client_secret,
    redirect_uri,
    grant_type,
  };

  try {
    const response = await axios.post(`https://api.trakt.tv/oauth/token`, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const tokens = response.data;
    return tokens;
  } catch (err) {
    log(`\n❌ ${chalk.red(`Auth API error: ${err.message}`)}`);
  }
};

app.get('/authorize', async (req, res) => {
  const code = req.query.code;
  const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;
  const tokens = await authRequest({ code, grant_type: 'authorization_code', redirect_uri });
  if (tokens) {
    const data = JSON.stringify(tokens);
    localStorage.setItem('tokens', data);
  } else {
    log(`\n❌ ${chalk.red(`No tokens found!`)}`);
    return;
  }

  res.render('pages/index', {
    self_url: `${req.protocol}://${req.get('host')}`,
    client_id: process.env.TRAKT_ID,
    code: req.query.code,
    authorized: true,
  });
});

try {
  app.listen(PORT, () => {
    console.log(`\n✅ Connected successfully on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error(`Error occurred: ${error.message}`);
}

// const onCloseSignal = () => {
//   log(`💣 sigint received, shutting down`);
//   app.close(() => {
//     log('💀 server closed');
//     process.exit();
//   });
//   setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
// };

// process.on('SIGINT', onCloseSignal);
// process.on('SIGTERM', onCloseSignal);
