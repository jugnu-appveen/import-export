const faker = require('faker');
const mcrud = require('mcrud');

const crudMethods = mcrud.getCRUDMethods({
    url: 'mongodb://localhost:27017',
    database: 'test',
    collection: 'import.export',
    idPattern:'DATA##########'
});

function getFakeValue(key, value) {
    if (typeof value == 'string') {
        if (key.match(/^.*(phone|contact|mobile|cell).*$/i)) {
            if (value) {
                return faker.phone.phoneNumber((value + '').replace(/[0-9]/g, '#'));
            } else {
                return faker.phone.phoneNumber('##########');
            }
        } else if (key.match(/^.*(date).*$/i)) {
            return faker.date.past().toISOString();
        } else if (key.toLowerCase() == 'internet') {
            return faker.internet.userName();
        } else if (key.toLowerCase() == 'email' || key.toLowerCase() == 'username') {
            return faker.internet.email();
        } else if (key.toLowerCase() == 'password') {
            return faker.internet.password();
        } else if (key.toLowerCase() == 'gender') {
            const genderFull = ['Male', 'Female', 'Others'];
            const genderShort = ['M', 'F', 'O'];
            const index = Math.floor(Math.random() * 1000) % 3;
            if (value && value.length > 1) {
                return genderFull[index];
            } else {
                return genderShort[index];
            }
        } else if (key.match(/^.*(company|organization).*$/i)) {
            return faker.company.companyName();
        } else if (key.match(/^.*(pincode|zipcode).*$/i)) {
            if (value) {
                return faker.address.zipCode((value + '').replace(/[0-9]/g, '#'));
            } else {
                return faker.address.zipCode('######');
            }
        } else if (key.match(/^.*(city).*$/i)) {
            return faker.address.city();
        } else if (key.match(/^.*(state).*$/i)) {
            return faker.address.state();
        } else if (key.match(/^.*(country).*$/i)) {
            return faker.address.country();
        } else if (key.match(/^.*name$/i)) {
            if (key.match(/^.*first$/i)) {
                return faker.name.firstName();
            } else if (key.match(/^.*last$/i)) {
                return faker.name.lastName();
            } else {
                return faker.name.findName();
            }
        } else {
            return faker.fake("{{random.words}}");
        }
    }
    if (typeof value == 'number') {
        if (key.match(/^.*(phone|contact|mobile|cell).*$/i)) {
            if (value) {
                return +faker.phone.phoneNumber((value + '').replace(/[0-9]/g, '#'));
            } else {
                return +faker.phone.phoneNumber('##########');
            }
        } else if (key.match(/^.*(pincode|zipcode).*$/i)) {
            if (value) {
                return +faker.address.zipCode((value + '').replace(/[0-9]/g, '#'));
            } else {
                return +faker.address.zipCode('######');
            }
        } else {
            if (value) {
                return +faker.phone.phoneNumber((value + '').replace(/[0-9]/g, '#'));
            } else {
                return +faker.random.number();
            }
        }
    }
    if (typeof value == 'boolean') {
        return faker.random.boolean();
    }
}

const json = {
    "name": "ferro",
    "email": "ul",
    "password": "gotfe",
    "contactNo": 9040219967,
    "alternateNos": [
        9040219967
    ],
    "tempAddress": {
        "stOne": "kebgoble",
        "stTwo": "tuemi",
        "city": "de",
        "state": "ato",
        "pincode": 560100
    },
    "prevAddress": [
        {
            "stOne": "ellozmoc",
            "stTwo": "ta",
            "city": "wiw",
            "state": "dasin",
            "pincode": 560100
        }
    ],
    "gender": "gar",
    "dateOfBirth": "19/11/2038",
    "status": false,
    "smsTemplate": "wop",
    "emailTemplate": "serav",
    "vehicles": {
        "twoWheelers": [
            {
                "make": "jo",
                "model": "sazopuha",
                "color": "gaagobu",
                "regNo": "ferlofo"
            }
        ],
        "fourWheelers": [
            {
                "make": "givithi",
                "model": "azenig",
                "color": "ne",
                "regNo": "la"
            }
        ]
    }
};


function parseJSON(json) {
    const valObj = {};
    Object.keys(json).forEach(key => {
        if (typeof json[key] === 'object') {
            if (Array.isArray(json[key])) {
                const len = Math.floor(Math.random() * 10000) % 5;
                const tempArr = [];
                for (var i = 0; i < len; i++) {
                    if (typeof json[key][0] === 'object') {
                        tempArr.push(parseJSON(json[key][0]));
                    } else {
                        tempArr.push(getFakeValue(key, json[key][0]));
                    }
                }
                valObj[key] = JSON.parse(JSON.stringify(tempArr));
            } else {
                valObj[key] = parseJSON(json[key]);
            }
        } else {
            valObj[key] = getFakeValue(key, json[key]);
        }
    });
    return valObj;
}

const dataArr = [];
for (let i = 0; i < 10000; i++) {
    dataArr.push(parseJSON(json));
}

crudMethods.post(dataArr).then(doc => {
    console.log(doc);
}).catch(err => {
    console.log(err);
});