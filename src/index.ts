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
  SINGLE_SYNC_USER_ID,
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
  stopHandlers.push(() => db.disconnect())

  if (MODE === 'worker') {
    worker.setupSpotifyApi(CLIENT_ID, CLIENT_SECRET)
    const syncWorker = worker.startDefaultPlaylistSyncWorker(RUN_INTERVAL)
    stopHandlers.push(syncWorker.stop)
    stopHandlers.push(async () => await syncWorker.promise)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await new Promise(() => {})
  } else if (MODE === 'server') {
    const stopServer = server.start(
      CLIENT_ID,
      CLIENT_SECRET,
      PORT,
      SPOTIFY_API_AUTH_REDIRECT_URI,
      SPOTIFY_API_REVOKE_REDIRECT_URI,
      APP_REDIRECT_URI,
      SESSION_SECRET,
    )
    stopHandlers.push(stopServer)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await new Promise(() => {})
  } else {
    worker.setupSpotifyApi(CLIENT_ID, CLIENT_SECRET)
    if (SINGLE_SYNC_USER_ID) {
      await worker.singleSyncJob(SINGLE_SYNC_USER_ID)
    } else {
      console.error('When running in single-sync mode, you must provide a user id as the second argument')
    }
  }
}

const onExit = async () => {
  console.log('Bye!')
  return Promise.all(
    stopHandlers.map(async (stopHandler) => {
      await stopHandler()
    }),
  ).then(() => process.exit())
}

let exiting = false
;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
  process.on(signal, async () => {
    if (exiting) return
    exiting = true
    await onExit()
  }),
)

main()
  .then(() => {
    console.log('Ended successfully')
  })
  .catch((error) => {
    console.error('Uncaught error', error)
  })
  .finally(async () => {
    await onExit()
  })
