FROM node:lts-bullseye-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init
WORKDIR /usr/src/app
COPY package*.json /usr/src/app
RUN npm ci --omit=dev

FROM node:lts-bullseye-slim
ENV NODE_ENV production
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules node_modules
COPY --chown=node:node request-outbox*.tgz request-outbox.tgz
RUN tar -xzvf request-outbox.tgz --strip-components=1
EXPOSE 3000
CMD ["dumb-init", "node", "bin/request-outbox.js"]
