import express, { Request } from 'express'
import session from 'express-session'
import { readFileSync } from 'fs'
import { nanoid } from 'nanoid'
import { deleteCredentials, save as saveCredentials } from '../credentials'
import { CouldNotUseCodeToGetAccessTokenSpotifyError, authCodeToAccessToken, getUser, sync } from '../spotify'

const SPOTIFY_API_SCOPES = 'user-library-read playlist-modify-public'

const frontendFileNames = ['home.html', 'callback.html'] as const
const frontendFiles = frontendFileNames
  .map((filename) => ({
    filename,
    content: readFileSync(`src/server/frontend/${filename}`, 'utf8'),
  }))
  .reduce(
    (acc, { filename, content }) => ({ ...acc, [filename]: content }),
    {} as Record<(typeof frontendFileNames)[number], string>,
  )

export const start = (
  clientId: string,
  clientSecret: string,
  port: number,
  spotifyApiAuthRedirectUri: string,
  spotifyApiRevokeRedirectUri: string,
  appRedirectUrl: string,
  sessionSecret: string,
) => {
  const app = express()
  app.use(express.json())
  app.use('/static', express.static('src/server/frontend/static'))

  // TODO: add session store
  app.use(session({ secret: sessionSecret, resave: false, saveUninitialized: false }))

  const getSession = <T>(req: Request) => req.session as T

  app.get('/', async (req, res) => {
    res.send(frontendFiles['home.html'])
  })

  app.get('/callback', async (req, res) => {
    res.send(frontendFiles['callback.html'])
  })

  app.get('/auth/login', async (req, res) => {
    return res.redirect(
      'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          scope: SPOTIFY_API_SCOPES,
          redirect_uri: spotifyApiAuthRedirectUri,
          state: nanoid(16),
        }),
    )
  })

  app.get('/auth/revoke', async (req, res) => {
    return res.redirect(
      'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          scope: '',
          redirect_uri: spotifyApiRevokeRedirectUri,
          state: nanoid(16),
        }),
    )
  })

  app.get('/auth/callback', async (req, res) => {
    const code = (req.query.code as undefined | string) || null
    const state = (req.query.state as undefined | string) || null
    const revoke = ((req.query.revoke as undefined | string) || 'false') === 'true'

    if (state === null)
      return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'false', error: 'no_state' }))
    if (code === null)
      return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'false', error: 'no_code' }))

    let response: {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      scope: string
    }
    try {
      response = await authCodeToAccessToken(
        code,
        revoke ? spotifyApiRevokeRedirectUri : spotifyApiAuthRedirectUri,
        clientId,
        clientSecret,
      )
    } catch (error) {
      if (error instanceof CouldNotUseCodeToGetAccessTokenSpotifyError) {
        console.error(error)
        return res.redirect(
          appRedirectUrl +
            '?' +
            new URLSearchParams({ ok: 'false', error: error?.toString() || 'cannot_use_code_to_get_access_token' }),
        )
      } else {
        return res.redirect(
          appRedirectUrl + '?' + new URLSearchParams({ ok: 'false', error: error?.toString() || 'unknown_error' }),
        )
      }
    }

    let userId: string

    try {
      const userResponse = await getUser(response.access_token, response.refresh_token, clientId, clientSecret)
      userId = userResponse.userId
    } catch (error) {
      console.warn(error)
      return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'false', error: 'refresh_error' }))
    }

    if (revoke) {
      await deleteCredentials({ userId })
      return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'true', result: 'credentials_revoked' }))
    } else {
      try {
        await saveCredentials(response, userId)
        return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'true', result: 'credentials_saved' }))
      } catch (error) {
        console.warn(error?.toString())
        return res.redirect(
          appRedirectUrl +
            '?' +
            new URLSearchParams({ ok: 'false', error: 'could_not_save_credentials' || 'unknown_error' }),
        )
      }
    }
  })

  app.post('/api/snapshot', async (req, res) => {
    const accessToken = req.body.access_token
    const refreshToken = req.body.refresh_token

    let ok = false
    try {
      await sync(accessToken, refreshToken, clientId, clientSecret)
      ok = true
    } catch (e) {
      console.error(e)
    }

    res.send({ ok })
  })

  app.listen(port, () => {
    console.log('Listening on port', port)
  })
}
