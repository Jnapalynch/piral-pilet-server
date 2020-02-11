const express = require('express');
const router = express.Router();
const {savePiletFiles, getFilesFromStreamZip} = require('../utils/utils');

router.post('/publish', (request, response) => {
    const bb = request.busboy;

    if (bb) {
        request.pipe(bb);

        bb.on('file', async (fieldName, file) => {
            const listOnMemoryFiles = await getFilesFromStreamZip(file).catch((error) => {
                console.log('error unzip file', error);
                response.status(400).json({
                    success: false,
                    message: 'error unzip file',
                });
            });

            savePiletFiles(listOnMemoryFiles).then(() => {
                response.status(200).json({
                    success: true,
                });
            }).catch((error) => {
                console.log('error uploading pilet', error);
                response.status(400).json({
                    success: false,
                    message: 'error uploading pilet',
                });
            });
        });
    }
});

module.exports = router;