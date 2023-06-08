import * as Sentry from '@sentry/node'

let initialized = false

export const init = ({ dsn }: { dsn: string }) => {
  if (initialized) return
  Sentry.init({ dsn, tracesSampleRate: 1.0, debug: true })
  initialized = true
}

export const captureException = (error: Error) => {
  if (!initialized) {
    console.warn('Sentry not initialized')
    return
  }
  Sentry.captureException(error)
}

export const captureMessage = (message: string) => {
  if (!initialized) {
    console.warn('Sentry not initialized')
    return
  }
  Sentry.captureMessage(message)
}
