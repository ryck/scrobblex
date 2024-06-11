import chalk from 'chalk';
import axios from 'axios';

import { logger } from './logger.js';

export const scrobbleRequest = async ({ action, body, access_token, title }) => {
  try {
    await axios.post(`https://api.trakt.tv/scrobble/${action}`, JSON.stringify(body), {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_ID,
        'trakt-api-version': '2',
      },
    });
    logger.info(`📡 Scrobbling ${title} (${action})`);
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Scrobble API error: ${err.message}`)}`);
  }
};

export const findMovieRequest = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const id = Guid[0].id.substring(7);

  logger.info(`🔍 Finding movie for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}://${id}`);

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
    logger.info(`🎬 Movie found: ${title} (${year}) - IDs: ${JSON.stringify(ids)}`);

    return movie;
  } catch (err) {
    // Error handling here
    logger.error(`❌ ${chalk.red(`Search movie API error: ${err.message}`)}`);
  }
};

export const findEpisodeRequest = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const id = Guid[0].id.substring(7);
  logger.info(
    `🔍 Finding show for ${payload.Metadata.grandparentTitle} (${payload.Metadata.year}) - ${payload.Metadata.parentTitle} - ${payload.Metadata.title} using ${service}://${id}`,
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
    logger.info(
      `📺 Episode found: S${season.toString().padStart(2, '0')}E${number
        .toString()
        .padStart(2, '0')} - ${title} - IDs: ${JSON.stringify(ids)}`,
    );
    return episode;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Search episode API error: ${err.message}`)}`);
  }
};

export const authorizeRequest = async ({ code, redirect_uri, refresh_token, grant_type }) => {
  logger.info(`🔑 Getting token`);
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
    logger.error(`❌ ${chalk.red(`Auth API error: ${err.message}`)}`);
  }
};
