import { QueryResult } from 'pg'
import { ErrorRun, RunType } from '.'
import { Credentials } from '../libraries/credentials'
import { DEFAULT_CONFIG } from '../libraries/credentials/config'
import * as db from '../libraries/database'

export const saveRun = async (credentialsId: number, runType: RunType | ErrorRun) => {
  await db.query('INSERT INTO runs (credentials_id, type) VALUES ($1, $2)', [credentialsId, runType])
}

export async function* getNewRuns() {
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
          OR runs.type = 'error'
        );`)

  const { rows } = await query
  for (const row of rows) {
    yield row as Credentials & { id: number }
  }
}
