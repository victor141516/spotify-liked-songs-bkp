import { QueryResult } from 'pg'
import * as db from '../database'
import { fillWithDefaults } from './config'

// TODO: refactor the name from Credentials to User

export class UserError {
  constructor(public message: string) {}
}
export class CannotGetUserError extends UserError {}

export interface Credentials {
  access_token: string
  refresh_token: string
  config?: Record<string, unknown>
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

export const remove = async ({
  id,
  userId,
}: { userId: string; id?: undefined } | { userId?: undefined; id: number }) => {
  if (id) return await db.query('DELETE FROM credentials WHERE id = $1', [id])
  if (userId) return await db.query('DELETE FROM credentials WHERE user_id = $1', [userId])
}

export const get = async ({ id, userId }: { userId: string; id?: undefined } | { userId?: undefined; id: number }) => {
  let result: QueryResult | null = null
  try {
    if (id) result = await db.query('SELECT * FROM credentials WHERE id = $1', [id])
    if (userId) result = await db.query('SELECT * FROM credentials WHERE user_ud = $1', [userId])
  } catch (error) {
    throw new CannotGetUserError(error?.toString() || 'unknown_error')
  }
  if (!result || result.rows.length === 0) throw new CannotGetUserError('no_user_found')

  return { ...result.rows[0], config: fillWithDefaults(result.rows[0].config) } as Credentials
}
