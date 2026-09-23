FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --ignore-scripts \
  && npm rebuild --ignore-scripts \
  && npm rebuild sharp --foreground-scripts || \
     npm install --no-save --foreground-scripts sharp

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
