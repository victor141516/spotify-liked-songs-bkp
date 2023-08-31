import PromisePool from '@supercharge/promise-pool'
import { save as saveCredentials } from '../libraries/credentials'
import { isInstance, sleep } from '../libraries/misc'
import {
  CouldNotAuthenticateSpotifyError,
  PlaylistWithoutItemsSpotifyError,
  RateLimitExceededSpotifyError,
  getLikedSongs,
  getUser,
  syncDefaultPlaylist,
} from '../libraries/spotify'
import { getNewRuns, saveRun } from './database'

export type RunType = 'defaultPlaylistSync'
export type ErrorRun = 'error'

const spotifyApiData = {
  clientId: null as null | string,
  clientSecret: null as null | string,
}

export const setupSpotifyApi = (clientId: string, clientSecret: string) => {
  spotifyApiData.clientId = clientId
  spotifyApiData.clientSecret = clientSecret
}

async function defaultPlaylistSync(accessToken: string, refreshToken: string, clientId: string, clientSecret: string) {
  console.debug('- Refreshing access token...')
  let userId: string
  try {
    const { accessToken: freshAccessToken, userId: theUserId } = await getUser(
      accessToken,
      refreshToken,
      clientId,
      clientSecret,
    )
    userId = theUserId
    console.debug('- Fresh token obtained!')
    accessToken = freshAccessToken
  } catch (error) {
    throw error
  }
  console.debug('- Updating access token on the database...')
  await saveCredentials({ access_token: accessToken, refresh_token: refreshToken }, userId)
  console.debug('- Getting liked songs...')
  const likedSongs = await getLikedSongs(accessToken)
  console.debug('- Liked songs retrieved!')
  console.debug('- Syncing default playlist...')
  await syncDefaultPlaylist(accessToken, likedSongs)
  console.debug('- Default playlist synced!')
}

async function _do(
  job: (accessToken: string, refreshToken: string, clientId: string, clientSecret: string) => Promise<void>,
) {
  const newRuns = await getNewRuns()
  const pool = PromisePool.for(newRuns).withConcurrency(5)
  pool
    .process(async (credentials) => {
      console.debug(`!!! New sync run`, {
        ...credentials,
        access_token: credentials.access_token.slice(0, 10).concat('...'),
        refresh_token: credentials.refresh_token.slice(0, 10).concat('...'),
      })
      try {
        await job(
          credentials.access_token,
          credentials.refresh_token,
          spotifyApiData.clientId!,
          spotifyApiData.clientSecret!,
        )
        saveRun(credentials.id, 'defaultPlaylistSync')
      } catch (error) {
        if (error instanceof CouldNotAuthenticateSpotifyError || error instanceof PlaylistWithoutItemsSpotifyError) {
          console.error('!!! Error on the run:', error)
          saveRun(credentials.id, 'error')
        } else {
          if (isInstance(error, RateLimitExceededSpotifyError)) {
            console.warn('!!! Rate limit exceeded. Waiting seconds', error.retryAfter)
            await sleep(error.retryAfter * 1000)
            // } else if (isInstance(error, SpotifyApiRefreshTokenRevokedError)) {
            //   await removeCredentials({ id: credentials.id })
          } else {
            console.error('!!! Unknown error while running', error)
          }
        }
      }
      // yield
    })
    .then(() => {
      console.debug(`!!! No more sync runs`, new Date())
    })

  return pool
}

export const _service = (runInterval: number) => {
  if (!spotifyApiData.clientId || !spotifyApiData.clientSecret) throw new Error('No Spotify API data set')
  let stop = false
  ;(async () => {
    while (true) {
      let emptyQueue = true
      const pool = await _do(defaultPlaylistSync)
      pool
        .onTaskFinished((_, pool) => {
          if (stop) pool.stop()
        })
        .onTaskStarted(() => {
          emptyQueue = false
        })
      if (emptyQueue) await sleep(runInterval)
    }
  })()
  return () => {
    stop = true
  }
}

export const startDefaultPlaylistSyncWorker = (runInterval: number) => _service(runInterval)
