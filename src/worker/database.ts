import { QueryResult } from 'pg'
import { ErrorRun, RunType } from '.'
import { Credentials } from '../libraries/credentials'
import { DEFAULT_CONFIG } from '../libraries/credentials/config'
import * as db from '../libraries/database'

export const saveRun = async (credentialsId: number, runType: RunType | ErrorRun) => {
  await db.query('INSERT INTO runs (credentials_id, type) VALUES ($1, $2)', [credentialsId, runType])
}

export async function getNewRuns() {
  const query: Promise<QueryResult> = db.query(`
    SELECT
        *
      FROM
        credentials
      WHERE
        id NOT IN(
          SELECT
            credentials.id FROM runs
            JOIN credentials ON runs.credentials_id = credentials.id
          WHERE (runs.type = 'defaultPlaylistSync'
            AND date > NOW() - INTERVAL '1 minute' * COALESCE((credentials.config ->> 'defaultPlaylistSyncInterval')::int4, ${DEFAULT_CONFIG.defaultPlaylistSyncInterval}))
          OR runs.type = 'error' OR runs.type = 'revokedCredentials'
        );`)

  const { rows } = await query
  return rows as Array<Credentials & { id: number }>
}

export async function getCredentials({ id }: { id: string }) {
  return (await db.query('SELECT * FROM credentials WHERE id = $1', [id])).rows[0] as {
    access_token: string
    refresh_token: string
  }
}
