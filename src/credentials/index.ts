import * as db from '../database'

export interface Credentials {
  access_token: string
  refresh_token: string
}

export const save = async (credentials: Credentials, userId: string) => {
  const { access_token: accessToken, refresh_token: refreshToken } = credentials
  await db.query('INSERT INTO credentials (access_token, refresh_token, user_id) VALUES ($1, $2, $3)', [
    accessToken,
    refreshToken,
    userId,
  ])
}
