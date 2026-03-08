import type { Database } from "bun:sqlite"

export interface Gate {
  id: string
  pipeline_id: string
  gate_name: string
  status: "pending" | "approved" | "denied" | "timeout"
  requested_at: number
  resolved_at: number | null
  resolved_by: string | null
}

export function createGate(db: Database, pipelineId: string, gateName: string): Gate {
  const gate: Gate = {
    id: crypto.randomUUID(),
    pipeline_id: pipelineId,
    gate_name: gateName,
    status: "pending",
    requested_at: Date.now(),
    resolved_at: null,
    resolved_by: null,
  }

  db.prepare(
    `INSERT INTO gates (
      id,
      pipeline_id,
      gate_name,
      status,
      requested_at,
      resolved_at,
      resolved_by
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).run(
    gate.id,
    gate.pipeline_id,
    gate.gate_name,
    gate.status,
    gate.requested_at,
    gate.resolved_at,
    gate.resolved_by,
  )

  return gate
}

export function getGate(db: Database, gateId: string): Gate | null {
  return db.query<Gate, [string]>("SELECT * FROM gates WHERE id = ?1").get(gateId)
}

export function resolveGate(
  db: Database,
  gateId: string,
  status: "approved" | "denied" | "timeout",
  resolvedBy: string,
): void {
  db.prepare(
    `UPDATE gates
      SET status = ?2,
          resolved_at = ?3,
          resolved_by = ?4
      WHERE id = ?1`,
  ).run(gateId, status, Date.now(), resolvedBy)
}

export function getGatesForPipeline(db: Database, pipelineId: string): Gate[] {
  return db
    .query<Gate, [string]>(
      `SELECT * FROM gates
        WHERE pipeline_id = ?1
        ORDER BY requested_at ASC, id ASC`,
    )
    .all(pipelineId)
}

export function getPendingGate(db: Database, pipelineId: string, gateName: string): Gate | null {
  return db
    .query<Gate, [string, string]>(
      `SELECT * FROM gates
        WHERE pipeline_id = ?1
          AND gate_name = ?2
          AND status = 'pending'
        ORDER BY requested_at DESC, id DESC`,
    )
    .get(pipelineId, gateName)
}
