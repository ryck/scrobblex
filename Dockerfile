FROM node:alpine as base

ENV NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

VOLUME /usr/src/app/data

EXPOSE 3090

CMD ["node",  "src/index.js"]
