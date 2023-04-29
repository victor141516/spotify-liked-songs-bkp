export interface UserConfig {
  snapshotInterval: number
  snapshotIntervalEnabled: boolean
  defaultPlaylistSyncInterval: number
}

export const DEFAULT_CONFIG: UserConfig = {
  snapshotInterval: 1, // days
  snapshotIntervalEnabled: true,
  defaultPlaylistSyncInterval: 10, // minutes
}

const trimConfig = (config: Record<string, unknown>): Partial<UserConfig> => {
  const sourceCopy = Object.assign({}, config)
  Object.keys(DEFAULT_CONFIG).forEach((key) => {
    if (!(key in sourceCopy)) {
      delete sourceCopy[key]
    }
  })
  if (sourceCopy.snapshotInterval && typeof sourceCopy.snapshotInterval === 'number') {
    sourceCopy.snapshotInterval = Math.max(DEFAULT_CONFIG.snapshotInterval, sourceCopy.snapshotInterval)
  }
  if (sourceCopy.defaultPlaylistSyncInterval && typeof sourceCopy.defaultPlaylistSyncInterval === 'number') {
    sourceCopy.defaultPlaylistSyncInterval = Math.max(
      DEFAULT_CONFIG.defaultPlaylistSyncInterval,
      sourceCopy.defaultPlaylistSyncInterval,
    )
  }
  return sourceCopy
}

// TODO: rename this function and maybe merge it with trimConfig
export const fillWithDefaults = (config: UserConfig | Record<string, unknown> | undefined): UserConfig =>
  Object.assign({}, DEFAULT_CONFIG, trimConfig((config ?? {}) as Record<string, unknown>))
