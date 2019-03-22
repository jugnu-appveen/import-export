const fs = require('fs');
const path = require('path');
const mcrud = require('mcrud');
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
    records = records.map(e => flatten(e));
    records.forEach((row, i) => {
        checkForArray(row, i);
    });
    createCSV('main', records);
    Object.keys(arrayGroup).forEach(key => {
        createCSV(key, JSON.parse(JSON.stringify(arrayGroup[key])));
    });
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