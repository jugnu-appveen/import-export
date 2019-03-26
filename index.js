const XLSX = require('xlsx');
const deepmerge = require('deepmerge');


const e = {};

/**
 * @function readData
 * @param {Object} stream data stream from file
 * @returns {Promise}
 */
e.readData = function (stream) {
    return new Promise((resolve, reject) => {
        try {
            if (!stream) {
                throw new Error('Data stream is required');
            }
            const workbook = XLSX.read(stream);
            resolve(workbook.SheetNames);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @function readFile
 * @param {string} filePath file location
 * @returns {Promise}
 */
e.readFile = function (filePath) {
    return new Promise((resolve, reject) => {
        try {
            if (!filePath || !filePath.trim()) {
                throw new Error('File path is required');
            }
            const workbook = XLSX.readFile(filePath);
            resolve(workbook.SheetNames);
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @function readSheet
 * @param {string} sheetName name of selected sheet
 * @param {Object} stream data stream from file or file path
 * @returns {Promise}
 */
e.readSheet = function (sheetName, stream) {
    return new Promise((resolve, reject) => {
        try {
            if (!sheetName || !sheetName.trim()) {
                throw new Error('Sheet name is required');
            }
            if (!stream) {
                throw new Error('Data stream is required');
            }
            let workbook;
            if (typeof stream == 'object') {
                workbook = XLSX.read(stream);
            } else {
                workbook = XLSX.readFile(stream);
            }
            const records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            const splitCount = 200;
            const segmentLength = Math.floor(records.length / splitCount);
            const promiseArr = [];
            if (records.length > splitCount) {
                for (let i = 0; i < splitCount; i++) {
                    if (i === splitCount - 1) {
                        promiseArr.push(records.map(e => unFlattenArray(e)).map(e => unFlattenObject(e)));
                    } else {
                        promiseArr.push(records.splice(i, segmentLength).map(e => unFlattenArray(e)).map(e => unFlattenObject(e)));
                    }
                }
            } else {
                promiseArr.push(records.map(e => unFlattenArray(e)).map(e => unFlattenObject(e)));
            }
            Promise.all(promiseArr).then(data => {
                if (Array.isArray(data[0])) {
                    data = Array.prototype.concat.apply([], data);
                }
                resolve(data);
            }).catch(err=>{
                reject(err);
            });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * @function getExcelStream
 * @param {Object[]} records records to be exported in JSON
 * @param {Object} [options] options for export
 * @param {string} [options.type="buffer"] Output data encoding => 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string'
 * @param {string} [options.bookType="xls"] File format of generated workbook
 * @returns {Promise}
 */
e.getExcelStream = function (records, options) {
    return new Promise((resolve, reject) => {
        try {
            if (!options) {
                options = {};
            }
            if (!options.type) {
                options.type = 'buffer';
            }
            if (!options.bookType) {
                options.bookType = 'xls';
            }
            const splitCount = 200;
            const segmentLength = Math.floor(records.length / splitCount);
            const promiseArr = [];
            if (records.length > splitCount) {
                for (let i = 0; i < splitCount; i++) {
                    if (i === splitCount - 1) {
                        promiseArr.push(records.map(e => flatten(e, true)));
                    } else {
                        promiseArr.push(records.splice(i, segmentLength).map(e => flatten(e, true)));
                    }
                }
            } else {
                promiseArr.push(records.map(e => flatten(e, true)));
            }
            Promise.all(promiseArr).then(data => {
                if (Array.isArray(data[0])) {
                    data = Array.prototype.concat.apply([], data);
                }
                const headers = getHeaders(data);
                const workbook = XLSX.utils.book_new();
                if (!workbook.Custprops) {
                    workbook.Custprops = {};
                }
                if (!workbook.Props) {
                    workbook.Props = {};
                }
                workbook.Custprops.createdBy = 'ODP';
                workbook.Props.Application = 'ODP-Appcenter';
                workbook.Props.Author = 'Jugnu Agrawal';
                workbook.Props.Company = 'appveen';
                const sheet = XLSX.utils.json_to_sheet(data, {
                    header: headers
                });
                XLSX.utils.book_append_sheet(workbook, sheet, 'sheet1');
                const stream = XLSX.write(workbook, {
                    bookType: options.bookType,
                    type: options.type
                });
                resolve(stream);
            }).catch(err => {
                reject(err);
            })
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = e;

/**
 * @function getHeaders
 * @param {Object[]} data records
 * @returns {string[]}
 */
function getHeaders(data) {
    let headers = [];
    data.forEach(row => {
        if (Object.keys(row).length > headers.length) {
            headers = Object.keys(row);
        }
    });
    return headers;
}

/**
 * @function flatten
 * @param {object} obj object to unflatten
 * @param {boolean} [deep] flatten array also
 * @param {string} [delimiter] delimiter for key
 * @param {string} [parent] delimiter for key
 * @returns {Object}
 */
function flatten(obj, deep, delimiter, parent) {
    try {
        if (!obj || Object.keys(obj).length === 0) {
            return null;
        }
        if (!delimiter) {
            delimiter = '.';
        }
        let temp = {};
        Object.keys(obj).forEach(function (key) {
            const thisKey = parent ? parent + delimiter + key : key;
            if (typeof obj[key] === 'object') {
                if (Array.isArray(obj[key])) {
                    if (deep) {
                        obj[key].forEach((item, i) => {
                            if (typeof item === 'object') {
                                Object.assign(temp, flatten(item, deep, delimiter, thisKey + delimiter + i))
                            } else {
                                temp[thisKey + delimiter + i] = item;
                            }
                        });
                    } else {
                        temp[thisKey] = obj[key];
                    }
                } else {
                    temp = Object.assign(temp, flatten(obj[key], deep, delimiter, thisKey));
                }
            }
            else {
                temp[thisKey] = obj[key];
            }
        });
        return temp;
    } catch (e) {
        console.error(e);
        return null;
    }
};

/**
 * @function unFlattenObject
 * @param {object} obj object to unflatten
 * @param {string} [delimiter] delimiter for key
 * @returns {Object}
 */
function unFlattenObject(obj, delimiter) {
    try {
        if (!obj || Object.keys(obj).length === 0) {
            return null;
        }
        if (!delimiter) {
            delimiter = '.';
        }
        var temp = {};
        Object.keys(obj).forEach(_key => {
            let keys = _key.split(delimiter);
            if (keys.length > 1) {
                keys.reverse();
                let tempObj = keys.reduce((p, c) => {
                    return Object.defineProperty({}, c, {
                        value: p,
                        enumerable: true,
                        configurable: true,
                        writable: true
                    });
                }, obj[_key]);
                temp = deepmerge(temp, tempObj);
            } else {
                temp[_key] = obj[_key];
            }
        });
        return temp;
    } catch (e) {
        console.error(e);
        return null;
    }
};

/**
 * @function unFlattenArray
 * @param {object} obj object containing arrays to unflatten
 * @param {string} [delimiter] delimiter for key
 * @returns {Object}
 */
function unFlattenArray(obj, delimiter) {
    try {
        if (!obj || Object.keys(obj).length === 0) {
            return null;
        }
        if (!delimiter) {
            delimiter = '.';
        }
        var temp = {};
        Object.keys(obj).forEach(_key => {
            let segments = _key.match(/(.*)(\.[0-9]+\.*)(.*)/);
            if (segments) {
                const firstKey = segments[1];
                const secondKey = segments[3];
                const currIndex = segments[2].replace(/^\./, '').replace(/\.$/, '');
                if (!temp[firstKey]) {
                    temp[firstKey] = [];
                }
                const partKeys = secondKey.split('.').reverse();
                let tempObj = partKeys.reduce((p, c) => {
                    if (!c) {
                        return p;
                    }
                    return Object.defineProperty({}, c, {
                        value: p,
                        enumerable: true,
                        configurable: true,
                        writable: true
                    });
                }, obj[_key]);
                if (typeof tempObj == 'object') {
                    temp[firstKey][currIndex] = deepmerge(temp[firstKey][currIndex], tempObj);
                } else {
                    temp[firstKey][currIndex] = tempObj;
                }
            } else {
                temp[_key] = obj[_key];
            }
        });
        return temp;
    } catch (e) {
        console.error(e);
        return null;
    }
};