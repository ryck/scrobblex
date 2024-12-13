import axios from 'axios';
import { LocalStorage } from 'node-localstorage';
import { fromUnixTime, differenceInHours } from 'date-fns';
import { setupCache } from 'axios-cache-interceptor';
import chalk from 'chalk';

import { logger } from './logger.js';

const localStorage = new LocalStorage('./data');

export const authorizeRequest = async ({ code, redirect_uri, refresh_token, grant_type }) => {
    logger.info(`🔑 Getting token...`);
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
        logger.debug(JSON.stringify(tokens));
        logger.info(`🔐 Token adquired`);
        return tokens;
    } catch (err) {
        logger.error(`❌ ${chalk.red(`Auth API error: ${err.message}`)}`);
    }
};

export const getAccessToken = async () => {
    const tokens = localStorage.getItem('tokens');

    if (!tokens || tokens == 'undefined') {
        logger.error(`❌ ${chalk.red(`Error getting token.`)}`);
        logger.info(
            `ℹ️ Have you authorized the application? Go to http://localhost:${process.env.PORT} to do it if needed.`,
        );
        return
    }
    let { access_token, refresh_token, created_at } = JSON.parse(tokens);

    if (!access_token || !refresh_token) {
        logger.error(`❌ ${chalk.red(`No access / refresh token found! Please authorize the application again...`)}`);
        return
    }

    const tokenAge = differenceInHours(new Date(), new Date(fromUnixTime(created_at)));
    if (tokenAge > 1440) {
        // tokens expire after 3 months, so we refresh after 2
        logger.info(`🔐 Token expired, refreshing...`);
        const redirect_uri = `http://localhost:${process.env.PORT}/authorize`;

        const tokens = await authorizeRequest({ grant_type: 'refresh_token', redirect_uri, refresh_token });

        if (tokens) {
            const data = JSON.stringify(tokens);
            localStorage.setItem('tokens', data);
            access_token = tokens.access_token;
        } else {
            logger.error(`❌ ${chalk.red(`No tokens found!`)}`);
            logger.info(
                `ℹ️ Have you authorized the application? Go to http://localhost:${process.env.PORT} to do it if needed.`,
            );
            return
        }
    }

    return access_token
}

export const instance = axios.create({
    baseURL: 'https://api.trakt.tv',
    headers: {
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_ID,
        'trakt-api-version': '2',
    },
});

instance.interceptors.request.use(
    async (config) => {
        const token = await getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const api = setupCache(instance);