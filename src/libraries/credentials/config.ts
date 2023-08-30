export interface UserConfig {
  defaultPlaylistSyncInterval: number
}

export const DEFAULT_CONFIG: UserConfig = {
  defaultPlaylistSyncInterval: 30, // minutes
}

const trimConfig = (config: Record<string, unknown>): Partial<UserConfig> => {
  const sourceCopy = Object.assign({}, config)
  Object.keys(DEFAULT_CONFIG).forEach((key) => {
    if (!(key in sourceCopy)) {
      delete sourceCopy[key]
    }
  })
  if (sourceCopy.defaultPlaylistSyncInterval && typeof sourceCopy.defaultPlaylistSyncInterval === 'number') {
    sourceCopy.defaultPlaylistSyncInterval = Math.max(
      DEFAULT_CONFIG.defaultPlaylistSyncInterval,
      sourceCopy.defaultPlaylistSyncInterval,
    )
  }
  return sourceCopy
}

export const sanitize = (config: UserConfig | Record<string, unknown> | undefined): UserConfig =>
  Object.assign({}, DEFAULT_CONFIG, trimConfig((config ?? {}) as Record<string, unknown>))
