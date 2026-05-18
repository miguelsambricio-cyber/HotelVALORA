/**
 * Engine dependency graph.
 *
 * Declares the ordered modules + their input edges. The orchestrator
 * runs a topological sort and fails fast on:
 *   · missing node
 *   · cyclic dependency
 *   · module writing to a key not declared in the DAG
 *
 * Visualised (current Block 2 scaffold):
 *
 *   investment ──┬─ depreciation ──┐
 *                │                  ├─ pnl ──┬─ dta ──────┐
 *                └─ financing ──────┘         │            ├─ cash_flow ─┬─ balance_sheet ─┬─ reconciliation
 *                                             └─ exit ─────┘             └─ exit ─────────┘
 *
 * (cap_rate is independent · evaluated first · feeds investment + exit.)
 */

import type { ComputedKey } from "./_types";

export interface DagNode {
  key: ComputedKey;
  dependsOn: ComputedKey[];
}

/**
 * ORDER MATTERS for tie-breaking when multiple nodes are topologically
 * equivalent · we want pnl before dta before cash_flow for readability
 * of engine traces.
 */
export const ENGINE_DAG: DagNode[] = [
  { key: "cap_rate", dependsOn: [] },
  { key: "investment", dependsOn: ["cap_rate"] },
  { key: "financing", dependsOn: ["investment"] },
  { key: "pnl", dependsOn: ["investment", "financing"] },
  { key: "dta", dependsOn: ["pnl"] },
  { key: "exit", dependsOn: ["cap_rate", "pnl", "financing"] },
  { key: "cash_flow", dependsOn: ["pnl", "financing", "dta", "investment", "exit"] },
  { key: "balance_sheet", dependsOn: ["pnl", "financing", "dta", "cash_flow", "investment"] },
  { key: "reconciliation", dependsOn: ["balance_sheet", "cash_flow", "financing"] },
];

/** Build a Kahn's-algorithm execution order · throws on cycle. */
export function topologicalOrder(dag: DagNode[]): ComputedKey[] {
  const inDegree = new Map<ComputedKey, number>();
  const adj = new Map<ComputedKey, ComputedKey[]>();
  const declared = new Set<ComputedKey>();

  for (const node of dag) {
    declared.add(node.key);
    inDegree.set(node.key, node.dependsOn.length);
    for (const dep of node.dependsOn) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(node.key);
    }
  }

  for (const node of dag) {
    for (const dep of node.dependsOn) {
      if (!declared.has(dep)) {
        throw new Error(`ENGINE_DAG · ${node.key} depends on undeclared node "${dep}"`);
      }
    }
  }

  const ready: ComputedKey[] = [];
  for (const [k, v] of inDegree) if (v === 0) ready.push(k);
  const order: ComputedKey[] = [];

  while (ready.length) {
    const next = ready.shift()!;
    order.push(next);
    for (const child of adj.get(next) ?? []) {
      const remaining = inDegree.get(child)! - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) ready.push(child);
    }
  }

  if (order.length !== dag.length) {
    throw new Error("ENGINE_DAG · cyclic dependency detected");
  }
  return order;
}
