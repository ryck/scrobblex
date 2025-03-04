// https://support.plex.tv/hc/en-us/articles/115002267687-Webhooks

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import chalk from 'chalk';
import { LocalStorage } from 'node-localstorage';
import _ from 'lodash';
import "express-async-errors";
import RateLimit from 'express-rate-limit';
import os from 'os';

import { logger } from './logger.js';
import { handle } from './utils.js';
import { authorizeRequest } from './api.js';

const app = express();
const PORT = process.env.PORT || 3090;

const upload = multer({ storage: multer.memoryStorage() });

const localStorage = new LocalStorage('./data');

const authorizeLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  logger.error(`❌ ${chalk.red(err.stack)}`);
  res.status(500).json({ error: 'Internal Server Error' });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(errorHandler);
app.use(express.static('static'));
app.use('/favicon.ico', express.static('favicon.ico'));
app.set('view engine', 'ejs');

const orange = chalk.rgb(235, 175, 0);

const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

app.post('/plex', upload.single('thumb'), async (req, res) => {
  if (!req.body.payload) {
    logger.error(`❌ ${chalk.red(`Missing payload.`)}`);
    return res.status(400).json({ error: 'Missing payload' });
  }

  const payload = JSON.parse(req.body.payload);

  const event = payload?.event;
  const type = payload?.Metadata?.type;
  const title = payload?.Metadata?.title;
  const id = payload?.Account?.id;
  const name = payload?.Account?.title;

  if (!event || !type || !title) {
    logger.debug(`Event: ${event} Type: ${type} Title: ${title} ID: ${id} Name: ${name}`);
    logger.error(`❌ ${chalk.red(`Missing required data.`)}`);
    return res.status(400).json({ error: 'Missing required data' });
  }

  logger.debug(`🔥 Event: ${event} 🏷️ Type: ${type} 🔖 Title: ${title} 👤 ${name} (${id})`);

  if (process.env.PLEX_USER) {
    if (!process.env.PLEX_USER.trim().toLowerCase().split(",").includes(name.trim().toLowerCase())) {
      logger.error(`❌ ${chalk.red(`User ${name} (${id}) is not in the list of allowed users: ${process.env.PLEX_USER}`)}`);
      return res.status(403).json({ error: 'User not allowed' });
    }
  }

  try {
    await handle({ payload });
    return res.status(200).json({ message: 'Success' });
  } catch (error) {
    logger.error(`❌ ${chalk.red(error.message)}`);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
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

app.get('/authorize', authorizeLimiter, async (req, res) => {
  const code = req.query.code;
  const redirect_uri = `${req.protocol}://${req.get('host')}/authorize`;
  try {
    const tokens = await authorizeRequest({ code, grant_type: 'authorization_code', redirect_uri });
    if (tokens) {
      const data = JSON.stringify(tokens);
      localStorage.setItem('tokens', data);
    } else {
      logger.error(`❌ ${chalk.red(`No tokens found!`)}`);
      logger.info(`ℹ️ Have you authorized the application? Go to ${req.protocol}://${req.get('host')} to do it if needed.`);
      return res.status(401).json({ error: 'Authorization required' });
    }

    res.render('pages/index', {
      self_url: `${req.protocol}://${req.get('host')}`,
      client_id: process.env.TRAKT_ID,
      code: req.query.code,
      authorized: true,
    });
  } catch (error) {
    logger.error(`❌ ${chalk.red(error.message)}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, (error) => {
  if (!error) {
    const localIp = getLocalIpAddress();

    logger.info(`🤖 Scrobb${orange('lex')} v${process.env.npm_package_version}`);
    logger.info(`🚀 Connected successfully on http://${localIp}:${PORT}`);

    const tokens = localStorage.getItem('tokens');
    if (!tokens || tokens == 'undefined') {
      logger.error(`❌ ${chalk.red(`Error getting token.`)}`);
      logger.warn(`🛟 You need to authorize the app. Please go to http://${localIp}:${PORT} and follow the instructions.`);
    }
  } else {
    logger.error(`❌ ${chalk.red(`Error occurred: ${error.message}`)}`);
  }
});

['SIGHUP', 'SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => process.exit()));