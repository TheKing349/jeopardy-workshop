FROM node:14
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production --silent
COPY . .
EXPOSE 80
EXPOSE 443
RUN chown -R node /usr/src/app
CMD ["npm", "start"]
