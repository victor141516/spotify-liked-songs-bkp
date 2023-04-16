FROM node:18-alpine as deps-installer
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install --omit=dev

FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm i
COPY . /app
RUN npm run build:nocheck && npm run remove-type-module

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist /app/package.json /app/package-lock.json /app/
COPY --from=deps-installer /app/node_modules /app/node_modules
ENTRYPOINT ["node", "index.js"]
