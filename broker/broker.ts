import * as fastify from 'fastify';
import { Pool, Client } from 'pg';

const app = fastify();

// Use environment vars for initialization
const pool = new Pool();

app.post<{ Body: { timestamp: number,  key: string, value: string } }>('/api/telegram', async (req, res) => {

  const {timestamp, key, value} = req.body;

  try {
    const client = await pool.connect();
    await client.query('INSERT INTO raw_data VALUES');
  } catch (err) {
    res.status(500).send('Error saving data to database');
  }
})

app.listen(3000, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
