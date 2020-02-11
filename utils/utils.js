const {createGunzip} = require('zlib');
const tar = require('tar');
const fs = require('fs');
const path = require('path');

function savePileFiles(files) {
    return new Promise(async(resolve, reject) => {
        const packageData = await getPackageJsonData(files);
        const piletName = packageData.name;
        const piletVersion = packageData.version;

        Object.keys(files).forEach((key) => {
            const fileContent = files[key];
            const origFilePath = path.parse(key);
            const saveTo = path.join(appRoot, '/upload/', piletName, piletVersion, origFilePath.base);
            const newFilePath = path.parse(saveTo);

            fs.mkdirSync(newFilePath.dir, {recursive: true});
            fs.createWriteStream(saveTo).write(fileContent, 'utf8');
        });

        resolve(true);
    })
}

function getPackageJsonData(files) {
    return new Promise((resolve, reject) => {
        const packageJsonFileName = Object.keys(files).find((key) => {
            return key.includes('package.json');
        });

        if (packageJsonFileName) {
            resolve(JSON.parse(files[packageJsonFileName].toString('utf8')));
        } else {
            reject('package.json not found');
        }
    });
}

function getFilesFromZip(fileStream) {
    return new Promise((resolve, reject) => {
        const files = {};

        fileStream
            .on('error', reject)
            .pipe(createGunzip())
            .on('error', reject)
            .pipe(new tar.Parse())
            .on('error', reject)
            .on('entry', (entry) => {
                const content = [];
                const p = entry.path;

                entry.on('data', (buffer) => {
                    content.push(buffer)
                });

                entry.on('end', () => {
                    files[p] = Buffer.concat(content)
                });
            })
            .on('end', () => resolve(files));
    })
}

module.exports = {
    getFilesFromZip: getFilesFromZip,
    getPackageJsonData: getPackageJsonData,
    savePileFiles: savePileFiles
};