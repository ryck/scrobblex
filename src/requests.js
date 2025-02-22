import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns';

import { logger } from './logger.js';
import { api } from './api.js';
import { GetGuid } from './utils.js';

export const scrobbleRequest = async ({ action, body, title }) => {
  try {
    const response = await api.post(`/scrobble/${action}`, JSON.stringify(body), { cache: false });
    logger.info(`📡 Scrobbling ${title} [${action}]`);
    logger.debug(JSON.stringify(body, null, 2))
    logger.debug(JSON.stringify(response.data, null, 2))

  } catch (err) {
    if (err.response?.status == '409') {
      logger.error(
        `❌ ${chalk.red(`${title} has been scrobbled ${formatDistanceToNow(new Date(err.response.data.watched_at))} ago. Try again in ${formatDistanceToNow(new Date(err.response.data.expires_at))}.`)}`,
      );
    }
    logger.error(`❌ ${chalk.red(`Scrobble API error: ${err.message}`)}`);
  }
};

export const rateRequest = async ({ body, title, rating }) => {
  if (!rating || rating < 1 || rating > 10) {
    logger.error(`❌ ${chalk.red(`Invalid rating, aborting`)}`);
    return
  }
  logger.debug(JSON.stringify(body, null, 2))
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
  const { service, id } = GetGuid({ payload })

  if (service && id) {
    logger.info(`🔍 Finding movie info for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}://${id}`);

  } else {
    logger.error(`❌ ${chalk.red(`No GUID available`)}`);
    return
  }

  try {
    const response = await api.get(`https://api.trakt.tv/search/${service}/${id}?type=movie`, { ttl: 1000 * 60 * 180 });
    if (!response.data.length) {
      logger.error(`❌ ${chalk.red(`Response was empty!`)}`);
      return
    }
    const movie = response.data[0].movie;
    const { title, year } = movie;
    logger.info(`🎬 Movie found: ${title} (${year})`);

    return movie;
  } catch (err) {
    // Error handling here
    logger.error(`❌ ${chalk.red(`Search movie API error: ${err.message}`)}`);
  }
};

export const findEpisodeRequest = async (payload) => {
  const { service, id } = GetGuid({ payload })

  if (service && id) {
    logger.info(
      `🔍 Finding episode info for ${payload.Metadata.grandparentTitle} (${payload.Metadata.year}) - ${payload.Metadata.parentTitle} - ${payload.Metadata.title} using ${service}://${id}`,
    );
  } else {
    logger.error(`❌ ${chalk.red(`No GUID available`)}`);
    return
  }

  try {
    const response = await api.get(`/search/${service}/${id}?type=episode`, { ttl: 1000 * 60 * 180 });
    logger.debug(`/search/${service}/${id}?type=episode`)
    logger.debug(JSON.stringify(response.data, null, 2));
    if (!response.data.length) {
      logger.error(`❌ ${chalk.red(`Response was empty!`)}`);
      return
    }
    const { episode, show } = response.data[0];
    logger.info(
      `📺 Episode found: ${show.title} (${show.year}) - S${episode.season.toString().padStart(2, '0')}E${episode.number.toString().padStart(2, '0')} - ${episode.title}`,
    );
    return episode;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Search episode API error: ${err.message}`)}`);
  }
};


export const findShowRequest = async (payload) => {
  const { service, id } = GetGuid({ payload })

  if (service && id) {
    logger.info(
      `🔍 Finding show info for ${payload.Metadata.title} (${payload.Metadata.year}) using ${service}://${id}`,
    );

  } else {
    logger.error(`❌ ${chalk.red(`No GUID available`)}`);
    return
  }

  try {
    const response = await api.get(`/search/${service}/${id}?type=show`, { ttl: 1000 * 60 * 180 });
    logger.debug(JSON.stringify(payload, null, 2));
    logger.debug(JSON.stringify(response.data, null, 2));
    if (!response.data.length) {
      logger.error(`❌ ${chalk.red(`Response was empty!`)}`);
      return
    }
    const { show } = response.data[0];
    // logger.debug(JSON.stringify(show, null, 2));
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
    `🔍 Finding season info for ${payload.Metadata.parentTitle} (${payload.Metadata.parentYear}) - ${payload.Metadata.title} using ?query=${payload.Metadata.parentTitle} (${payload.Metadata.parentYear})`,
  );

  try {
    const response = await api.get(`/search/show?query=${payload.Metadata.parentTitle} (${payload.Metadata.parentYear})`, { ttl: 1000 * 60 * 180 });
    logger.debug(JSON.stringify(response.data, null, 2));
    if (!response.data.length) {
      logger.error(`❌ ${chalk.red(`Response was empty!`)}`);
      return
    }
    const { show } = response.data[0];
    logger.info(
      `📺 Season found: ${show.title} (${show.year})`,
    );
    return show;
  } catch (err) {
    logger.error(`❌ ${chalk.red(`Search show API error: ${err.message}`)}`);
  }
};



