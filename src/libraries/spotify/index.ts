import memoize from 'memoizee'

const PLAYLIST_NAME = 'Liked Songs'

export class SpotifyError {
  constructor(public message: string) {}
}
export class CouldNotAuthenticateSpotifyError extends SpotifyError {}
export class CouldNotUseCodeToGetAccessTokenSpotifyError extends SpotifyError {}
export class RateLimitExceededSpotifyError extends SpotifyError {
  constructor(public retryAfter: number) {
    super('Rate limit exceeded')
  }
}

export class DebuggingError extends SpotifyError {
  constructor(public data: unknown) {
    super(`Debugging data: ${JSON.stringify(data)}`)
  }
}

export class May25DebuggingError extends DebuggingError {}

const rateLimitHandledFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options)
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new RateLimitExceededSpotifyError(retryAfter)
  }
  return response
}

async function _getUser(
  accessToken: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ userId: string; accessToken: string }> {
  const meUrl = 'https://api.spotify.com/v1/me'
  const headers = { Authorization: `Bearer ${accessToken}` }
  const response = await rateLimitHandledFetch(meUrl, { headers })
  if (response.ok) {
    console.debug('  - Access token works! no need to refresh')
    const { id: userId } = (await response.json()) as { id: string }
    return { userId, accessToken }
  } else if (response.status === 401 && refreshToken) {
    console.debug('  - Refreshing access token...')
    const refreshUrl = 'https://accounts.spotify.com/api/token'
    const refreshHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    }
    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }
    const refreshResponse = await rateLimitHandledFetch(refreshUrl, {
      method: 'POST',
      headers: refreshHeaders,
      body: new URLSearchParams(refreshData),
    })
    if (refreshResponse.ok) {
      console.debug('  - Access token refreshed!')
      const { access_token: newAccessToken } = await refreshResponse.json()
      console.debug('  - Checking if access token works...')
      return getUser(newAccessToken, refreshToken, clientId, clientSecret)
    } else {
      console.error('Error refreshing:', refreshResponse.status, await refreshResponse.text())
    }
  } else {
    console.error(
      '  - Unknown error getting user info:',
      response.status,
      await response.text(),
      'retry-after:',
      response.headers.get('retry-after'),
    )
  }
  console.debug('  - Access token does not work and could not be refreshed')
  throw new CouldNotAuthenticateSpotifyError(`Failed to get user ID (status: ${response.status})`)
}

async function _getLikedSongs(accessToken: string): Promise<string[]> {
  let nextUrl = 'https://api.spotify.com/v1/me/tracks'
  const allSongs: string[] = []
  let count = 0
  while (nextUrl) {
    console.debug('  - Getting liked songs... ', ++count)
    const likedSongsResponse = await rateLimitHandledFetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res) => res.json() as Promise<{ next: string; items: { track: { id: string } }[] }>)
    nextUrl = likedSongsResponse.next
    const likedSongs = likedSongsResponse.items.map((item) => item.track.id)
    allSongs.push(...likedSongs)
  }
  console.debug('  - Got liked songs!')
  return allSongs
}

export function generatePlaylistName(daysFromNow: number) {
  const now = new Date()
  const date = new Date(now.getTime() - daysFromNow * 24 * 60 * 60 * 1000)
  return `${PLAYLIST_NAME} (${date.toLocaleString('default', {
    month: 'short',
  })} ${date.getDate()}, ${date.getFullYear()})`
}

