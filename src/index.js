const express = require('express');
const busboy = require('connect-busboy');
const path = require('path');
const cors = require('cors');
const publish_router = require('./publish/publish-pilet');
const pilet_router = require('./pilets/get-pilets');

global.appRoot = path.resolve('./');

require('dotenv').config();

const app = express();

app.use(
    busboy({
        highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
        limits: {
            fileSize: 32 * 1024 * 1024, // Set 32MiB limit
        },
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

app.use('/media', express.static('upload'));
app.use('', pilet_router);
app.use('', publish_router);

const host = `${process.env.APP_HOST}`;
const port = `${process.env.APP_PORT}`;

app.listen(port, host, () => {
    console.log(`el servidor ha iniciado en http://${host}:${port}`);
});