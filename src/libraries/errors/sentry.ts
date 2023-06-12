import * as Sentry from '@sentry/node'

let initialized = false

export const init = ({ dsn }: { dsn: string }) => {
  if (initialized) return
  Sentry.init({ dsn, tracesSampleRate: 1.0, debug: true })
  initialized = true
}

export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (!initialized) {
    return console.warn('Sentry not initialized')
  }
  Sentry.captureException(error, context)
}

export const captureMessage = (message: string) => {
  if (!initialized) {
    return console.warn('Sentry not initialized')
  }
  Sentry.captureMessage(message)
}

export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  if (!initialized) {
    return console.warn('Sentry not initialized')
  }
  Sentry.addBreadcrumb(breadcrumb)
}
