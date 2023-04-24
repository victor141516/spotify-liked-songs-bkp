import { QueryResult } from 'pg'
import { RunType } from '.'
import { Credentials } from '../libraries/credentials'
import { DEFAULT_CONFIG } from '../libraries/credentials/config'
import * as db from '../libraries/database'

export const saveRun = async (credentialsId: number, runType: RunType) => {
  await db.query('INSERT INTO runs (credentials_id, type) VALUES ($1, $2)', [credentialsId, runType])
}

export async function* getNewRuns(runType: RunType) {
  let query: Promise<QueryResult> | null = null

  if (runType === 'snapshot') {
    // TODO: this is returning users that have disabled snapshots
    query = db.query(`
    SELECT
        *
      FROM
        credentials
      WHERE
        COALESCE((credentials.config ->> 'snapshotIntervalEnabled')::boolean, ${DEFAULT_CONFIG.snapshotIntervalEnabled})
        AND id NOT IN(
          SELECT
            credentials.id FROM runs
          FULL JOIN credentials ON runs.credentials_id = credentials.id
        WHERE
          runs.type = 'snapshot'
          AND date > NOW() - INTERVAL '1 day' * COALESCE((credentials.config ->> 'snapshotInterval')::int4, ${DEFAULT_CONFIG.snapshotInterval})
        GROUP BY
          credentials.id
        );`)
  } else {
    query = db.query(`
    SELECT
        *
      FROM
        credentials
      WHERE
        id NOT IN(
          SELECT
            credentials.id FROM runs
            JOIN credentials ON runs.credentials_id = credentials.id
          WHERE
            runs.type = 'defaultPlaylistSync'
            AND date > NOW() - INTERVAL '1 minute' * COALESCE((credentials.config ->> 'defaultPlaylistSyncInterval')::int4, ${DEFAULT_CONFIG.defaultPlaylistSyncInterval})
        );`)
  }
  const { rows } = await query
  // console.log(
  //   runType,
  //   rows.map((r) => r.id),
  // )
  // return
  for (const row of rows) {
    yield row as Credentials & { id: number }
  }
}
