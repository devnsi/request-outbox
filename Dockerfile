FROM node:lts
WORKDIR /usr/src/app
COPY node_modules node_modules
COPY index.js index.mjs
EXPOSE 3000
CMD ["node", "index.mjs"]