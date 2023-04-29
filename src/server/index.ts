import pgSessionStore from 'connect-pg-simple'
import express, { Request } from 'express'
import session from 'express-session'
import { nanoid } from 'nanoid'
import { get as getUser, remove as removeUser, saveConfig, save as saveUser } from '../libraries/credentials'
import { getClient } from '../libraries/database'
import {
  CouldNotUseCodeToGetAccessTokenSpotifyError,
  authCodeToAccessToken,
  getUser as getSpotifuUser,
} from '../libraries/spotify'

const SPOTIFY_API_SCOPES = 'user-library-read playlist-modify-public'
const AUTH_ROUTES = ['/me', '/api/config']

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

  app.use(
    session({
      store: new (pgSessionStore(session))({
        createTableIfMissing: true,
        pool: getClient(),
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
    }),
  )

  const getSession = <T>(req: Request) => req.session as T | Record<string, never>

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
      const userResponse = await getSpotifuUser(response.access_token, response.refresh_token, clientId, clientSecret)
      userId = userResponse.userId
    } catch (error) {
      console.warn(error)
      return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'false', error: 'refresh_error' }))
    }

    getSession<{ userId: string }>(req).userId = userId

    if (revoke) {
      await removeUser({ userId })
      return res.redirect(appRedirectUrl + '?' + new URLSearchParams({ ok: 'true', result: 'credentials_revoked' }))
    } else {
      try {
        await saveUser(response, userId)
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

  app.use(AUTH_ROUTES, async (req, res, next) => {
    const session = getSession<{ userId?: string }>(req)
    if (!session.userId) {
      return res.redirect('/')
    }
    return next()
  })

  app.get('/api/config', async (req, res) => {
    const session = getSession<{ userId: string }>(req)
    const { config } = await getUser({ userId: session.userId })
    return res.send(config)
  })

  app.post('/api/config', async (req, res) => {
    const session = getSession<{ userId: string }>(req)
    const postBody = req.body as {
      snapshotIntervalEnabled: boolean
      snapshotInterval: number
    }
    try {
      await saveConfig(postBody, session.userId)
      return res.send({ ok: true })
    } catch (error) {
      console.error('Error saving config for user', session.userId, error?.toString())
      return res.send({ ok: false, error: 'could_not_save_config' })
    }
  })

  app.use(express.static('src/server/frontend/dist'))

  app.listen(port, () => {
    console.log('Listening on port', port)
  })
}
