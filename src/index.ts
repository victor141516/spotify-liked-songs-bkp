import {
  APP_REDIRECT_URI,
  CLIENT_ID,
  CLIENT_SECRET,
  DATABASE_URI,
  MODE,
  PORT,
  RUN_INTERVAL,
  SESSION_SECRET,
  SPOTIFY_API_AUTH_REDIRECT_URI,
  SPOTIFY_API_REVOKE_REDIRECT_URI,
  TIME_BETWEEN_SNAPSHOTS,
} from './libraries/config'
import * as db from './libraries/database'
import * as server from './server'
import * as worker from './worker'

// TODO: dont remove Credential if access_token fails to update, get user, etc.
const main = async () => {
  db.setUri(DATABASE_URI)
  await db.connect()

  if (MODE === 'worker') {
    worker.setupSpotifyApi(CLIENT_ID, CLIENT_SECRET)
    worker.start(RUN_INTERVAL, TIME_BETWEEN_SNAPSHOTS)
  } else {
    await server.start(
      CLIENT_ID,
      CLIENT_SECRET,
      PORT,
      SPOTIFY_API_AUTH_REDIRECT_URI,
      SPOTIFY_API_REVOKE_REDIRECT_URI,
      APP_REDIRECT_URI,
      SESSION_SECRET,
    )
  }
}

const onExit = async () => {
  console.log('Bye!')
  await db.disconnect()
}

;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
  process.on(signal, () => {
    onExit()
    process.exit()
  }),
)

main().catch(async (error) => {
  console.error('Uncaught error', error)
  await db.disconnect()
})
