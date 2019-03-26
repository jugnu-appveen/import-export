const fs = require('fs');
const path = require('path');
const mcrud = require('mcrud');
const XLSX = require('xlsx');
const deepmerge = require('deepmerge');

const crudMethods = mcrud.getCRUDMethods({
    url: 'mongodb://localhost:27017',
    database: 'test',
    collection: 'import.export',
    idPattern: 'DATA##########'
});

const workbook = XLSX.readFile(path.join(__dirname, 'export', 'main.xls'));
const sheetName = Object.keys(workbook.Sheets)[0];
if (workbook.Custprops) {
    console.log(workbook.Custprops);
}
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
const unFlattenData = data.map(e => unFlattenArray(e)).map(e => unFlatten(e));
console.log(JSON.stringify(unFlattenData, null, 4));

function unFlatten(obj, delimeter) {
    if (!obj || Object.keys(obj).length === 0) {
        return null;
    }
    if (!delimeter) {
        delimeter = '.';
    }
    var temp = {};
    Object.keys(obj).forEach(_key => {
        let keys = _key.split(delimeter);
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
};

function unFlattenArray(obj, delimeter) {
    if (!obj || Object.keys(obj).length === 0) {
        return null;
    }
    if (!delimeter) {
        delimeter = '.';
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
};