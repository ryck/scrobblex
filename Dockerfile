FROM node:alpine as base

# File Author / Maintainer
LABEL authors="Ricardo Gonzalez <ryck@ryck.me>"

ENV NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ENV PORT 3090

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# VOLUME /usr/src/app/data

EXPOSE 3090

CMD ["node",  "src/index.js"]
