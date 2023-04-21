import console from 'console'
import { RUN_INTERVAL, TIME_BETWEEN_SNAPSHOTS } from '../config'
import { deleteCredentials } from '../credentials'
import { CouldNotAuthenticateSpotifyError, sync } from '../spotify'
import { getNewRuns, saveRun } from './database'

const spotifyApiData = {
  clientId: null as null | string,
  clientSecret: null as null | string,
}

export const setupSpotifyApi = (clientId: string, clientSecret: string) => {
  spotifyApiData.clientId = clientId
  spotifyApiData.clientSecret = clientSecret
}

const _do = async () => {
  for await (const credentials of getNewRuns(TIME_BETWEEN_SNAPSHOTS)) {
    console.debug('!!! New run', {
      access_token: credentials.access_token.slice(0, 10).concat('...'),
      refresh_token: credentials.refresh_token.slice(0, 10).concat('...'),
    })
    try {
      await sync(
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
        deleteCredentials({ id: credentials.id })
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
