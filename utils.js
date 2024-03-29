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
 * @param {boolean} nomerge Flag to not merge
 * @returns {Promise}
 */
e.readSheet = (filePath, sheetName, nomerge) => {
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
                promise = e.convertToJSON(formulae);
            }
            promise.then(data => {
                if (Array.isArray(data[0])) {
                    data = Array.prototype.concat.apply([], data);
                }
                let fileName = filePath.split('/')[filePath.split('/').length - 1];
                fileName = fileName.replace(/.csv$/, '');
                e.prepareForMerge(fileName, data, nomerge).then(group => {
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
                    value: keyVal[1].indexOf('\'') === 0 ? keyVal[1].substr(1, keyVal[1].length) : keyVal[1],
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
            let dataMap = {};
            let records = [];
            const fileList = fs.readdirSync(folderPath);
            fileList.forEach(file => {
                if (file === 'main.json') {
                    records = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
                } else {
                    dataMap = Object.assign(dataMap, JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8')));
                }
            });
            const header = JSON.parse(JSON.stringify(records[0]));
            const splitCount = 200;
            const segmentLength = Math.floor(records.length / splitCount);
            const promiseArr = [];
            let promise;
            if (records.length > splitCount) {
                for (let i = 0; i < splitCount; i++) {
                    if (i === splitCount - 1) {
                        promiseArr.push(findAndReplace(header, records, dataMap));
                    } else {
                        promiseArr.push(findAndReplace(header, records.splice(i, segmentLength), dataMap));
                    }
                }
                promise = Promise.all(promiseArr)
            } else {
                promise = findAndReplace(header, records, dataMap);
            }
            promise.then(data => {
                if (Array.isArray(data[0])) {
                    data = Array.prototype.concat.apply([], data);
                }
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @param {string} fileName name of file as key
 * @param {object[]} data data array
 * @param {boolean} nomerge flag to not merge
 * @returns {Promise} Promise of JSON objects grouped by refId
 */
e.prepareForMerge = (fileName, data, nomerge) => {
    return new Promise((resolve, reject) => {
        if (nomerge) {
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
            const newFileName = filePath.replace(/.csv$/, '');
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
 * @param {string} key key of object
 * @param {object} obj data object
 * @param {string} [delimeter] delimiter for key
 * @returns {any} value from object
 */
e.getValue = function (key, obj, delimeter) {
    if (!obj || Object.keys(obj).length === 0) {
        return null;
    }
    if (!delimeter) {
        delimeter = '.';
    }
    let keys = key;
    if (!Array.isArray(key)) {
        if (obj[key]) {
            return obj[key];
        }
        keys = key.split(delimeter);
    }
    return keys.reduce(function (p, c) {
        return p ? p[c] : null;
    }, obj);
};

/**
 * @param {Object} header Header object
 * @param {Object} row row object
 * @param {Object} [mapping] mapping object
 * @returns {Object} Object with keys and values
 */
function createObject(header, row, mapping) {
    const obj = {};
    Object.keys(header).forEach(key => {
        if (header[key] !== '_refId') {
            if(mapping && mapping[header[key]]){
                obj[header[key]] = row[key];
            } else{
                obj[header[key]] = row[key];
            }
        }
    });
    return obj;
}

/**
 * @param {Object} header
 * @param {Object[]} records
 * @param {Object} dataMap
 * @returns {Promise}
 */
function findAndReplace(header, records, dataMap) {
    return new Promise((resolve, reject) => {
        try {
            const obj = {};
            records.forEach((row) => {
                Object.keys(row).forEach(key => {
                    if (row[key].startsWith('$ODP_')) {
                        const path = row[key].replace('$ODP_', '');
                        row[key] = e.getValue(path, dataMap, '_');
                    }
                    row[header[key]] = row[key];
                    delete row[key];
                });
            });
            resolve(records);
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = e;