const {createGunzip} = require('zlib');
const tar = require('tar');
const fs = require('fs');
const path = require('path');
const aws = require('aws-sdk');

function getFileToS3(pathFile) {
    const s3_bucket = new aws.S3({params: {Bucket: 'piral-demo'}});

    return s3_bucket.getObject({
        Key: pathFile
    }).promise().then((data) => {
        return data.Body.toString()
    })
}

function sendFileToS3(pathFile, bufferData) {
    const s3_bucket = new aws.S3({params: {Bucket: 'piral-demo'}});

    return s3_bucket.upload({
        Key: pathFile,
        Body: bufferData
    }).promise();
}

function uploadPilet(listOnMemoryFiles, packageJsonData) {
    return new Promise((resolve, reject) => {
        const piletName = packageJsonData.name;
        const piletVersion = packageJsonData.version;

        const resultPromiseArray = listOnMemoryFiles.map((fileObject) => {
            const pathObject = path.parse(fileObject.path);
            const saveTo = `pilets/${piletName}/${piletVersion}/${pathObject.base}`;
            const bufferData = fileObject.bufferData;

            return sendFileToS3(saveTo, bufferData).then((data) => {
                console.log(`file ${saveTo} was saved successfully`)
                return data;
            }).catch((err) => {
                console.log(`error saving file ${pathObject.base}`, err);
                return err;
            });
        });

        Promise.all(resultPromiseArray).then(() => {
            resolve(true);
        }).catch((err) => {
            reject(err.message);
        });
    });
}

async function inactivateOldPilets(packageJsonData) {
    const listIds = await findPilet(packageJsonData.name, null, true)
        .then((data) => {
            return data.Items.map((item) => item.pd);
        });

    aws.config.update({region: 'us-east-1'});
    const dynamo = new aws.DynamoDB.DocumentClient();

    const resultPromiseArr = listIds.map((id) => {
        const params = {
            Key: {
                pd: `${id}`
            },
            ExpressionAttributeValues: {
                ':active': false
            },
            UpdateExpression: 'SET active = :active',
            ReturnConsumedCapacity: "TOTAL",
            TableName: 'piral-demo'
        };

        return dynamo.update(params).promise()
    });

    return Promise.all(resultPromiseArr);
}

function sendDataToDynamo(packageJsonData) {
    aws.config.update({region: 'us-east-1'});
    const dynamo = new aws.DynamoDB.DocumentClient();

    const params = {
        Item: {
            pd:  new Date().getTime().toString(),
            name: `${packageJsonData.name}`,
            version: `${packageJsonData.version}`,
            link: `${process.env.DOMAIN_APP}/${process.env.AWS_S3_PILET_FOLDER}/${packageJsonData.name}/${packageJsonData.version}/index.js`,
            hash: new Date().getTime().toString(),
            active: true
        },
        ReturnConsumedCapacity: "TOTAL",
        TableName: 'piral-demo'
    };

    return dynamo.put(params).promise()
        .then(() => console.log(`pilet with data: ${params.toString()} was saved successfully`));
}

function findPilet(name, version = null, onlyActives = null) {
    aws.config.update({region: 'us-east-1'});
    const dynamo = new aws.DynamoDB.DocumentClient();

    const expressionAttributeNameVariable = {':name': `${name}`};
    const filterExpression = ['#name = :name'];

    if (version) {
        expressionAttributeNameVariable[':version'] = `${version}`;
        filterExpression.push('version = :version');
    }

    if (onlyActives) {
        expressionAttributeNameVariable[':active'] = true;
        filterExpression.push('active = :active');
    }

    const params = {
        TableName: 'piral-demo',
        ExpressionAttributeValues: expressionAttributeNameVariable,
        ExpressionAttributeNames: {
            '#name': 'name'
        },
        ProjectionExpression: "pd, #name",
        FilterExpression: filterExpression.join(' and ')
    };

    return dynamo.scan(params).promise();
}

function validateVersionPilet(packageJsonData) {
    return findPilet(packageJsonData.name, packageJsonData.version)
        .then((data) => {
            if (data.Items.length > 0) {
                throw 'cannot upload the same pilet\'s version ';
            }
            return true;
        });
}

function savePiletFiles(listOnMemoryFiles) {
    return new Promise(async(resolve, reject) => {
        const packageJsonData = await getPackageJsonData(listOnMemoryFiles).catch(reject);

        validateVersionPilet(packageJsonData)
            .then(() => {
                return inactivateOldPilets(packageJsonData)
            })
            .then(() => {
                return sendDataToDynamo(packageJsonData)
            })
            .then(() => {
                return uploadPilet(listOnMemoryFiles, packageJsonData)
            })
            .then(() => {
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
    })
}

function getPackageJsonData(listOnMemoryFiles) {
    return new Promise((resolve) => {
        const packageJsonFileObject = listOnMemoryFiles.find((file) => {
            return file.path.includes('package.json');
        });

        if (!packageJsonFileObject) {
            throw 'package.json not found';
        }

        resolve(JSON.parse(packageJsonFileObject.bufferData.toString('utf8')));
    });
}

function getFilesFromStreamZip(fileStream) {
    return new Promise((resolve, reject) => {
        const files = [];

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
                    files.push({
                        path: p,
                        bufferData: Buffer.concat(content)
                    });
                });
            })
            .on('end', () => resolve(files));
    })
}

function getDataFromDynamo() {
    aws.config.update({region: 'us-east-1'});

    const dynamo = new aws.DynamoDB.DocumentClient();
    const params = {
        TableName: 'piral-demo',
        ExpressionAttributeValues: {
            ':active': true
        },
        ExpressionAttributeNames: {
            '#name': 'name',
            '#hash': 'hash'
        },
        ProjectionExpression: '#name, version, link, #hash',
        FilterExpression: 'active = :active'
    };

    return dynamo.scan(params).promise().then((data) => {
        return data.Items;
    });
}

module.exports = {
    getFilesFromStreamZip: getFilesFromStreamZip,
    savePiletFiles: savePiletFiles,
    getDataFromDynamo: getDataFromDynamo,
    getFileToS3: getFileToS3
};