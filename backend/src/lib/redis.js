const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // requis par BullMQ
  enableReadyCheck: false,
  tls: {}, // force explicitement TLS, requis par Upstash même avec rediss://
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
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