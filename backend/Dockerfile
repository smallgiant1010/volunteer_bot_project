FROM node:22-alpine AS build

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/Main.js"]

