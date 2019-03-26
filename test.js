const fs = require('fs');
const path = require('path');
const mcrud = require('mcrud');

const utils = require('./index');

const crudMethods = mcrud.getCRUDMethods({
    url: 'mongodb://localhost:27017',
    database: 'test',
    collection: 'import.export',
    idPattern: 'DATA##########'
});

const stream = fs.readFileSync(path.join(__dirname, 'export/main.xls'));

utils.readData(stream).then(sheets => {
    console.log(sheets);
    utils.readSheet(sheets[0], stream).then(records => {
        console.log(JSON.stringify(records, null, 4));
    }).catch(err => {
        console.log(err);
    });
}).catch(err => {
    console.log(err);
})

// crudMethods.get({
//     count: 10000
// }).then(records => {
//     utils.getExcelStream(records).then(data => {
//         console.log(data);
//     })
// }).catch(err => {
//     console.log(err);
// });