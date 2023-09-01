import pg from 'pg'
const { Pool } = pg

let connectionUri: string
let client: pg.PoolClient
let pool: pg.Pool

export const setUri = (uri: string) => (connectionUri = uri)
export const connect = async () => {
  if (!connectionUri) throw new Error('No connection URI set')
  pool = new Pool({ connectionString: connectionUri })
  client = await pool.connect()
}
export const disconnect = () => {
  client.release()
  return pool
    .end()
    .then(() => console.log('Disconnected from database'))
    .catch((e) => console.error('Error disconnecting from database:', e))
}

export const query = (text: string, params?: Array<string | number | boolean>) => {
  if (!pool) throw new Error('Not connected to database')
  return pool.query(text, params)
}

export const getPool = () => pool
