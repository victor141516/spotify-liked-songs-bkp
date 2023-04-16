import express from 'express'
import { nanoid } from 'nanoid'
import pg from 'pg'
import { save as saveCredentials } from '../credentials'
import { doIt, getUser } from '../spotify'

export const start = (clientId: string, clientSecret: string, port: number, redirectUri: string) => {
  const app = express()
  app.use(express.json())

  app.get('/auth/login', async (req, res) => {
    const state = nanoid(16)
    const scope = 'user-library-read playlist-modify-public'

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

    if (state === null) return res.json({ ok: false, error: 'no_state' })
    if (code === null) return res.json({ ok: false, error: 'no_code' })

    let response: {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      scope: string
    }
    try {
      response = await fetch('https://accounts.spotify.com/api/token', {
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
      }).then((res) => res.json())
    } catch (error) {
      console.error(error)
      return res.json({ ok: false, error })
    }

    const { userId } = await getUser(response.access_token, response.refresh_token, clientId, clientSecret)

    try {
      await saveCredentials(response, userId)
      return res.json({ ok: true, result: 'credentials_saved' })
    } catch (error) {
      if (error instanceof pg.DatabaseError) return res.json({ ok: true, result: 'credentials_already_saved' })

      return res.json({ ok: false, error })
    }
  })

  app.post('/api/snapshot', async (req, res) => {
    const accessToken = req.body.access_token
    const refreshToken = req.body.refresh_token

    let ok = false
    try {
      await doIt(accessToken, refreshToken, clientId, clientSecret)
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
