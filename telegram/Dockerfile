FROM node:19-alpine3.16

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

# # Should probably be npm ci
RUN npm i

COPY . .

CMD ["node", "worker.js"]
