const express = require('express');
const {getDataFromDynamo, getFileToS3} = require('../utils/utils');
const {lookup} = require('mime-types');
const router = express.Router();

router.get('/', async (request, response) => {
    const resultData = {};
    resultData['items'] = await getDataFromDynamo();
    response.status(200).json(resultData)
});

router.get('/:piletFolder/:microFolder/:versionMicro/:fileMicro', async (request, response) => {
    const piletFolder = request.params['piletFolder'];
    const microFolder = request.params['microFolder'];
    const versionMicro = request.params['versionMicro'];
    const fileMicro = request.params['fileMicro'];

    const pathToGet = `${piletFolder}/${microFolder}/${versionMicro}/${fileMicro}`;

    getFileToS3(pathToGet).then((fileObject) => {
        response.header("Content-Type", `${lookup(fileMicro) || 'application/octet-stream'}`);
        response.status(200).send(fileObject.Body);
    }).catch((error) => {
        console.log('error trying to get file', error);
        response.header("Content-Type", "text/plain");
        response.status(404).send('error trying to get file');
    });
});

module.exports = router;