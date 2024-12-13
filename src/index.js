import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import chalk from 'chalk';
import { LocalStorage } from 'node-localstorage';
import 'dotenv/config';

import { logger } from './logger.js';
import { handle } from './utils.js';
import { authorizeRequest } from './api.js';

const app = express();
const PORT = process.env.PORT || 3090;

const upload = multer({ storage: multer.memoryStorage() });

const localStorage = new LocalStorage('./data');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/favicon.ico', express.static('favicon.ico'));

app.set('view engine', 'ejs');

const orange = chalk.rgb(249, 115, 22);


app.post('/api', upload.single('thumb'), async (req, res) => {
  if (!req.body.payload) {
    logger.error(`❌ ${chalk.red(`Missing payload.`)}`);
    return;
  }

  const payload = JSON.parse(req.body.payload);

  const event = payload?.event;
  const type = payload?.Metadata?.type;
  const title = payload?.Metadata?.title;

  if (!event || !type || !title) {
    logger.error(`❌ ${chalk.red(`Missing data.`)}`);
    return;
  }

  logger.info(`❗️ Event: ${event} 🏷️ Type: ${type} 🔖 Title: ${title}`);

  handle({ payload });
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
    logger.info(
      `ℹ️ Have you authorized the application? Go to ${req.protocol}://${req.get('host')} to do it if needed.`,
    );
    return res.status(401)
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
    logger.info(`🚀 Connected successfully on http://localhost:${PORT}`);

    const tokens = localStorage.getItem('tokens');
    if (!tokens || tokens == 'undefined') {
      logger.error(`❌ ${chalk.red(`Error getting token.`)}`);
      logger.warn(
        `⚠️ You need to authorize the app. Please go to http://localhost:${PORT} and follow the instructions.`,
      );
    }
  } else {
    logger.error(`❌ ${chalk.red(`Error occurred: ${error.message}`)}`);
  }
});

