const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // requis par BullMQ
});

connection.on('connect', () => {
  console.log('✅ Redis: connexion établie');
});

connection.on('ready', () => {
  console.log('✅ Redis: prêt à recevoir des commandes');
});

connection.on('error', (err) => {
  console.error('❌ Redis: erreur de connexion:', err.message);
});

module.exports = connection;