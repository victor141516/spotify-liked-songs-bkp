import pg from 'pg'
const { Client } = pg

let connectionUri: string
let client: pg.Client

export const setUri = (uri: string) => (connectionUri = uri)
export const connect = () => {
  if (!connectionUri) throw new Error('No connection URI set')
  client = new Client(connectionUri)
  return client.connect()
}
export const disconnect = () => client.end()
export const query = (text: string, params?: Array<string | number | boolean>) => {
  if (!client) throw new Error('Not connected to database')
  return client.query(text, params)
}
