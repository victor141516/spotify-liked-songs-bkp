FROM node:18-alpine as build-backend
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci
COPY . /app
RUN npm run build

FROM node:18-alpine as build-frontend
WORKDIR /app
COPY ./src/server/frontend/package.json ./src/server/frontend/package-lock.json /app/
RUN npm ci
COPY ./src/server/frontend /app
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build-backend /app/package.json /app/package-lock.json /app/
RUN npm ci --production
COPY --from=build-backend /app/dist /app
COPY --from=build-frontend /app/dist /app/server/frontend/dist
ENTRYPOINT ["node", "--experimental-specifier-resolution=node", "index.js"]
