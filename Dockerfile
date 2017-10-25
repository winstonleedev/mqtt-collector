FROM node:4
LABEL maintainer="Thanh Phu <docker-maintenance@kii.systems>"

WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app

CMD ["npm", "start"]
