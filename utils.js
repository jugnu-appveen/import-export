const e = {};

/**
 * @param {string[]} formulae formulae array
 * @returns {[{key:value}]} Array containing JSON objects as each record
 */

e.convertToJSON = (formulae) => {
    const uniqueColumns = formulae.map(e => {
        const keyVal = e.split(/^([A-Z0-9]+)=/).filter(e => e);
        return keyVal[0].replace(/[0-9]+/, '');
    }).filter((e, i, a) => a.indexOf(e) === i);
    let tempArr = [];
    let tempObj = {};
    const data = formulae.map((e, i) => {
        const keyVal = e.split(/^([A-Z0-9]+)=/).filter(e => e);
        if (i % uniqueColumns.length == 0) {
            if (tempArr && tempArr.length > 0) {
                return Object.assign.apply({}, JSON.parse(JSON.stringify(tempArr)));
            }
            tempArr = [];
        }
        tempObj = Object.defineProperty({}, keyVal[0].replace(/[0-9]+/, ''), {
            value: keyVal[1],
            configurable: true,
            enumerable: true,
            writable: true
        });
        tempArr.push(tempObj);
    }).filter(e => e);
    return data;
};

module.exports = e;