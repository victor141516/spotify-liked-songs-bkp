import * as db from '../database'

export interface Credentials {
  access_token: string
  refresh_token: string
}

export const save = async (credentials: Credentials, userId: string) => {
  const { access_token: accessToken, refresh_token: refreshToken } = credentials

  return await db.query(
    `INSERT INTO credentials (access_token, refresh_token, user_id)
      VALUES($1, $2, $3) ON CONFLICT (user_id)
      DO
      UPDATE
      SET
        access_token = $1,
        refresh_token = $2`,
    [accessToken, refreshToken, userId],
  )
}

export const deleteCredentials = async ({
  id,
  userId,
}: { userId: string; id?: undefined } | { userId?: undefined; id: number }) => {
  if (id) return await db.query('DELETE FROM credentials WHERE id = $1', [id])
  if (userId) return await db.query('DELETE FROM credentials WHERE user_id = $1', [userId])
}
