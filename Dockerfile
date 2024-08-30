FROM node:lts
WORKDIR /usr/src/app
COPY node_modules node_modules
COPY request-outbox.js request-outbox.mjs
EXPOSE 3000
CMD ["node", "request-outbox.mjs"]
