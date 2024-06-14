import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import { fromUnixTime, differenceInHours } from 'date-fns';
import chalk from 'chalk';
import { LocalStorage } from 'node-localstorage';
import { logger } from './logger.js';
import { handle } from './utils.js';
import { authorizeRequest } from './requests.js';

const app = express();
const PORT = process.env.PORT || 3090;

const upload = multer({ storage: multer.memoryStorage() });
import 'dotenv/config';

const localStorage = new LocalStorage('./data');

app.use(
  morgan('dev', {
    stream: {
      write: function (message) {
        logger.debug(message);
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/favicon.ico', express.static('favicon.ico'));

app.set('view engine', 'ejs');

const orange = chalk.rgb(249, 115, 22);

app.post('/api', upload.single('thumb'), async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  const event = payload.event;
  const type = payload.Metadata.type;
  const title = payload.Metadata.title;

  logger.debug(JSON.stringify(payload, null, 2));
  logger.info(`❗️ Event: ${event} 🏷️ Type: ${type} 🔖 Title: ${title}`);

  const tokens = localStorage.getItem('tokens');

  if (!tokens || tokens == 'undefined') {
    logger.error(`❌ ${chalk.red(`Error reading the file.`)}`);
    logger.info(
      `ℹ️ Have you authorized the application? Go to ${req.protocol}://${req.get('host')} to do it if needed.`,
    );
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
    logger.info(`🔐 Token expired, refreshing...`);
    const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;

    const tokens = await authorizeRequest({ grant_type: 'refresh_token', redirect_uri, refresh_token });

    if (tokens) {
      const data = JSON.stringify(tokens);
      localStorage.setItem('tokens', data);
      access_token = tokens.access_token;
    } else {
      logger.error(`❌ ${chalk.red(`No tokens found!`)}`);
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

app.get('/authorize', async (req, res) => {
  const code = req.query.code;
  const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;
  const tokens = await authorizeRequest({ code, grant_type: 'authorization_code', redirect_uri });
  if (tokens) {
    const data = JSON.stringify(tokens);
    localStorage.setItem('tokens', data);
  } else {
    logger.error(`❌ ${chalk.red(`No tokens found!`)}`);
    return;
  }

  res.render('pages/index', {
    self_url: `${req.protocol}://${req.get('host')}`,
    client_id: process.env.TRAKT_ID,
    code: req.query.code,
    authorized: true,
  });
});

app.listen(PORT, (error) => {
  if (!error) {
    logger.info(`🤖 Scrobb${orange('lex')} v${process.env.npm_package_version}`);
    logger.info(`⚡️ Connected successfully on http://localhost:${PORT}`);
  } else {
    logger.error(`❌ ${chalk.red(`Error occurred: ${error.message}`)}`);
  }
});
