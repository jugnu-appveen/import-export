const fs = require('fs');
const path = require('path');
const mcrud = require('mcrud');
const XLSX = require('xlsx');
const j2cParser = require('json2csv').Parser;

const crudMethods = mcrud.getCRUDMethods({
    url: 'mongodb://localhost:27017',
    database: 'test',
    collection: 'import.export',
    idPattern: 'DATA##########'
});

const arrayGroup = {};

crudMethods.get({
    count: 10000
}).then(records => {
    records.forEach(e => {
        delete e._id;
    });
    const splitCount = 200;
    const segmentLength = Math.floor(records.length / splitCount);
    const promiseArr = [];
    let promise;
    if (records.length > splitCount) {
        for (let i = 0; i < splitCount; i++) {
            if (i === splitCount - 1) {
                promiseArr.push(records.map(e => flatten(e, true)));
            } else {
                promiseArr.push(records.splice(i, segmentLength).map(e => flatten(e, true)));
            }
        }
        promise = Promise.all(promiseArr)
    } else {
        promise = e.convertToJSON(records);
    }
    promise.then(data => {
        if (Array.isArray(data[0])) {
            data = Array.prototype.concat.apply([], data);
        }
        createExcel('main', JSON.parse(JSON.stringify(data)));
        // createCSV('main', JSON.parse(JSON.stringify(data)));
    }).catch(err => {
        console.log(err);
    })
    // records = records.map(e => flatten(e, true));
    // records.forEach((row, i) => {
    //     checkForArray(row, i);
    // });
    // createCSV('main', records);
}).catch(err => {
    console.log(err);
});

function flatten(obj, deep, parent) {
    let temp = {};
    Object.keys(obj).forEach(function (key) {
        const thisKey = parent ? parent + '.' + key : key;
        if (typeof obj[key] === 'object') {
            if (Array.isArray(obj[key])) {
                if (deep) {
                    obj[key].forEach((item, i) => {
                        if (typeof item === 'object') {
                            Object.assign(temp, flatten(item, deep, thisKey + '.' + i))
                        } else {
                            temp[thisKey + '.' + i] = item;
                        }
                    });
                } else {
                    temp[thisKey] = obj[key];
                }
            } else {
                temp = Object.assign(temp, flatten(obj[key], deep, thisKey));
            }
        }
        else {
            temp[thisKey] = obj[key];
        }
    });
    return temp;
};


function createCSV(filename, data) {
    const parser = new j2cParser();
    fs.writeFileSync(path.join(__dirname, 'export', filename + '.csv'), parser.parse(data), 'utf8');
}

function createExcel(filename, data) {
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
    workbook.Props.Title = filename;
    const sheet = XLSX.utils.json_to_sheet(data, {
        header: headers
    });
    XLSX.utils.book_append_sheet(workbook, sheet, 'sheet1');

    XLSX.writeFile(workbook, path.join(__dirname, 'export', filename + '.xls'));
    fs.writeFileSync(path.join(__dirname, 'export', filename + '.csv'), XLSX.utils.sheet_to_csv(sheet), 'utf8');
}

function getHeaders(data) {
    let headers = [];
    data.forEach(row => {
        if (Object.keys(row).length > headers.length) {
            headers = Object.keys(row);
        }
    });
    return headers;
}

function checkForArray(record, index) {
    Object.keys(record).forEach(key => {
        if (Array.isArray(record[key])) {
            if (record[key].length > 0) {
                if (!arrayGroup[key]) {
                    arrayGroup[key] = [];
                }
                arrayGroup[key] = Array.prototype.concat.apply(arrayGroup[key], record[key].map(item => {
                    if (typeof item === 'object') {
                        return Object.assign({ _refId: index }, item);
                    } else {
                        const t = {};
                        t._refId = index;
                        t._value = item;
                        return t;
                    }
                }));
                record[key] = '$ODP_' + key + '_' + index;
            } else {
                record[key] = null;
            }
        }
    });
}