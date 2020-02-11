const express = require('express');
const busboy = require('connect-busboy');
const fs = require('fs');
const path = require('path');
const {getFilesFromZip, savePileFiles} = require('./utils/utils');
const cors = require('cors');

global.appRoot = path.resolve(__dirname);

const app = express();

app.use('/media', express.static('upload'));

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

function getFiles(basePath) {
    return fs.readdirSync(basePath).reduce((result, file) => {
        console.log('result', result, 'file', file);
        const filePath = path.join(basePath, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath);
            return result;
        }

        result.push(filePath);
        return result;
    }, []);
}

app.get('/', (request, response) => {

    const files = getFiles(path.join(appRoot, '/upload/'));

    const resultData = {};
    resultData['items'] = [];

    files.filter((file) => String(file).includes('package.json')).forEach((file) => {
        const data = fs.readFileSync(file).toString('utf8');
        const packageJsonData = JSON.parse(data);

        const jsonData = {
            name: packageJsonData.name,
            version: packageJsonData.version,
            link: `http://127.0.0.1:9000/media/${packageJsonData.name}/${packageJsonData.version}/index.js`,
            hash: Math.random()
        };

        resultData['items'].push(jsonData);
    });

    response.status(200).json(resultData)

});

app.post('/', (request, response) => {
    const bb = request.busboy;

    if (bb) {
        request.pipe(bb);

        bb.on('file', async (fieldname, file) => {
            const files = await getFilesFromZip(file);

            savePileFiles(files).then(() => {
                response.status(200).json({
                    success: true,
                })
            }).catch((error) => {
                response.status(400).json({
                    success: false,
                    message: error,
                });
            });
        });
    }
});

app.listen(9000, () => {
    console.log(`el servidor ha iniciado en http://127.0.0.1:9000`);
});