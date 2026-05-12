/**
 * Institutional relevance classifier · deterministic, regex-only.
 *
 * HotelVALORA is investment-grade hospitality intelligence — not a
 * general news reader. Every ingested article is tagged with one of
 * three relevance tiers so the operator-facing drawer surfaces
 * deal-flow / financing / development signal by default and
 * de-emphasises generic media noise.
 *
 *   priority    — institutional deal-flow & capital activity
 *                 (M&A, JV, financing, REIT/SOCIMI, leases,
 *                  development pipeline, operator agreements,
 *                  conversions, asset repositioning)
 *   operational — performance metrics & demand signals
 *                 (ADR / RevPAR / occupancy / tourism demand)
 *   noise       — non-investment signal — hide from default views
 *                 (events, conferences, awards, opinion pieces,
 *                  marketing/PR, lifestyle/travel inspiration,
 *                  generic AI articles)
 *
 * Ranking order: priority beats operational beats noise. Articles
 * with no positive match default to OPERATIONAL — this is the safe
 * fallback (hiding by default risks losing genuine deal signal that
 * our patterns happen to miss).
 *
 * No external module · pure regex on (title + summary + body)
 * lower-cased corpus. Deterministic, auditable, free to run at scale.
 *
 * LLM-based classification is intentionally NOT used here — that
 * lands as an AI Ops enrichment layer once the regex tier baseline
 * is institutionalised.
 */

export type RelevanceTier = "priority" | "operational" | "noise";

export const RELEVANCE_TIER_LABEL: Record<RelevanceTier, string> = {
  priority: "Priority",
  operational: "Operational",
  noise: "Noise",
};

interface SignalRule {
  kind: "priority" | "operational" | "noise";
  /** Operator-facing label · attached to the audit blob for forensics. */
  signal: string;
  patterns: RegExp[];
}

// ────────────────────────────────────────────────────────────────────────────
// PRIORITY · institutional deal-flow signal
// Order: most specific / hardest to match first so we capture the
// strongest signal label rather than falling through to a weaker one.
// ────────────────────────────────────────────────────────────────────────────

