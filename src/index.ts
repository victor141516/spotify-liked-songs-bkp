import express from 'express'
import { nanoid } from 'nanoid'

const clientId = process.env.CLIENT_ID!
const clientSecret = process.env.CLIENT_SECRET!
const redirectUri = 'http://localhost:3000/auth/callback'

const app = express()
app.use(express.json())

app.get('/auth/login', async (req, res) => {
  const state = nanoid(16)
  const scope = 'user-library-read playlist-modify-public'
  // 'user-read-private user-library-read playlist-modify-private playlist-modify-public user-read-email playlist-read-private playlist-read-collaborative'

  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
      }),
  )
})

app.get('/auth/callback', async (req, res) => {
  const code = (req.query.code as undefined | string) || null
  const state = (req.query.state as undefined | string) || null

  if (state === null) {
    return res.redirect(
      '/#' +
        new URLSearchParams({
          error: 'state_mismatch',
        }),
    )
  }

  if (code === null) {
    return res.redirect(
      '/#' +
        new URLSearchParams({
          error: 'no_code',
        }),
    )
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
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
    (res) =>
      res.json() as Promise<{
        access_token: string
        refresh_token: string
        expires_in: number
        token_type: string
        scope: string
      }>,
  )

  return res.json(response)
})

async function getUserId(accessToken: string, refreshToken: string): Promise<string> {
  const meUrl = 'https://api.spotify.com/v1/me'
  const headers = { Authorization: `Bearer ${accessToken}` }
  const response = await fetch(meUrl, { headers })
  if (response.ok) {
    const { id: userId } = (await response.json()) as { id: string }
    return userId
  } else if (response.status === 401 && refreshToken) {
    const refreshUrl = 'https://accounts.spotify.com/api/token'
    const refreshHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    }
    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }
    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      headers: refreshHeaders,
      body: new URLSearchParams(refreshData),
    })
    if (refreshResponse.ok) {
      const { access_token: newAccessToken } = await refreshResponse.json()
      return getUserId(newAccessToken, refreshToken)
    }
  }
  throw new Error('Failed to get user ID')
}

async function getLikedSongs(accessToken: string): Promise<string[]> {
  const likedSongsResponse = await fetch('https://api.spotify.com/v1/me/tracks', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => res.json() as Promise<{ items: { track: { id: string } }[] }>)

  const likedSongs = likedSongsResponse.items.map((item) => item.track.id)
  return likedSongs
}

function generatePlaylistName(daysFromNow: number) {
  const now = new Date()
  const date = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000)
  return `Liked Songs (${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()})`
}

async function createSnapshotPlaylist(accessToken: string) {
  const now = new Date()
  const { id: playlistId } = await fetch(`https://api.spotify.com/v1/me/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: generatePlaylistName(0),
    }),
  }).then((res) => res.json() as Promise<{ id: string }>)
  return playlistId
}

async function addTracksToPlaylist(accessToken: string, playlistId: string, likedSongs: string[]) {
  const ok = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: likedSongs.map((id) => `spotify:track:${id}`),
    }),
  }).then((res) => res.ok)
  return ok
}

async function removeOldSnapshots(accessToken: string, itemsToKeep: number) {
  const playlists = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  }).then((response) => response.json() as Promise<{ items: { id: string; name: string }[] }>)
  const snapshotPlaylists = playlists.items.filter((playlist) => playlist.name.startsWith('Liked Songs ('))
  const sortedPlaylists = snapshotPlaylists.sort((a, b) => {
    const aDate = new Date(a.name.slice(13, -1))
    const bDate = new Date(b.name.slice(13, -1))
    return aDate.getTime() - bDate.getTime()
  })
  const playlistsToDelete = sortedPlaylists.slice(0, -itemsToKeep)
  const a = await Promise.all(
    playlistsToDelete.map((playlist) =>
      fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/followers`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      }),
    ),
  )
  return a
}

app.post('/api/snapshot', async (req, res) => {
  const accessToken = req.body.access_token
  const refreshToken = req.body.refresh_token

  const a = await removeOldSnapshots(accessToken, 3)

  // let ok = false
  // try {
  //   await getUserId(accessToken, refreshToken)
  //   const likedSongs = await getLikedSongs(accessToken)
  //   const playlistId = await createSnapshotPlaylist(accessToken, userId)
  //   ok = await addTracksToPlaylist(accessToken, playlistId, likedSongs)
  // } catch (e) {
  //   console.error(e)
  // }

  res.send({ a })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('Listening on port', PORT)
})
