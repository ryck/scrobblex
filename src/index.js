import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import { fromUnixTime, differenceInHours } from 'date-fns';
import axios from 'axios';
import chalk from 'chalk';
import { LocalStorage } from 'node-localstorage';

// // localStorage.setItem('Name', 'Manish Mandal');
// console.log(localStorage.getItem('Name'));

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

app.set('view engine', 'ejs');

const getAction = (action) => {
  let res = {
    action: 'start', // start, pause, stop
    progress: 0, //0, 90
  };
  switch (action) {
    case 'media.play':
      res.action = 'start';
      res.progress = 0;
      break;
    case 'media.pause':
      res.action = 'pause';
      res.progress = 0;
      break;
    case 'media.resume':
      res.action = 'start';
      res.progress = 0;
      break;
    case 'media.stop':
      res.action = 'stop';
      res.progress = 0;
      break;
    case 'media.scrobble':
      res.action = 'scrobble';
      res.progress = 90;
      break;
  }

  return res;
};

// console.log(getAction('media.play'));
// console.log(getAction('media.pause'));
// console.log(getAction('media.resume'));
// console.log(getAction('media.stop'));
// console.log(getAction('media.scrobble'));

// Handle determine if an item is a show or a movie
const handle = ({ payload, access_token }) => {
  const { librarySectionType } = payload.Metadata;
  if (librarySectionType == 'show') {
    handleShow({ payload, access_token });
  } else if (librarySectionType == 'movie') {
    handleMovie({ payload, access_token });
  }
  // log(`\n✨ Event logged`);
};

const scrobbleRequest = async ({ action, body, access_token, title }) => {
  // console.log(JSON.stringify(body));
  // console.log(body);

  try {
    await axios.post(`https://api.trakt.tv/scrobble/${action}`, JSON.stringify(body), {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_ID,
        'trakt-api-version': '2',
      },
    });
    // log(response.data);
    log(`\n🎯 Scrobbling ${title} (${action})`);
  } catch (err) {
    log(`❌ ${chalk.red(`Scrobble API error: ${err.message}`)}`);
  }
};

const handleMovie = async ({ payload, access_token }) => {
  const { action, progress } = getAction(payload.event);
  const movie = await findMovie(payload);
  if (!movie) {
    log(`❌ ${chalk.red(`Couldn't find movie info`)}`);
    return;
  } // const item = movie.movie;
  // log(item);
  const body = {
    movie,
    progress,
  };

  // console.log(body);
  // console.log(access_token);
  const title = `🎬 ${payload.Metadata.title}`;
  scrobbleRequest({ action, body, access_token, title });
};
const handleShow = async ({ payload, access_token }) => {
  const { action, progress } = getAction(payload.event);
  const episode = await findEpisode(payload);

  if (!episode) {
    log(`❌ ${chalk.red(`Couldn't find episode info`)}`);
    return;
  }
  // const item = movie.movie;
  // log(item);
  const body = {
    episode,
    progress,
  };

  // console.log(body);

  const title = `📺 ${payload.Metadata.title}`;
  scrobbleRequest({ action, body, access_token, title });
};

const findMovie = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const episodeID = Guid[0].id.substring(7);

  log(`🔍 Finding movie for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}`);

  try {
    const response = await axios.get(`https://api.trakt.tv/search/${service}/${episodeID}?type=movie`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_ID,
      },
    });

    // log(response.data);
    const movie = response.data[0].movie;

    // log(response.data);
    // log(movie);

    return movie;
  } catch (err) {
    // Error handling here
    log(`❌ ${chalk.red(`Search movie API error: ${err.message}`)}`);
  }
};

const findEpisode = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const episodeID = Guid[0].id.substring(7);
  log(
    `🔍 Finding show for ${payload.Metadata.grandparentTitle} (${payload.Metadata.year}) - ${payload.Metadata.parentTitle} - ${payload.Metadata.title} using ${service}`,
  );

  // let showID;
  // let service = 'tvdb'; // tvdb, tmdb, imdb

  // showID = Guid.find((item) => item.id.includes('tvdb://'));
  // if (!showID) {
  // 	showID = Guid.find((item) => item.id.includes('tmdb://'));
  // 	service = 'tmdb';
  // }
  // if (!showID) {
  // 	showID = Guid.find((item) => item.id.includes('imdb://'));
  // 	service = 'imdb';
  // }
  // const regex = /[a-z]*:\/\//;
  // const episodeID = showID.id.replace(regex, '');

  // console.log(episodeID, service);

  try {
    const response = await axios.get(`https://api.trakt.tv/search/${service}/${episodeID}?type=episode`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        // 'trakt-api-key': process.env.TRAKT_ID,
      },
    });

    const episode = response.data[0].episode;

    return episode;
  } catch (err) {
    // Error handling here
    log(`❌ ${chalk.red(`Search episode API error: ${err.message}`)}`);
  }
};

app.post('/api', upload.single('thumb'), async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  const event = payload.event;
  const type = payload.Metadata.type;
  const title = payload.Metadata.title;

  log(`\n❗️ ${event} 🏷️ ${type} 🔖 ${title}\n`);

  const tokens = localStorage.getItem('tokens');

  if (!tokens) {
    log(`❌ ${chalk.red(`Error reading the file.`)}`);
    log(`ℹ️ Have you authorized the application? Go to ${req.protocol}://${req.get('host')} to do it if needed.`);
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
  // log(tokenAge);
  if (tokenAge > 1440) {
    // tokens expire after 3 months, so we refresh after 2
    log(`\n🔐 User access token outdated, refreshing...`);
    const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;

    const tokens = await authRequest({ grant_type: 'refresh_token', redirect_uri, refresh_token });
    const data = JSON.stringify(tokens);
    // fs.writeFileSync('data/tokens.json', data);
    localStorage.setItem('tokens', data);

    access_token = tokens.access_token;
  }

  handle({ payload, access_token });
  // console.log(payload);
  // console.log(payload.Metadata.Guid);
  // console.log(payload.Metadata.ExternalGuid);
  // console.log(process.env.TRAKT_ID);
  // console.log(JSON.stringify(payload));
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
  log(`🔑 Getting token`);
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
  // log(body);

  try {
    const response = await axios.post(`https://api.trakt.tv/oauth/token`, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        // 'trakt-api-version': '2',
      },
    });

    // log(response.data);
    const tokens = response.data;
    return tokens;
  } catch (err) {
    // Error handling here
    return res.status(401).send(err.message);
  }
};

app.get('/authorize', async (req, res) => {
  // log(req.query.code);

  const code = req.query.code;
  const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;

  const tokens = await authRequest({ code, grant_type: 'authorization_code', redirect_uri });
  // log(tokens);
  const data = JSON.stringify(tokens);
  // fs.writeFileSync('data/tokens.json', data);
  localStorage.setItem('tokens', data);

  res.render('pages/index', {
    self_url: `${req.protocol}://${req.get('host')}`,
    client_id: process.env.TRAKT_ID,
    code: req.query.code,
    authorized: true,
  });
});

try {
  app.listen(PORT, () => {
    console.log(`🏁 Connected successfully on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error(`Error occurred: ${error.message}`);
}
