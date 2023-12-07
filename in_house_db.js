const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/db.json');

exports.get = function (key) {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    return db[key] || {};
}

exports.set = function (key, value) {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db[key] = value;
    fs.writeFileSync(DB_PATH, JSON.stringify(db));
}