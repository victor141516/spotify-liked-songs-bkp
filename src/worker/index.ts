import { PromisePool } from '@supercharge/promise-pool'
import { SYNC_JOB_PARALLELISM } from '../libraries/config'
import { Credentials, save as saveCredentials } from '../libraries/credentials'
import { SpotifyApiRefreshTokenRevokedError } from '../libraries/errors'
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
export type ErrorRun = 'error' | 'revokedCredentials'

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

async function processJob(
  credentials: Credentials & {
    id: number
  },
) {
  console.debug(`!!! New sync run`, {
    ...credentials,
    access_token: credentials.access_token.slice(0, 10).concat('...'),
    refresh_token: credentials.refresh_token.slice(0, 10).concat('...'),
  })
  try {
    await defaultPlaylistSync(
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
      } else if (isInstance(error, SpotifyApiRefreshTokenRevokedError)) {
        saveRun(credentials.id, 'revokedCredentials')
        // await removeCredentials({ id: credentials.id })
      } else {
        console.error('!!! Unknown error while running', error)
      }
    }
  }
}

export const _service = (runInterval: number) => {
  if (!spotifyApiData.clientId || !spotifyApiData.clientSecret) throw new Error('No Spotify API data set')
  let stop = false
  const servicePromise = (async () => {
    while (true) {
      if (stop) break

      const newRuns = await getNewRuns()
      if (newRuns.length === 0) {
        await sleep(runInterval)
        continue
      }

      await PromisePool.for(newRuns)
        .withConcurrency(SYNC_JOB_PARALLELISM)
        .onTaskFinished((_, pool) => {
          if (stop) pool.stop()
        })
        .process((c) => processJob(c))
      console.debug(`!!! No more sync runs`, new Date())
    }
  })()
  return {
    promise: servicePromise,
    stop: () => {
      stop = true
    },
  }
}

export const startDefaultPlaylistSyncWorker = (runInterval: number) => _service(runInterval)
