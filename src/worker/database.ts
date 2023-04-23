import { Credentials } from '../libraries/credentials'
import { DEFAULT_CONFIG } from '../libraries/credentials/config'
import * as db from '../libraries/database'

export const saveRun = async (credentialsId: number) => {
  await db.query('INSERT INTO runs (credentials_id) VALUES ($1)', [credentialsId])
}

export async function* getNewRuns() {
  const { rows } = await db.query(
    `SELECT
    credentials_id
  FROM
    runs
    JOIN credentials ON runs.credentials_id = credentials.id
  WHERE
    date > NOW() - INTERVAL '1 day' * COALESCE((credentials.config ->> 'snapshotInterval')::int4, ${DEFAULT_CONFIG.snapshotInterval});`,
  )
  for (const row of rows) {
    yield row as Credentials & { id: number }
  }
}
