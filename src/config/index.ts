import { config as configEnv } from 'dotenv'

configEnv()
export const CLIENT_ID = process.env.CLIENT_ID!
export const CLIENT_SECRET = process.env.CLIENT_SECRET!
export const REDIRECT_URI = process.env.LOGIN_REDIRECT_URI!
export const PORT = Number.parseInt(process.env.PORT || '3000')
export const DATABASE_URI = process.env.DATABASE_URI!
export const MODE = (process.argv[2] || process.env.MODE || 'server') as 'server' | 'worker'
export const RUN_INTERVAL = Number.parseInt(process.env.RUN_INTERVAL || (1000 * 60 * 60).toString())
export const TIME_BETWEEN_SNAPSHOTS = Number.parseInt(
  process.env.TIME_BETWEEN_SNAPSHOTS || (1000 * 60 * 60 * 24).toString(),
)

if (!CLIENT_ID) {
  console.warn('CLIENT_ID not set')
}
if (!CLIENT_SECRET) {
  console.warn('CLIENT_SECRET not set')
}
if (!REDIRECT_URI) {
  console.warn('REDIRECT_URI not set')
}
if (!DATABASE_URI) {
  console.warn('DATABASE_URI not set')
}
