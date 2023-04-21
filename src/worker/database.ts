import { Credentials } from '../libraries/credentials'
import * as db from '../libraries/database'

export const saveRun = async (credentialsId: number) => {
  await db.query('INSERT INTO runs (credentials_id) VALUES ($1)', [credentialsId])
}

export async function* getNewRuns(timeBetweenSnapshots: number) {
  const { rows } = await db.query(
    `SELECT
    *
  FROM
    credentials
  WHERE
    id NOT IN(
      SELECT
        credentials_id FROM runs
      WHERE
        date > NOW() - INTERVAL '${timeBetweenSnapshots} seconds')`,
  )
  for (const row of rows) {
    yield row as Credentials & { id: number }
  }
}
