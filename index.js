const XLSX = require('xlsx');

const utils = require('./utils');

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
            const data = utils.convertToJSON(formulae);
            resolve(data);
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = e;