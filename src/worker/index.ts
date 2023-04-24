import console from 'console'
import { remove, save } from '../libraries/credentials'
import {
  CouldNotAuthenticateSpotifyError,
  addTracksToPlaylist,
  createSnapshotPlaylist,
  getLikedSongs,
  getUser,
  removeOldSnapshots,
  syncDefaultPlaylist,
} from '../libraries/spotify'
import { getNewRuns, saveRun } from './database'

export type RunType = 'snapshot' | 'defaultPlaylistSync'

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
  await save({ access_token: accessToken, refresh_token: refreshToken }, userId)
  console.debug('- Getting liked songs...')
  const likedSongs = await getLikedSongs(accessToken)
  console.debug('- Liked songs retrieved!')
  console.debug('- Syncing default playlist...')
  await syncDefaultPlaylist(accessToken, likedSongs)
  console.debug('- Default playlist synced!')
}

async function snapshot(accessToken: string, refreshToken: string, clientId: string, clientSecret: string) {
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
  await save({ access_token: accessToken, refresh_token: refreshToken }, userId)
  console.debug('- Getting liked songs...')
  const likedSongs = await getLikedSongs(accessToken)
  console.debug('- Liked songs retrieved!')
  console.debug('- Creating snapshot playlist...')
  const playlistId = await createSnapshotPlaylist(accessToken)
  if (playlistId) {
    console.debug('- Snapshot playlist created!')
    await addTracksToPlaylist(accessToken, playlistId, likedSongs)
    console.debug('- Tracks added to snapshot playlist!')
  } else {
    console.debug('- Snapshot playlist already exists!')
  }
  console.debug('- Removing old snapshots...')
  await removeOldSnapshots(accessToken, 5)
  console.debug('- Old snapshots removed!')
}

const _do = async (
  runType: RunType,
  job: (accessToken: string, refreshToken: string, clientId: string, clientSecret: string) => Promise<void>,
) => {
  for await (const credentials of getNewRuns(runType)) {
    console.debug(`!!! New ${runType} run`, {
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
      saveRun(credentials.id, runType)
    } catch (error) {
      if (error instanceof CouldNotAuthenticateSpotifyError) {
        console.error('!!! Could not authenticate Spotify', error)
        console.log('- Deleting credentials. User ID:', credentials.id)
        remove({ id: credentials.id })
      } else {
        console.error('!!! Unknown error while running', error)
      }
    }
  }
  console.debug('!!! No more runs', new Date())
}

export const startSnapshotWorker = (runInterval: number) => {
  if (!spotifyApiData.clientId || !spotifyApiData.clientSecret) throw new Error('No Spotify API data set')
  _do('snapshot', snapshot)
  const loop = setInterval(() => _do('snapshot', snapshot), runInterval * 1000)
  return () => clearInterval(loop)
}

export const startDefaultPlaylistSyncWorker = (runInterval: number) => {
  if (!spotifyApiData.clientId || !spotifyApiData.clientSecret) throw new Error('No Spotify API data set')
  _do('defaultPlaylistSync', defaultPlaylistSync)
  const loop = setInterval(() => _do('defaultPlaylistSync', defaultPlaylistSync), runInterval * 1000)
  return () => clearInterval(loop)
}
