export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isInstance = <T>(error: unknown, constructor: new (...args: any[]) => T): error is T =>
  error instanceof constructor
