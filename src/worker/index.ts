import { RUN_INTERVAL, TIME_BETWEEN_SNAPSHOTS } from '../config'
import { Credentials } from '../credentials'
import * as db from '../database'
import { CouldNotAuthenticateSpotifyError, doIt } from '../spotify'

const spotifyApiData = {
  clientId: null as null | string,
  clientSecret: null as null | string,
}

export const setupSpotifyApi = (clientId: string, clientSecret: string) => {
  spotifyApiData.clientId = clientId
  spotifyApiData.clientSecret = clientSecret
}

async function* getNewRuns() {
  const { rows } = await db.query(
    `SELECT
    *
  FROM
    credentials
  WHERE
    id NOT IN(
      SELECT
        credentials_id FROM runs
      WHERE
        date > NOW() - INTERVAL '${TIME_BETWEEN_SNAPSHOTS} seconds')`,
  )
  for (const row of rows) {
    yield row as Credentials & { id: number }
  }
}

const saveRun = async (credentialsId: number) => {
  await db.query('INSERT INTO runs (credentials_id) VALUES ($1)', [credentialsId])
}

const _do = async () => {
  for await (const credentials of getNewRuns()) {
    console.debug('!!! New run', {
      access_token: credentials.access_token.slice(0, 10).concat('...'),
      refresh_token: credentials.refresh_token.slice(0, 10).concat('...'),
    })
    try {
      await doIt(
        credentials.access_token,
        credentials.refresh_token,
        spotifyApiData.clientId!,
        spotifyApiData.clientSecret!,
      )
      saveRun(credentials.id)
    } catch (error) {
      if (error instanceof CouldNotAuthenticateSpotifyError) {
        console.error('!!! Could not authenticate Spotify', error)
        console.log('- Deleting credentials. User ID:', credentials.id)
        await db.query('DELETE FROM credentials WHERE id = $1', [credentials.id])
      } else {
        console.error('!!! Unknown error while running', error)
      }
    }
  }
  console.debug('!!! No more runs', new Date())
}

export const start = () => {
  if (!spotifyApiData.clientId || !spotifyApiData.clientSecret) throw new Error('No Spotify API data set')
  _do()
  setInterval(_do, RUN_INTERVAL * 1000)
}
