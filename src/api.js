import axios from 'axios';
import { LocalStorage } from 'node-localstorage';
import { fromUnixTime, differenceInHours } from 'date-fns';
import { setupCache } from 'axios-cache-interceptor';

import { logger } from './logger.js';
import { authorizeRequest } from './requests.js';

const localStorage = new LocalStorage('./data');

export const getAccessToken = async () => {
    const tokens = localStorage.getItem('tokens');

    if (!tokens || tokens == 'undefined') {
        logger.error(`❌ ${chalk.red(`Error reading the file.`)}`);
        logger.info(
            `ℹ️ Have you authorized the application? Go to ${req.protocol}://${req.get('host')} to do it if needed.`,
        );
        return res.status(401);
    }
    let { access_token, refresh_token, created_at } = JSON.parse(tokens);

    if (!access_token || !refresh_token) {
        throw new Error('No access / refresh token found! Please authorize the application again...');
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

    return access_token
}

export const instance = axios.create({
    baseURL: 'https://api.trakt.tv',
    headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
        'trakt-api-key': process.env.TRAKT_ID,
        'trakt-api-version': '2',
    },
});


export const api = setupCache(instance);