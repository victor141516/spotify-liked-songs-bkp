import pgSessionStore from 'connect-pg-simple'
import express, { Request } from 'express'
import session from 'express-session'
import { nanoid } from 'nanoid'
import { get as getUser, remove as removeUser, saveConfig, save as saveUser } from '../libraries/credentials'
import { getPool } from '../libraries/database'
import { addBreadcrumb } from '../libraries/errors'
import {
  CouldNotUseCodeToGetAccessTokenSpotifyError,
  authCodeToAccessToken,
  getUser as getSpotifyUser,
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
        pool: getPool(),
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
    }),
  )

  const getSession = <T>(req: Request) => req.session as T | Record<string, never>

  app.get('/auth/login', async (req, res) => {
    const state = nanoid(16)
    addBreadcrumb({ category: 'endpoint_hit', message: 'Login started', data: { state } })
    return res.redirect(
      'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          scope: SPOTIFY_API_SCOPES,
          redirect_uri: spotifyApiAuthRedirectUri,
          state,
        }),
    )
  })

  app.get('/auth/revoke', async (req, res) => {
    const state = nanoid(16)
    addBreadcrumb({ category: 'endpoint_hit', message: 'Revoke started', data: { state } })
    return res.redirect(
      'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          scope: '',
          redirect_uri: spotifyApiRevokeRedirectUri,
          state,
        }),
    )
  })

  app.get('/auth/callback', async (req, res) => {
    addBreadcrumb({ category: 'endpoint_hit', message: 'Spotify auth callback' })
    const code = (req.query.code as undefined | string) || null
    const state = (req.query.state as undefined | string) || null
    const revoke = ((req.query.revoke as undefined | string) || 'false') === 'true'

    addBreadcrumb({ category: 'auth_callback', message: 'URL params', data: req.query })

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
      const userResponse = await getSpotifyUser(response.access_token, response.refresh_token, clientId, clientSecret)
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
    addBreadcrumb({ category: 'endpoint_hit', message: '[GET] API config' })
    const session = getSession<{ userId: string }>(req)
    const { config } = await getUser({ userId: session.userId })
    return res.send(config)
  })

  app.post('/api/config', async (req, res) => {
    addBreadcrumb({ category: 'endpoint_hit', message: '[POST] API config' })
    const session = getSession<{ userId: string }>(req)
    const postBody = req.body as {
      defaultPlaylistSyncInterval: number
    }
    try {
      await saveConfig(postBody, session.userId)
      return res.send({ ok: true })
    } catch (error) {
      console.error('Error saving config for user', session.userId, error?.toString())
      return res.send({ ok: false, error: 'could_not_save_config' })
    }
  })

  const frontendPath = new URL('frontend/dist', import.meta.url).pathname
  app.use(express.static(frontendPath))

  app.listen(port, () => {
    console.log('Listening on port', port)
  })
}
