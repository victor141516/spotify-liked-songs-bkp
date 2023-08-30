import memoize from 'memoizee'
import {
  SpotifyApiAccessTokenExpiredError,
  SpotifyApiBadGatewayError,
  SpotifyApiCapturedError,
  SpotifyApiGatewayTimeoutError,
  SpotifyApiInternalServerErrorError,
  SpotifyApiRefreshTokenRevokedError,
  SpotifyApiServiceUnavailableError,
  SpotifyApiTooManyRequestsError,
  addBreadcrumb,
  captureException,
} from '../errors'
import { sleep } from '../misc'

const PLAYLIST_NAME = 'Liked Songs'

export class SpotifyError {
  constructor(public message: string) {}
}
export class FetchExceptionSpotifyError extends SpotifyError {}
export class FetchGetTextExceptionSpotifyError extends SpotifyError {}
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

export class PlaylistWithoutItemsSpotifyError extends DebuggingError {}

async function handleNotOkResponse(response: Response, url: string): Promise<never> {
  let TheError = SpotifyApiCapturedError
  if (response.status === 429) {
    TheError = SpotifyApiTooManyRequestsError
  } else if (response.status === 400 && (await response.json()).error === 'invalid_grant') {
    TheError = SpotifyApiRefreshTokenRevokedError
  } else if (response.status === 401) {
    TheError = SpotifyApiAccessTokenExpiredError
  } else if (response.status === 500) {
    TheError = SpotifyApiInternalServerErrorError
  } else if (response.status === 502) {
    TheError = SpotifyApiBadGatewayError
  } else if (response.status === 503) {
    TheError = SpotifyApiServiceUnavailableError
  } else if (response.status === 504) {
    TheError = SpotifyApiGatewayTimeoutError
  }
  let body = ''
  try {
    body = await response.text()
  } catch (e) {
    console.warn(`!!!!!!! Maybe error. Could not parse not OK response body
    Error: ${TheError.name}
    URL: ${url},
    Status: ${response.status},
    StatusText: ${response.statusText}
    `)
  }
  const error = new TheError(TheError.name)
  captureException(error, {
    url,
    status: response.status,
    statusText: response.statusText,
    body,
  })
  throw error
}

const MAX_RETRIES = 5

const rateLimitHandledFetch = async (
  url: string,
  options: RequestInit = {},
  {
    expectedStatuses = [200, 201],
    maxRetries = MAX_RETRIES,
  }: { expectedStatuses?: number[]; maxRetries?: number } = {},
): Promise<Response> => {
  if (maxRetries < MAX_RETRIES) {
    console.debug('  - Retrying request...', { url })
  }
  let response: Response
  try {
    response = await fetch(url, options)
  } catch (e) {
    if (maxRetries > 0) {
      return rateLimitHandledFetch(url, options, { expectedStatuses, maxRetries: maxRetries - 1 })
    } else {
      throw new FetchExceptionSpotifyError(
        `URL: ${url}
      Option: ${JSON.stringify(options)}
      Error: ${e?.toString() || 'Error fetching'}`,
      )
    }
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    await sleep(1 + retryAfter * 1000)
    if (maxRetries > 0) {
      return rateLimitHandledFetch(url, options, { expectedStatuses, maxRetries: maxRetries - 1 })
      // throw new RateLimitExceededSpotifyError(retryAfter)
    } else {
      await handleNotOkResponse(response.clone(), url)
    }
  }

  if (!expectedStatuses.includes(response.status)) {
    if (maxRetries > 0) {
      await sleep(1000)
      return rateLimitHandledFetch(url, options, { expectedStatuses, maxRetries: maxRetries - 1 })
    } else {
      await handleNotOkResponse(response.clone(), url)
    }
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
  const response = await rateLimitHandledFetch(meUrl, { headers }, { expectedStatuses: [200, 201, 401] })
  if (response.ok) {
    console.debug('  - Access token works! no need to refresh')
    const { id: userId } = (await response.json()) as { id: string }
    addBreadcrumb({ message: 'Got user ID', data: { userId } })
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
      let body = ''
      try {
        body = await refreshResponse.text()
      } catch (e) {
        console.warn(`!!!!!!! Maybe error. Could not parse not OK response body while refreshing access token
        URL: ${refreshUrl},
        Status: ${response.status},
        StatusText: ${response.statusText}`)
      }
      console.error('Error refreshing:', refreshResponse.status, body)
    }
  } else {
    let body = ''
    try {
      body = await response.text()
    } catch (e) {
      console.warn(`!!!!!!! Maybe error. Could not parse not OK response body while getting user info (/me)
        URL: ${meUrl},
        Status: ${response.status},
        StatusText: ${response.statusText}`)
    }
    console.error(
      '  - Unknown error getting user info:',
      response.status,
      body,
      'retry-after:',
      response.headers.get('retry-after'),
    )
  }
  console.debug('  - Access token does not work and could not be refreshed')
  throw new CouldNotAuthenticateSpotifyError(`Failed to get user ID (status: ${response.status})`)
}

async function _getLikedSongs(accessToken: string): Promise<string[]> {
  let nextUrl = 'https://api.spotify.com/v1/me/tracks?limit=50'
  const allSongs: string[] = []
  let count = 0
  while (nextUrl) {
    console.debug('  - Getting next liked songs page...')
    const likedSongsResponse = await rateLimitHandledFetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res) => res.json() as Promise<{ next: string; items: { track: { id: string; name: string } }[] }>)
    count += likedSongsResponse.items.length
    console.debug('  - Got', likedSongsResponse.items.length, 'new songs. Total:', count)
    nextUrl = likedSongsResponse.next
    const likedSongs = likedSongsResponse.items.map((item) => item.track.id)
    allSongs.push(...likedSongs)
  }
  console.debug('  - Got liked songs!')
  return allSongs
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
  let nextUrl = `https://api.spotify.com/v1/playlists/${defaultPlaylist}/tracks?limit=50`
  let count = 0
  while (nextUrl) {
    console.debug('  - Getting default playlist tracks...')
    const { next, items } = await rateLimitHandledFetch(nextUrl, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    })
      .then((res) => res.json() as Promise<{ next: string; items: { track: { id: string } }[] }>)
      .then((res) => {
        if (!res.items) {
          throw new PlaylistWithoutItemsSpotifyError({ nextUrl, res })
        }
        return { next: res.next, items: res.items.map((item) => item.track.id) }
      })
    count += items.length
    console.debug('  - Got', items.length, 'new songs. Total:', count)
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
