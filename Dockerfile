FROM node:14

WORKDIR /sendpost-api

COPY . ./

RUN npm install

CMD npm run start
