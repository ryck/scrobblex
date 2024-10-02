import chalk from 'chalk';

import { logger } from './logger.js';
import { scrobbleRequest, findEpisodeRequest, findMovieRequest } from './requests.js';

export const getAction = ({ event, viewOffset = 99.9, duration }) => {
  const progress = ((viewOffset / duration) * 100).toFixed(2)
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
      res.progress = progress;
      break;
    case 'media.scrobble':
      res.action = 'stop';
      res.progress = progress < 90 ? 90 : progress;
      break;
  }
  return res;
};

export const handle = ({ payload, access_token }) => {
  const events = ['media.play', 'media.pause', 'media.resume', 'media.stop', 'media.scrobble'];
  const { librarySectionType } = payload.Metadata;
  if (!events.includes(payload.event)) {
    logger.error(`❌ ${chalk.red(`Event ${payload.event} is not supported`)}`);
    return;
  }
  if (librarySectionType == 'show') {
    handleShow({ payload, access_token });
  } else if (librarySectionType == 'movie') {
    handleMovie({ payload, access_token });
  }
};

export const handleMovie = async ({ payload, access_token }) => {
  const { event } = payload;
  const { viewOffset, duration } = payload.Metadata;
  const { action, progress } = getAction({ event, viewOffset, duration });
  const movie = await findMovieRequest(payload);
  if (!movie) {
    logger.error(`❌ ${chalk.red(`Couldn't find movie info`)}`);
    return;
  }
  const body = {
    movie,
    progress,
  };

  const title = `🎬 ${payload.Metadata.title}`;
  scrobbleRequest({ action, body, access_token, title });
};
export const handleShow = async ({ payload, access_token }) => {
  const { event } = payload;
  const { viewOffset, duration } = payload.Metadata;
  const { action, progress } = getAction({ event, viewOffset, duration });
  const episode = await findEpisodeRequest(payload);

  if (!episode) {
    logger.error(`❌ ${chalk.red(`Couldn't find episode info`)}`);
    return;
  }
  const body = {
    episode,
    progress,
  };

  const title = `📺 ${payload.Metadata.title}`;
  scrobbleRequest({ action, body, access_token, title });
};
