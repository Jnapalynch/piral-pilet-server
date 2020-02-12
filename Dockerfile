FROM node:10.19.0-alpine3.9

WORKDIR piral-server
COPY . .
RUN npm i
EXPOSE 8080
CMD ["node", "src/index.js"]