export async function createPlaylist(accessToken: string, name: string) {
  const { id } = await rateLimitHandledFetch(`https://api.spotify.com/v1/me/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  }).then((res) => res.json() as Promise<{ id: string }>)
  return id
}

export async function createSnapshotPlaylist(accessToken: string) {
  console.debug('  - Creating snapshot playlist name...')
  const playlistName = generatePlaylistName(0)
  console.debug('  - Created snapshot playlist name!')
  console.debug('  - Getting all playlists...')
  const allPlaylists = await getAllPlaylists(accessToken)
  console.debug('  - Got all playlists!')
  console.debug('  - Checking if playlist already exists...')
  const existingPlaylist = allPlaylists.find((playlist) => playlist.name === playlistName)
  if (existingPlaylist) {
    console.debug("  - Playlist already exists! Let's not touch anything...")
    return null
  }
  console.debug('  - Playlist does not exist, creating...')
  const id = await createPlaylist(accessToken, playlistName)
  console.debug('  - Created snapshot playlist!')
  return id
}

export async function addTracksToPlaylist(accessToken: string, playlistId: string, likedSongs: string[]) {
  const batches: string[][] = []
  for (let i = 0; i < likedSongs.length; i += 100) {
    batches.push(likedSongs.slice(i, i + 100))
  }

  const batchJobs: boolean[] = []
  for (const batch of batches) {
    const res = await rateLimitHandledFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: batch.map((id) => `spotify:track:${id}`),
      }),
    })
    batchJobs.push(res.ok)
  }
  return batchJobs.every(Boolean)
}

async function _getAllPlaylists(accessToken: string) {
  const { items } = await rateLimitHandledFetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  }).then((response) => response.json() as Promise<{ items: { id: string; name: string }[] }>)
  return items
}

export async function syncDefaultPlaylist(accessToken: string, likedSongs: string[]) {
  console.debug('  - Getting all playlists...')
  const playlists = await getAllPlaylists(accessToken)
  console.debug('  - Got all playlists!')
  console.debug('  - Finding default playlist...')
  let defaultPlaylist = playlists.find((playlist) => playlist.name === PLAYLIST_NAME)?.id
  if (!defaultPlaylist) {
    console.debug('  - Default playlist not found, creating...')
    defaultPlaylist = await createPlaylist(accessToken, PLAYLIST_NAME)
  }
  console.debug('  - Got default playlist!')

  const allItems: string[] = []
  let nextUrl = `https://api.spotify.com/v1/playlists/${defaultPlaylist}/tracks`
  let count = 0
  while (nextUrl) {
    console.debug('  - Getting default playlist tracks... ', ++count)
    const { next, items } = await rateLimitHandledFetch(nextUrl, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    })
      .then((res) => res.json() as Promise<{ next: string; items: { track: { id: string } }[] }>)
      .then((res) => {
        if (!res.items) {
          throw new May25DebuggingError(res)
        }
        return { next: res.next, items: res.items.map((item) => item.track.id) }
      })
    allItems.push(...items)
    nextUrl = next
  }
  console.debug('  - Got default playlist tracks!')

  console.debug('  - Resetting default playlist...')
  const batches: string[][] = []
  for (let i = 0; i < allItems.length; i += 100) {
    batches.push(allItems.slice(i, i + 100))
  }
  const cleaningJobs = batches.map((batch) => {
    return rateLimitHandledFetch(`https://api.spotify.com/v1/playlists/${defaultPlaylist}/tracks`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tracks: batch.map((id) => ({ uri: `spotify:track:${id}` })),
      }),
    })
  })
  await Promise.all(cleaningJobs)
  console.debug('  - Default playlist reset!')

  console.debug('  - Adding liked songs to default playlist...')
  const addResult = await addTracksToPlaylist(accessToken, defaultPlaylist, likedSongs)
  if (addResult) console.debug('  - Added liked songs to default playlist!')
  else console.warn('  - Failed to add liked songs to default playlist!')

  return addResult
}

export async function removeOldSnapshots(accessToken: string, itemsToKeep: number) {
  const work = async () => {
    console.debug('  - Getting all playlists...')
    const items = await getAllPlaylists(accessToken)
    console.debug('  - Got all playlists!')
    console.debug('  - Filtering playlists...')
    const snapshotPlaylists = items
      .map((playlist) => ({
        id: playlist.id,
        date: playlist.name.match(`${PLAYLIST_NAME} \\((... [1-3]?[0-9], [0-9]{4})\\)`)?.[1],
      }))
      .filter((p) => p.date) as { id: string; date: string }[]
    const sortedPlaylists = snapshotPlaylists.sort((a, b) => {
      const aDate = new Date(a.date)
      const bDate = new Date(b.date)
      return bDate.getTime() - aDate.getTime()
    })
    const playlistsToDelete = sortedPlaylists.slice(itemsToKeep)
    console.debug('  - Filtered playlists!', playlistsToDelete.length, 'to delete')
    console.debug('  - Deleting playlists...')
    const results = await Promise.all(
      playlistsToDelete.map((playlist) => {
        return rateLimitHandledFetch(`https://api.spotify.com/v1/playlists/${playlist.id}/followers`, {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + accessToken,
          },
        })
          .then((r) => r.text())
          .then((t) => t === '')
      }),
    )
    console.debug('  - Deleted playlists!')
    return results.every(Boolean)
  }
  if (!(await work())) {
    console.warn('  - Failed to delete some playlists, retrying...')
    await work()
  }
}
export async function authCodeToAccessToken(code: string, redirectUri: string, clientId: string, clientSecret: string) {
  try {
    return await rateLimitHandledFetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: new URLSearchParams({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      headers: {
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }).then(
      (r) =>
        r.json() as Promise<{
          access_token: string
          refresh_token: string
          expires_in: number
          token_type: string
          scope: string
        }>,
    )
  } catch (error) {
    throw new CouldNotUseCodeToGetAccessTokenSpotifyError(error?.toString() || 'Error using code to get access token')
  }
}

const cacheMaxAge = 10 * 60 * 1000 // 10 minutes

export const getUser = memoize(_getUser, { maxAge: cacheMaxAge })
export const getLikedSongs = memoize(_getLikedSongs, { maxAge: cacheMaxAge })
export const getAllPlaylists = memoize(_getAllPlaylists, { maxAge: cacheMaxAge })
