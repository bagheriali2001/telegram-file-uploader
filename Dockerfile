FROM node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn install
COPY . .
ENV TZ=Asia/Tehran
CMD [ "yarn", "run", "start"]