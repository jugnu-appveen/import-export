const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const extractZip = require('extract-zip');
const uniqueToken = require('unique-token');

const e = {};

/**
 * @param {string} filePath Location of the file to read
 * @returns {Promise<XLSX.workbook>}
 */
e.readFile = (filePath) => {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(filePath);
            resolve(workbook);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {string} filePath Location of the file to read
 * @param {string} sheetName Name of the sheet to select
 * @returns {Promise}
 */
e.readSheet = (filePath, sheetName) => {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const formulae = XLSX.utils.sheet_to_formulae(workbook.Sheets[sheetName]);
            const splitCount = 200;
            const segmentLength = Math.floor(formulae.length / splitCount);
            const promiseArr = [];
            let promise;
            if (formulae.length > splitCount) {
                for (let i = 0; i < splitCount; i++) {
                    if (i === splitCount - 1) {
                        promiseArr.push(e.convertToJSON(formulae));
                    } else {
                        promiseArr.push(e.convertToJSON(formulae.splice(i, segmentLength)));
                    }
                }
                promise = Promise.all(promiseArr)
            } else {
                e.convertToJSON(formulae);
            }
            promise.then(data => {
                if (Array.isArray(data[0])) {
                    data = Array.prototype.concat.apply([], data);
                }
                let fileName = filePath.split('/')[filePath.split('/').length - 1];
                fileName = fileName.replace(/.csv$/,'');
                e.prepareForMerge(fileName, data).then(group => {
                    e.saveJson(filePath, group).then(status => {
                        resolve(group);
                    }).catch(err => {
                        reject(err);
                    });
                }).catch(err => {

                });
            }).catch(err => {
                reject(err);
            });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {string} zipPath Location of the file to read
 * @returns {Promise}
 */
e.unZip = (zipPath) => {
    return new Promise((resolve, reject) => {
        try {
            const unzipPath = path.join(zipPath, '../', uniqueToken.token());
            extractZip(zipPath, {
                dir: unzipPath
            }, (err => {
                if (err) throw err;
                resolve(unzipPath);
            }));
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {string[]} formulae formulae array
 * @returns {Promise} Promise of array containing JSON objects as each record
 */
e.convertToJSON = (formulae) => {
    return new Promise((resolve, reject) => {
        try {
            const uniqueColumns = JSON.parse(JSON.stringify(formulae)).map(e => {
                const keyVal = e.split(/^([A-Z0-9]+)=/).filter(e => e);
                return keyVal[0].replace(/[0-9]+/, '');
            }).filter((e, i, a) => a.indexOf(e) === i);
            let tempArr = [];
            let tempObj = {};
            const data = [];
            formulae.map((e, i) => {
                const keyVal = e.split(/^([A-Z0-9]+)=/).filter(e => e);
                if (i % uniqueColumns.length == 0) {
                    if (tempArr && tempArr.length > 0) {
                        data.push(Object.assign.apply({}, JSON.parse(JSON.stringify(tempArr))));
                    }
                    tempArr = [];
                }
                tempObj = Object.defineProperty({}, keyVal[0].replace(/[0-9]+/, ''), {
                    value: keyVal[1].indexOf('\'') === 0 ?  keyVal[1].substr(1, keyVal[1].length) : keyVal[1],
                    configurable: true,
                    enumerable: true,
                    writable: true
                });
                tempArr.push(tempObj);
            });
            resolve(data);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {object[]} data data array
 * @returns {Promise} Promise of array containing JSON objects as each record
 */
e.stitchData = (folderPath) => {
    return new Promise((resolve, reject) => {
        try {
            
            resolve(data);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {string} fileName name of file as key
 * @param {object[]} data data array
 * @returns {Promise} Promise of JSON objects grouped by refId
 */
e.prepareForMerge = (fileName, data) => {
    return new Promise((resolve, reject) => {
        if (fileName === 'main') {
            resolve(data);
            return;
        }
        const group = {};
        group[fileName] = {};
        try {
            let oneColumn = false;
            const headerRow = data.find(e => e['A'] === '_refId');
            Object.keys(headerRow).forEach(key => {
                if (headerRow[key] === '_value') {
                    oneColumn = true;
                }
            });
            data.forEach(row => {
                if (row['A'] && row['A'] != '_refId') {
                    if (!group[fileName][row['A']]) {
                        group[fileName][row['A']] = [];
                    }
                    if (oneColumn) {
                        group[fileName][row['A']].push(row['B']);
                    } else {
                        group[fileName][row['A']].push(createObject(headerRow, row));
                    }
                }
            });
            resolve(group);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {string} filePath file location
 * @param {object[]} data data array
 * @returns {Promise} Promise of array containing JSON objects as each record
 */
e.saveJson = (filePath, data) => {
    return new Promise((resolve, reject) => {
        try {
            const newFileName = filePath.replace(/.csv$/,'');
            fs.writeFile(newFileName + '.json', JSON.stringify(data), 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    fs.unlinkSync(filePath);
                    resolve(true);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {Object} header Header object
 * @param {Object} row row object
 * @returns {Object} Object with keys and values
 */
function createObject(header, row) {
    const obj = {};
    Object.keys(header).forEach(key => {
        if (header[key] !== '_refId') {
            obj[header[key]] = row[key];
        }
    });
    return obj;
}

module.exports = e;