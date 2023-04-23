export interface UserConfig {
  snapshotInterval: number
}

const DEFAULT_CONFIG: UserConfig = {
  snapshotInterval: 1,
}

export const fillWithDefaults = (config: Record<string, unknown>): UserConfig =>
  Object.assign({}, DEFAULT_CONFIG, config)
