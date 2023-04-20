import {
  APP_REDIRECT_URI,
  CLIENT_ID,
  CLIENT_SECRET,
  DATABASE_URI,
  MODE,
  PORT,
  SESSION_SECRET,
  SPOTIFY_API_AUTH_REDIRECT_URI,
  SPOTIFY_API_REVOKE_REDIRECT_URI,
} from './config'
import * as db from './database'
import * as server from './server'
import * as worker from './worker'

const main = async () => {
  db.setUri(DATABASE_URI)
  await db.connect()

  if (MODE === 'worker') {
    worker.setupSpotifyApi(CLIENT_ID, CLIENT_SECRET)
    worker.start()
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
