const express = require('express');
const {getDataFromDynamo} = require('../utils/utils');
const router = express.Router();

router.get('/', async (request, response) => {
    const resultData = {};
    resultData['items'] = await getDataFromDynamo();
    response.status(200).json(resultData)
});

module.exports = router;