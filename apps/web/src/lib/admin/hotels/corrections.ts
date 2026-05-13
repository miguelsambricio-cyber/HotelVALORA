"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/security/operator-guard";

/**
 * Operator-submitted corrections queue.
 *
 * The XLSX masters are append-only / supersede-only, so we cannot
 * mutate hotel rows in place from the web side. Instead the operator
 * submits a correction here, the action appends a JSONL row to
 * `services/costar/corrections/<YYYY-MM>.jsonl`, and the next
 * `ingest.py` run picks it up and applies it as a supersede.
 *
 * Until the Phase-3 mutation layer lands, the consumer in the Python
 * pipeline is a stub — corrections accumulate in the JSONL files and
 * the operator can audit them locally. The shape below is fixed so the
 * Python side can start consuming them whenever it's ready.
 */

export interface CorrectionRequest {
  hotel_id: string;
  field: string;
  current_value: string | number | null;
  proposed_value: string | number | null;
  reason: string;
}

export interface CorrectionResult {
  ok: boolean;
  queued_at?: string;
  error?: string;
}

const REPO_ROOT_FROM_WEB = path.resolve(process.cwd(), "..", "..");
const CORRECTIONS_DIR = path.join(REPO_ROOT_FROM_WEB, "services", "costar", "corrections");

export async function submitHotelCorrection(
  req: CorrectionRequest,
): Promise<CorrectionResult> {
  const operator = await requireOperator();
  if (!req.hotel_id || !req.field) {
    return { ok: false, error: "hotel_id + field required" };
  }
  if (!req.reason || req.reason.trim().length < 8) {
    return { ok: false, error: "reason must be at least 8 characters" };
  }

  const now = new Date();
  const entry = {
    correction_id: `corr_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    submitted_at: now.toISOString(),
    submitted_by: operator.email ?? operator.userId ?? "unknown",
    hotel_id: req.hotel_id,
    field: req.field,
    current_value: req.current_value,
    proposed_value: req.proposed_value,
    reason: req.reason.trim(),
    status: "pending" as const,
  };

  try {
    await fs.mkdir(CORRECTIONS_DIR, { recursive: true });
    const ymonth = now.toISOString().slice(0, 7); // YYYY-MM
    const filename = path.join(CORRECTIONS_DIR, `${ymonth}.jsonl`);
    await fs.appendFile(filename, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidatePath("/user/admin/hotels");
  revalidatePath(`/user/admin/hotels/${req.hotel_id}`);
  return { ok: true, queued_at: entry.submitted_at };
}
