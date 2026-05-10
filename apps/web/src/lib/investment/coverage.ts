// Geographic coverage tree — markets the platform actively analyses.
//
// v1: hand-curated mock matching the Stitch reference (Spain expanded
// with Madrid + Barcelona; Italy with Rome + Milan).
// v2: hydrate from a CoStar / market-coverage service so this list
// reflects which markets actually have data flowing through the pipeline.

import type { CoverageNode } from "./types";

export const COVERAGE_TREE: CoverageNode[] = [
  {
    id: "es",
    label: "Spain",
    flag: "🇪🇸",
    children: [
      {
        id: "es-madrid",
        label: "Madrid",
        children: [
          { id: "es-madrid-salamanca", label: "Salamanca" },
          { id: "es-madrid-centro", label: "Madrid Centro" },
          { id: "es-madrid-retiro", label: "Retiro" },
        ],
      },
      {
        id: "es-barcelona",
        label: "Barcelona",
        children: [
          { id: "es-bcn-eixample", label: "Eixample" },
          { id: "es-bcn-ciutat-vella", label: "Ciutat Vella" },
        ],
      },
    ],
  },
  {
    id: "it",
    label: "Italy",
    flag: "🇮🇹",
    children: [
      { id: "it-rome", label: "Rome" },
      { id: "it-milan", label: "Milan" },
    ],
  },
];
