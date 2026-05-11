import type { NewsCategory } from "./types";

/**
 * Regex-based categorisation. First-pass — Phase 4 replaces with an LLM
 * categoriser. Rules are deliberately conservative (false-negative >
 * false-positive); the corpus-wide tag is the contract, not a model.
 *
 * Order matters: more specific patterns come first so an "acquired and
 * rebranded" article lands as acquisition, not rebranding.
 */

interface Rule {
  category: NewsCategory;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    category: "distress",
    patterns: [
      /\b(default|distress(?:ed)?|foreclos(?:e|ure)|receivership|administration|bankrupt|chapter 11|insolven[ct][ey])\b/i,
      /\b(concurso de acreedores|preconcurso|moros[oa]|impago|quiebra)\b/i,
    ],
  },
  {
    category: "refinancing",
    patterns: [
      /\b(refinanc(?:e|ing|ed)|recapitali[sz]ation|loan extension|mezzanine|cmbs|senior loan|debt restructure)\b/i,
      /\b(refinanciaci[óo]n|prestamo|crédito sindicado|deuda)\b/i,
    ],
  },
  {
    category: "joint_venture",
    patterns: [
      /\b(joint venture|jv|equity partnership|co-invest(?:ment|or))\b/i,
      /\b(empresa conjunta|coinversi[óo]n)\b/i,
    ],
  },
  {
    category: "acquisition",
    patterns: [
      /\b(acquir(?:e|es|ed|ing)|takeover|buy(?:s|out)|purchas(?:e|es|ed))\b.{0,40}\b(hotel|property|portfolio|asset)/i,
      /\b(compra|adquisici[óo]n|adquiere|adquirido)\b/i,
    ],
  },
  {
    category: "sale",
    patterns: [
      /\b(sells|sold|sale|divest|disposal|exits)\b.{0,40}\b(hotel|property|portfolio|asset)/i,
      /\b(vende|venta|desinversi[óo]n)\b/i,
    ],
  },
  {
    category: "branded_residences",
    patterns: [
      /\bbranded residences?\b/i,
      /\b(residencias de marca)\b/i,
    ],
  },
  {
    category: "flex_living",
    patterns: [
      /\b(flex[\s-]?living|serviced apartments|co-?living|long[\s-]?stay|extended[\s-]?stay)\b/i,
      /\b(vivienda flexible|coliving)\b/i,
    ],
  },
  {
    category: "rebranding",
    patterns: [
      /\b(rebrand(?:ed|ing)?|re-?flag(?:ged|ging)?|conversion|joins .{0,20}brand)\b/i,
      /\b(rebranding|cambio de marca|nueva marca)\b/i,
    ],
  },
  {
    category: "operator_change",
    patterns: [
      /\b(new operator|management agreement|new management|operator change|takes over operations)\b/i,
      /\b(cambio de operador|nuevo operador|contrato de gesti[óo]n)\b/i,
    ],
  },
  {
    category: "development",
    patterns: [
      /\b(new (?:hotel|build|development)|breaking ground|construction begins|under construction|new build|groundbreaking)\b/i,
      /\b(nueva apertura|construcci[óo]n|nuevo hotel|desarrollo hotelero)\b/i,
    ],
  },
  {
    category: "pipeline_announcement",
    patterns: [
      /\b(pipeline|to open|will open|plans to|signs deal|signs management|expansion plan|expanding to|set to open|coming (?:in|to))\b/i,
      /\b(abrir[áa]|inaugurar[áa]|próxima apertura|firma acuerdo|expansi[óo]n)\b/i,
    ],
  },
  {
    category: "investment",
    patterns: [
      /\b(raises? \$\d|fund(?:raise|raising)|capital commitment|invests? in|secures? funding)\b/i,
      /\b(capta fondos|levanta capital|inversi[óo]n de)\b/i,
    ],
  },
];

export function categorise(
  title: string,
  body: string,
  _language: string,
): NewsCategory {
  const corpus = `${title} ${body}`;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(corpus))) return rule.category;
  }
  return "other";
}

/**
 * Lowercase, ascii-only tags. Keep narrow — too many tags pollute the
 * news_tags table without lifting search quality.
 */
const TAG_RULES: Array<[RegExp, string]> = [
  [/\bluxury\b|\blujo\b|\b5[\s-]?star\b/i, "luxury"],
  [/\bupper[\s-]?upscale\b/i, "upper-upscale"],
  [/\bmidscale\b/i, "midscale"],
  [/\bresort\b/i, "resort"],
  [/\bboutique\b/i, "boutique"],
  [/\btrophy[\s-]?asset\b/i, "trophy-asset"],
  [/\bopco\b|\bpropco\b/i, "opco-propco"],
  [/\bcap rate\b|\btasa de capitalizaci[óo]n\b/i, "cap-rate"],
  [/\bevaluation\b|\bvaloraci[óo]n\b/i, "valuation"],
  [/\bmadrid\b/i, "madrid"],
  [/\bbarcelona\b/i, "barcelona"],
  [/\bandaluc[íi]a\b|\bandalusia\b/i, "andalucia"],
  [/\bbalear(?:es|ic)\b|\bibiza\b|\bmallorca\b|\bmenorca\b/i, "baleares"],
  [/\bcanarias\b|\bcanary islands\b/i, "canarias"],
  [/\bcosta del sol\b/i, "costa-del-sol"],
  [/\bportugal\b|\blisbon\b|\blisboa\b/i, "portugal"],
  [/\bblackstone\b/i, "blackstone"],
  [/\bbrookfield\b/i, "brookfield"],
  [/\bkkr\b/i, "kkr"],
  [/\bmarriott\b/i, "marriott"],
  [/\bhyatt\b/i, "hyatt"],
  [/\bhilton\b/i, "hilton"],
  [/\baccor\b/i, "accor"],
  [/\bmeli[áa]\b/i, "melia"],
];

export function extractTags(title: string, body: string): string[] {
  const corpus = `${title} ${body}`;
  const out = new Set<string>();
  for (const [pattern, tag] of TAG_RULES) {
    if (pattern.test(corpus)) out.add(tag);
  }
  return Array.from(out);
}
