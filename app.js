const path = require('path');
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const log4js = require('log4js');

const utils = require('./index');

const PORT = process.env.PORT || 3000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = log4js.getLogger('Server');
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const app = express();

logger.level = LOG_LEVEL;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser());
app.use(upload.any());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
});

app.post('/upload', (req, res) => {
    if (req.files && req.files.length > 0) {
        utils.readFile(req.files[0].path).then(workbook => {
            res.json({
                sheets: Object.keys(workbook.Sheets),
                filename: req.files[0].filename
            });
        }).catch(err => {
            logger.error(err);
            res.status(500).json({
                message: err.message
            });
        });
    } else {
        res.status(400).json({
            message: 'Invalid file'
        });
    }
});

app.put('/readsheet/:filename', (req, res) => {
    utils.readSheet(path.join(__dirname, 'uploads', req.params.filename), req.body.sheetName).then(data => {
        res.json({
            message: 'Sheet read',
            data: data
        });
    }).catch(err => {
        logger.error(err);
        res.status(500).json({
            message: err.message
        });
    });
});

app.listen(PORT, () => {
    logger.info('Server is listening at:', PORT);
});