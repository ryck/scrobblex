import chalk from 'chalk';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

import { logger } from './logger.js';

export const scrobbleRequest = async ({ action, body, access_token, title }) => {
  try {
    const response = await axios.post(`https://api.trakt.tv/scrobble/${action}`, JSON.stringify(body), {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_ID,
        'trakt-api-version': '2',
      },
    });
    logger.info(`📡 Scrobbling ${title} (${action} - ${body.progress}%)`);
    logger.debug(response)
  } catch (err) {
    if (err.response.status == '409') {
      logger.error(
        `❌ ${chalk.red(`${title} has been scrobbled ${formatDistanceToNow(new Date(err.response.data.watched_at))} ago. Try again in ${formatDistanceToNow(new Date(err.response.data.expires_at))}.`)}`,
      );
      return;
    }
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
    logger.debug(movie);
    const { title, year } = movie;
    logger.info(`🎬 Movie found: ${title} (${year})`);

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
    logger.debug(`https://api.trakt.tv/search/${service}/${id}?type=episode`)
    logger.debug(JSON.stringify(payload, null, 2));
    logger.debug(JSON.stringify(response.data, null, 2));
    const {episode, show} = response.data[0];
    logger.debug(episode);
    logger.debug(show);
    logger.info(
      `📺 Episode found: ${show.title} (${show.year}) - S${episode.season.toString().padStart(2, '0')}E${episode.number.toString().padStart(2, '0')} - ${episode.title}`,
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
    logger.debug(tokens);
    return tokens;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Auth API error: ${err.message}`)}`);
  }
};
