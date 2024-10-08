import chalk from 'chalk';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

import { logger } from './logger.js';
import { api } from './api.js';

// api.interceptors.request.use(request => {
//   console.log('Starting Request', JSON.stringify(request, null, 2))
//   return request
// })

// api.interceptors.response.use(response => {
//   console.log('Response:', JSON.stringify(response, null, 2))
//   return response
// })


export const scrobbleRequest = async ({ action, body, title }) => {
  try {
    const response = await api.post(`/scrobble/${action}`, JSON.stringify(body), { cache: false });
    logger.info(`📡 Scrobbling ${title} (${action} - ${body.progress}%)`);
  } catch (err) {
    if (err.response.status == '409') {
      logger.error(
        `❌ ${chalk.red(`${title} has been scrobbled ${formatDistanceToNow(new Date(err.response.data.watched_at))} ago. Try again in ${formatDistanceToNow(new Date(err.response.data.expires_at))}.`)}`,
      );
    }
    logger.error(`❌ ${chalk.red(`Scrobble API error: ${err.message}`)}`);
  }
};

export const rateRequest = async ({ body, title, rating }) => {

  if (!rating) {
    logger.error(`❌ ${chalk.red(`No rating, aborting`)}`);
    return
  }

  try {
    const response = await api.post(`/sync/ratings`, JSON.stringify(body), { cache: false });
    logger.info(`❤️ Rating ${title} with (${rating}) ${'⭐'.repeat(rating)}`);
    logger.debug(JSON.stringify(response.data, null, 2))
  } catch (err) {
    logger.info(JSON.stringify(err, null, 2))
    logger.error(`❌ ${chalk.red(`Rate API error: ${err.message}`)}`);
  }
};


export const findMovieRequest = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const id = Guid[0].id.substring(7);

  logger.info(`🔍 Finding movie for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}://${id}`);

  try {
    const response = await api.get(`https://api.trakt.tv/search/${service}/${id}?type=movie`, { ttl: 1000 * 60 * 180 });

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
    const response = await api.get(`/search/${service}/${id}?type=episode`, { ttl: 1000 * 60 * 180 });
    logger.debug(JSON.stringify(payload, null, 2));
    logger.debug(JSON.stringify(response.data, null, 2));
    const { episode, show } = response.data[0];
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


export const findShowRequest = async (payload) => {
  const Guid = payload.Metadata.Guid;
  const service = Guid[0].id.substring(0, 4);
  const id = Guid[0].id.substring(7);
  logger.info(
    `🔍 Finding info for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}://${id}`,
  );

  try {
    const response = await api.get(`/search/${service}/${id}?type=show`, { ttl: 1000 * 60 * 180 });
    logger.debug(JSON.stringify(payload, null, 2));
    logger.info(JSON.stringify(response.data, null, 2));
    const { show } = response.data[0];
    logger.info(JSON.stringify(show, null, 2));
    logger.info(
      `📺 Show found: ${show.title} (${show.year})`,
    );
    return show;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Search show API error: ${err.message}`)}`);
  }
};


export const findSeasonRequest = async (payload) => {
  logger.info(
    `🔍 Finding info for ${payload.Metadata.parentTitle} (${payload.Metadata.parentYear}) - ${payload.Metadata.title} using ?query=${payload.Metadata.parentTitle} (${payload.Metadata.parentYear})`,
  );

  try {
    const response = await api.get(`/search/show?query=${payload.Metadata.parentTitle} (${payload.Metadata.parentYear})`, { ttl: 1000 * 60 * 180 });
    logger.debug(JSON.stringify(response.data, null, 2));
    const { show } = response.data[0];
    logger.info(
      `📺 Season found: ${show.title} (${show.year})`,
    );
    return show;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Search show API error: ${err.message}`)}`);
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
    }, { cache: false });
    const tokens = response.data;
    logger.debug(tokens);
    return tokens;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Auth API error: ${err.message}`)}`);
  }
};
