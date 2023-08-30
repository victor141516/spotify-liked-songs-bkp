import { config as configEnv } from 'dotenv'

configEnv()
export const CLIENT_ID = process.env.CLIENT_ID!
export const CLIENT_SECRET = process.env.CLIENT_SECRET!
export const SPOTIFY_API_AUTH_REDIRECT_URI =
  process.env.SPOTIFY_API_AUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback'
export const SPOTIFY_API_REVOKE_REDIRECT_URI =
  process.env.SPOTIFY_API_REVOKE_REDIRECT_URI || 'http://localhost:3000/auth/callback?revoke=true'
export const APP_REDIRECT_URI = process.env.APP_REDIRECT_URI || 'http://localhost:3000/callback'
export const PORT = Number.parseInt(process.env.PORT || '3000')
export const DATABASE_URI =
  process.env.DATABASE_URI ||
  'postgres://spotify-liked-songs-bkp:spotify-liked-songs-bkp@localhost:25432/spotify-liked-songs-bkp'
export const MODE = (process.argv[2] || process.env.MODE || 'server') as 'server' | 'worker'
export const RUN_INTERVAL = Number.parseInt(process.env.RUN_INTERVAL || (1000 * 60).toString())
export const SESSION_SECRET = process.env.SESSION_SECRET || 'a-very-secret-secret'
export const SENTRY_DSN = process.env.SENTRY_DSN

if (!CLIENT_ID) {
  console.warn('CLIENT_ID not set')
}
if (!CLIENT_SECRET) {
  console.warn('CLIENT_SECRET not set')
}
if (SESSION_SECRET === 'a-very-secret-secret') {
  console.warn('SESSION_SECRET not set. Using default value. THIS IS NOT SECURE!!!')
}
