import {
  APP_REDIRECT_URI,
  CLIENT_ID,
  CLIENT_SECRET,
  DATABASE_URI,
  MODE,
  PORT,
  RUN_INTERVAL,
  SENTRY_DSN,
  SESSION_SECRET,
  SPOTIFY_API_AUTH_REDIRECT_URI,
  SPOTIFY_API_REVOKE_REDIRECT_URI,
} from './libraries/config'
import * as db from './libraries/database'
import { init as initErrorHandling } from './libraries/errors'
import * as server from './server'
import * as worker from './worker'

const stopHandlers: Array<() => void> = []

const main = async () => {
  SENTRY_DSN && initErrorHandling({ dsn: SENTRY_DSN })
  db.setUri(DATABASE_URI)
  await db.connect()
  stopHandlers.push(() => db.getClient().end())
  stopHandlers.push(() => db.disconnect())

  if (MODE === 'worker') {
    worker.setupSpotifyApi(CLIENT_ID, CLIENT_SECRET)
    stopHandlers.push(worker.startSnapshotWorker(RUN_INTERVAL))
    stopHandlers.push(worker.startDefaultPlaylistSyncWorker(RUN_INTERVAL))
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
  stopHandlers.forEach((stopHandler) => stopHandler())
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
