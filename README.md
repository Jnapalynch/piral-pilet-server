# piral-pilet-server
Server created with NodeJs to manage the Pilet's created with Piral Framework (https://docs.piral.io/)

Depedencies

- npm install -g piral-cli

To Run Server:

- create .env file with the following data

  - AWS_ACCESS_KEY_ID= // key to access aws s3 service
  - AWS_SECRET_ACCESS_KEY= // key to access aws s3 service
  - AWS_S3_BASE_URL= // s3 bucket url
  - AWS_S3_PILET_FOLDER= // s3 folder into bucket
  - APP_HOST= // host to start nodejs server
  - APP_PORT= // port to expose nodejs server
  - DOMAIN_APP= // application domain or ip

- npm install
- npm run start

To push your pilets to the server

- Go to your pilet project
- execute pilet --fresh --url http://localhost:9000

To get yout pilet records

- enter to http://localhost:9000/

After publish your pilet on the server you must to change you feedUrl in your Piral Shell Project (https://github.com/Jnapalynch/piral-shell)
