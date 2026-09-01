const { Queue } = require('bullmq');
const connection = require('../lib/redis');

const scanQueue = new Queue('scan', { connection });

module.exports = scanQueue;