const PRIORITY_RULES: SignalRule[] = [
  {
    kind: "priority",
    signal: "socimi_reit",
    patterns: [
      /\b(socimi|reit|listed property|inmobiliaria cotizada)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "refinancing_debt",
    patterns: [
      /\b(refinanc(?:e|ing|ed)|recapitali[sz]ation|loan extension|mezzanine|cmbs|senior loan|debt restructure|bond issu(?:e|ance)|credit facility|secured? loan)\b/i,
      /\b(refinanciaci[óo]n|crédito sindicado|deuda|bono emisi[óo]n|hipoteca|línea de crédito|préstamo)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "investment_fund",
    patterns: [
      /\b(private equity|asset manager|fund(?:s|raise|raising)?|sovereign wealth|family office|institutional investor|capital commitment|raises? (?:€|\$|£|eur)?\s*\d+)\b/i,
      /\b(fondo de inversi[óo]n|gestora|fondo soberano|family office|inversor institucional|levanta capital|capta fondos)\b/i,
      // Strong fund-name signals — institutional buyers/sellers that
      // make ANY article about them deal-relevant.
      /\b(blackstone|brookfield|kkr|cerberus|starwood capital|apollo|carlyle|gic|kohlberg|tristan capital|hines|invesco|pgim|aermont|orion capital|stoneweg|atom hoteles|hispania|millenium|azora|edyn|hipotels|barceló|n[\s-]?capital|stoneweg)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "acquisition_sale",
    patterns: [
      /\b(acquir(?:e|es|ed|ing|ition)|take[\s-]?over|buy(?:s|out|er|ers)|purchas(?:e|es|ed)|sale|sold|sells|divest|disposal|exits?)\b.{0,80}\b(hotel|property|portfolio|asset|building|complex|resort)/i,
      /\b(compra|adquisici[óo]n|adquiere|adquirido|adquiriendo|vende|venta|venden|desinversi[óo]n|enajenaci[óo]n|cede|cedió|ceder)\b/i,
      // Strong financial signal — price tag in body OR title
      /\b€\s*\d+\s*(M|m|millones|million|bn|billion)\b/,
      /\b(deal|operation|transaction)\b.{0,30}\b(?:€|EUR|US\$|\$|£)\s*\d/i,
      /\b(operaci[óo]n|transacci[óo]n)\b.{0,40}\b(?:€|EUR|millones|millón)/i,
    ],
  },
  {
    kind: "priority",
    signal: "joint_venture_partnership",
    patterns: [
      /\b(joint venture|jv|equity partnership|co-invest(?:ment|or)|strategic partnership|memorandum of understanding|mou)\b/i,
      /\b(empresa conjunta|alianza estrat[ée]gica|coinversi[óo]n|acuerdo estrat[ée]gico|sociedad conjunta)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "operator_agreement",
    patterns: [
      /\b(management agreement|operator agreement|franchise agreement|hma|hotel management|takes over operations?|new operator|operator change|brand affiliation)\b/i,
      /\b(contrato de gesti[óo]n|nuevo operador|cambio de operador|gestor[áa] el hotel|asume la gesti[óo]n)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "lease_agreement",
    patterns: [
      /\b(lease|leasing|leases|leased|sale[\s-]?and[\s-]?leaseback|long[\s-]?term lease|ground lease)\b/i,
      /\b(arrendamiento|contrato de alquiler|alquiler de hotel|cesi[óo]n de uso|sale[\s-]?and[\s-]?leaseback)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "development",
    patterns: [
      /\b(new (?:hotel|build|development|property)|breaking ground|construction begins|under construction|new[\s-]?build|groundbreaking|develops? .{0,30}\b(?:hotel|resort)|construction of)\b/i,
      /\b(nueva apertura|construcci[óo]n|nuevo hotel|desarrollo hotelero|levantar[áa] un hotel|inicio de obras)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "pipeline_expansion",
    patterns: [
      /\b(pipeline|to open|will open|plans to open|signs deal|signs management agreement|expansion plan|expanding to|set to open|opens .{0,15}\b(?:201|202)\d|debuts? in .{0,30}\b201|coming (?:in|to))\b/i,
      /\b(abrir[áa]|inaugurar[áa]|próxima apertura|firma acuerdo|firma contrato|plan de expansi[óo]n|expandir[áa]|nueva incorporaci[óo]n)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "conversion_repositioning",
    patterns: [
      /\b(conversion|convert .{0,20}\b(?:hotel|property)|reposition|repositioning|rebrand(?:ed|ing|s)?|re[\s-]?flag(?:ged|ging)?|refurbish(?:ed|ment|ing)?|renovation|capex|joins .{0,20}\b(?:brand|portfolio|chain))\b/i,
      /\b(reposicionamiento|rebranding|cambio de marca|nueva marca|reconvertir|reforma|reformar|renovaci[óo]n|inversi[óo]n en .{0,20}\b(?:reforma|capex))\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "branded_residences",
    patterns: [
      /\bbranded residences?\b/i,
      /\b(residencias de marca)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "flex_living",
    patterns: [
      /\b(flex[\s-]?living|serviced apartments|co[\s-]?living|long[\s-]?stay|extended[\s-]?stay)\b/i,
      /\b(vivienda flexible|coliving|apartamentos con servicios)\b/i,
    ],
  },
  {
    kind: "priority",
    signal: "distress",
    patterns: [
      /\b(default|distress(?:ed)?|foreclos(?:e|ure)|receivership|administration|bankrupt(?:cy)?|chapter 11|insolven(?:t|cy))\b/i,
      /\b(concurso de acreedores|preconcurso|moros[oa]|impago|quiebra|insolvencia)\b/i,
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// OPERATIONAL · performance metrics & demand
// ────────────────────────────────────────────────────────────────────────────

const OPERATIONAL_RULES: SignalRule[] = [
  {
    kind: "operational",
    signal: "performance_metric",
    patterns: [
      /\b(adr|revpar|trevpar|goppar|gop[\s/]?par|occupancy|occ\.?|average daily rate|booking pace|demand index|str global|hotstats)\b/i,
      /\b(ocupaci[óo]n|tarifa media|ingresos por habitaci[óo]n|RevPAR|ADR|GOPPAR|índice de demanda)\b/i,
    ],
  },
  {
    kind: "operational",
    signal: "tourism_demand",
    patterns: [
      /\b(tourist arrivals|tourism demand|international arrivals|inbound tourism|forward bookings|booking window|stay length|seasonality)\b/i,
      /\b(llegadas tur[íi]sticas|turismo nacional|turismo internacional|reservas anticipadas|ventana de reserva|demanda tur[íi]stica|estancia media)\b/i,
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// NOISE · de-emphasise / hide from default views
// ────────────────────────────────────────────────────────────────────────────

const NOISE_RULES: SignalRule[] = [
  {
    kind: "noise",
    signal: "event_conference",
    patterns: [
      /\b(conference|congress|summit|trade fair|exhibition|symposium|fitur|ihif|wtm|itb)\b/i,
      /\b(congreso|simposio|encuentro|feria|sal[óo]n|exposici[óo]n|jornada)\b/i,
    ],
  },
  {
    kind: "noise",
    signal: "awards",
    patterns: [
      /\b(award(?:s|ed|ing)?|prize|winners?|recogniz(?:es?|ed|ing)?|finalist|nominated|shortlist|gala|distinction)\b/i,
      /\b(premio|premios|galardonad[oa]s?|reconocimiento|finalista|distinguid[oa]|distinci[óo]n)\b/i,
    ],
  },
  {
    kind: "noise",
    signal: "opinion_editorial",
    patterns: [
      /\b(opinion|editorial|column(?:ist|na)?|commentary|point of view|op[\s-]?ed)\b/i,
      /\b(opini[óo]n|punto de vista|comentario|tribuna|columna)\b/i,
    ],
  },
  {
    kind: "noise",
    signal: "lifestyle_travel",
    patterns: [
      /\b(top \d+ best|best of (?:the )?(?:year|season|month)|escapada|getaway|wanderlust|travel inspiration|hidden gem|bucket list|relaxing|wellness retreat|spa weekend|romantic getaway)\b/i,
      /\b(escapadas|inspiraci[óo]n para viajar|destinos rom[áa]nticos|fin de semana de spa|joya escondida)\b/i,
    ],
  },
  {
    kind: "noise",
    signal: "marketing_pr",
    patterns: [
      /\b(launches? .{0,30}\b(?:campaign|loyalty|programme|program)|unveils? new (?:campaign|loyalty)|debuts? (?:new )?campaign|introduces? loyalty)\b/i,
      /\b(lanza .{0,30}\b(?:campaña|programa de fidelizaci[óo]n)|nueva campaña|programa de fidelizaci[óo]n)\b/i,
    ],
  },
  {
    kind: "noise",
    signal: "generic_ai",
    patterns: [
      // Generic AI / ChatGPT articles · only flag when there's no
      // counter-signal in the article (handled by priority-first ranking).
      /\b(artificial intelligence|chatgpt|generative ai|llm|machine learning hype|ai revolution|ai transformation)\b/i,
      /\b(inteligencia artificial|chatgpt|IA generativa|revoluci[óo]n de la IA)\b/i,
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Classifier surface
// ────────────────────────────────────────────────────────────────────────────

export interface RelevanceClassification {
  tier: RelevanceTier;
  /** Matching signal label · null when none matched (defaulted to operational). */
  signal: string | null;
}

/**
 * Classify an article's institutional relevance.
 *
 * Resolution order (highest signal wins · never downgraded):
 *   1. PRIORITY pattern hits → priority
 *   2. OPERATIONAL pattern hits → operational
 *   3. NOISE pattern hits → noise
 *   4. No hits → default to OPERATIONAL (safer than hiding)
 */
export function classifyRelevance(
  title: string,
  body: string | null | undefined,
  summary?: string | null,
): RelevanceClassification {
  const corpus = `${title ?? ""} ${summary ?? ""} ${body ?? ""}`.trim();
  if (!corpus) return { tier: "operational", signal: null };

  // PRIORITY rules — first match wins so the strongest deal signal label sticks.
  for (const rule of PRIORITY_RULES) {
    if (rule.patterns.some((p) => p.test(corpus))) {
      return { tier: "priority", signal: rule.signal };
    }
  }

  // OPERATIONAL rules
  for (const rule of OPERATIONAL_RULES) {
    if (rule.patterns.some((p) => p.test(corpus))) {
      return { tier: "operational", signal: rule.signal };
    }
  }

  // NOISE rules
  for (const rule of NOISE_RULES) {
    if (rule.patterns.some((p) => p.test(corpus))) {
      return { tier: "noise", signal: rule.signal };
    }
  }

  return { tier: "operational", signal: null };
}
