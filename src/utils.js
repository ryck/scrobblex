import chalk from 'chalk';

import { logger } from './logger.js';
import { scrobbleRequest, rateRequest, findEpisodeRequest, findMovieRequest, findShowRequest, findSeasonRequest } from './requests.js';

export const getAction = ({ event, viewOffset, duration }) => {
  logger.debug(`${viewOffset} / ${duration}`)
  let progress = null
  if (viewOffset && duration) {
    progress = ((viewOffset / duration) * 100).toFixed(2)
  }
  let res = {
    action: 'start', // start, pause, stop, scrobble
    progress: 0, //0, 90
  };
  switch (event) {
    case 'media.play':
      res.action = 'start';
      res.progress = progress ? progress : 0;
      break;
    case 'media.pause':
      res.action = 'pause';
      res.progress = progress ? progress : 0;
      break;
    case 'media.resume':
      res.action = 'start';
      res.progress = progress ? progress : 0;
      break;
    case 'media.stop':
      res.action = 'stop';
      res.progress = progress ? progress : 0;
      break;
    case 'media.scrobble':
      res.action = 'stop';
      res.progress = progress && progress < 80 ? progress : 90;
      break;
  }
  return res;
};

export const handle = ({ payload }) => {
  const scrobblingEvents = ['media.scrobble'];
  // const scrobblingEvents = ['media.play', 'media.pause', 'media.resume', 'media.stop', 'media.scrobble'];
  const ratingEvents = ['media.rate']
  const { type } = payload.Metadata;
  if (![...scrobblingEvents, ...ratingEvents].includes(payload.event)) {
    logger.debug(`❌ ${chalk.red(`Event ${payload.event} is not supported`)}`);
    // logger.debug(JSON.stringify(payload, null, 2));
    return
  }

  logger.debug(JSON.stringify(payload, null, 2));

  if (scrobblingEvents.includes(payload.event)) {
    if (['show', 'season', 'episode'].includes(type)) {
      try {
        handlePlayingShow({ payload });
      } catch (error) {
        throw new Error(`${error.message}`);
      }
    } else if (['movie'].includes(type)) {
      try {
        handlePlayingMovie({ payload });
      } catch (error) {
        logger.error(`❌ ${chalk.red(`${error.message}`)}`);
      }
    }
  }
  if (ratingEvents.includes(payload.event)) {
    if (['show', 'season', 'episode'].includes(type)) {
      switch (type) {
        case 'show':
          handleRatingShow({ payload })
          break;
        case 'season':
          handleRatingSeason({ payload })
          break;
        case 'episode':
          handleRatingEpisode({ payload })
          break;
        default:
          throw new Error(`Type ${payload.Metadata.type} is not supported`);
          break;
      }
    } else if (['movie'].includes(type)) {
      handleRatingMovie({ payload });
    }
  }
}

export const handlePlayingMovie = async ({ payload }) => {
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
  scrobbleRequest({ action, body, title });
};

export const handlePlayingShow = async ({ payload }) => {
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
  scrobbleRequest({ action, body, title });
};

export const handleRatingShow = async ({ payload }) => {
  const { rating } = payload;
  const show = await findShowRequest(payload);

  if (!show) {
    logger.error(`❌ ${chalk.red(`Couldn't find show info`)}`);
    return;
  }
  const body = {
    "shows": [
      {
        ...show,
        "rating": rating,
      }
    ]
  };

  logger.info(JSON.stringify(body, null, 2))
  const title = `📺 ${payload.Metadata.title}`;
  rateRequest({ body, title, rating });
};


export const handleRatingSeason = async ({ payload }) => {
  const { rating } = payload;
  const show = await findSeasonRequest(payload);

  if (!show) {
    logger.error(`❌ ${chalk.red(`Couldn't find season info`)}`);
    return;
  }
  const body = {
    "shows": [
      {
        ...show,
        "seasons": [
          {
            "rating": rating,
            "number": payload.Metadata.index
          }
        ]
      }
    ]
  };
  const title = `📺 ${payload.Metadata.title}`;
  rateRequest({ body, title, rating });
};


export const handleRatingEpisode = async ({ payload }) => {
  const { rating } = payload;
  const episode = await findEpisodeRequest(payload);

  if (!episode) {
    logger.error(`❌ ${chalk.red(`Couldn't find episode info`)}`);
    return;
  }
  const body = {
    "episodes": [
      {
        ...episode,
        "rating": rating,
      }
    ]
  };
  const title = `📺 ${payload.Metadata.title}`;
  rateRequest({ body, title, rating });
};



export const handleRatingMovie = async ({ payload }) => {
  const { rating } = payload;
  const movie = await findMovieRequest(payload);

  if (!movie) {
    logger.error(`❌ ${chalk.red(`Couldn't find movie info`)}`);
    return;
  }
  const body = {
    "movies": [
      {
        ...movie,
        "rating": rating,
      }
    ]
  };
  const title = `📺 ${payload.Metadata.title}`;
  rateRequest({ body, title, rating });
};

export const GetGuids = ({ payload }) => {
  const Guid = payload?.Metadata?.Guid;

  if (!Guid) {
    logger.error(`❌ ${chalk.red(`Couldn't find Guid`)}`);
    return;
  }

  const guids = Guid.map(guid => {
    const service = guid?.id?.substring(0, 4);
    const id = guid?.id?.substring(7);
    return { service, id };
  });

  logger.debug(`services and ids: ${JSON.stringify(guids)}`);

  return guids;
}