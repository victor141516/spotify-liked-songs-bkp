# TODO: make the image more complex: build backend and frontend on separate steps, then copy the build files to the final image
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json /app/
COPY . /app
RUN npm ci && cd /app/src/server/frontend && npm ci && npm run build
ENTRYPOINT ["npm", "start"]
