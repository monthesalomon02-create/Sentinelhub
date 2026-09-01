const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // requis par BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 200, 2000); // reconnexion progressive
  },
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

connection.on('close', () => {
  console.log('⚠️ Redis: connexion fermée, tentative de reconnexion...');
});

module.exports = connection;