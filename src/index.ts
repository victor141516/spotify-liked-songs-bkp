import { config as configEnv } from 'dotenv'
import express from 'express'
import { nanoid } from 'nanoid'
import { doIt } from './playlists'

configEnv()
const clientId = process.env.CLIENT_ID!
const clientSecret = process.env.CLIENT_SECRET!
const redirectUri = process.env.LOGIN_REDIRECT_URI!

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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('Listening on port', PORT)
})

/* PLANS:
- Design database schema
  - Credentials
  - Runs
- Make callback store tokens in database
- Create a function that gets X users with no run in the last Y hours. For each user, run the script and store the run in the database
  - Run the function every Z time
*/
