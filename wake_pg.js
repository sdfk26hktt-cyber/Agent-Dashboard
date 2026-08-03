const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_a5JrOZD3sUBo@ep-lively-queen-aqhl5a46.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
  connectionTimeoutMillis: 30000, // 30 seconds
});
client.connect()
  .then(() => {
    console.log('Connected to PG directly!');
    client.query('SELECT 1').then(() => {
        client.end();
    })
  })
  .catch(err => console.error('Connection error', err.stack));
