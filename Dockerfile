FROM node:6
LABEL maintainer="Thanh Phu <nvtphu+docker@gmail.com>"

WORKDIR /usr/src/app
COPY package.json .
RUN npm install

CMD ["npm", "start"]