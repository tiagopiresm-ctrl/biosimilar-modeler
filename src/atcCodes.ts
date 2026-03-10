// ============================================================
// ATC 3rd-Level Codes — Biosimilar-Relevant Classes
// ============================================================
// WHO Anatomical Therapeutic Chemical Classification, 3rd level
// Covers major therapeutic areas where biosimilars compete

export interface AtcCode {
  code: string;
  label: string;
}

export const ATC_CODES: AtcCode[] = [
  // ---- Antineoplastic agents ----
  { code: 'L01A', label: 'L01A — Alkylating agents' },
  { code: 'L01B', label: 'L01B — Antimetabolites' },
  { code: 'L01C', label: 'L01C — Plant alkaloids and other natural products' },
  { code: 'L01D', label: 'L01D — Cytotoxic antibiotics and related substances' },
  { code: 'L01E', label: 'L01E — Protein kinase inhibitors' },
  { code: 'L01F', label: 'L01F — Monoclonal antibodies (antineoplastic)' },
  { code: 'L01X', label: 'L01X — Other antineoplastic agents' },

  // ---- Immunostimulants & immunosuppressants ----
  { code: 'L03A', label: 'L03A — Immunostimulants' },
  { code: 'L04A', label: 'L04A — Immunosuppressants' },

  // ---- Endocrine therapy ----
  { code: 'L02A', label: 'L02A — Hormones and related agents' },
  { code: 'L02B', label: 'L02B — Hormone antagonists and related agents' },

  // ---- Blood and blood-forming organs ----
  { code: 'B01A', label: 'B01A — Antithrombotic agents' },
  { code: 'B02B', label: 'B02B — Vitamin K and other hemostatics' },
  { code: 'B03X', label: 'B03X — Other anti-anemic preparations' },
  { code: 'B05A', label: 'B05A — Blood and related products' },

  // ---- Alimentary tract ----
  { code: 'A02B', label: 'A02B — Drugs for peptic ulcer and GORD' },
  { code: 'A10A', label: 'A10A — Insulins and analogues' },
  { code: 'A10B', label: 'A10B — Blood glucose lowering drugs, excl. insulins' },
  { code: 'A16A', label: 'A16A — Other alimentary tract and metabolism products' },

  // ---- Cardiovascular system ----
  { code: 'C10A', label: 'C10A — Lipid modifying agents, plain' },

  // ---- Dermatologicals ----
  { code: 'D05B', label: 'D05B — Antipsoriatics for systemic use' },
  { code: 'D11A', label: 'D11A — Other dermatological preparations' },

  // ---- Genito-urinary system & sex hormones ----
  { code: 'G03G', label: 'G03G — Gonadotropins and other ovulation stimulants' },
  { code: 'G04B', label: 'G04B — Urologicals' },

  // ---- Systemic hormonal preparations ----
  { code: 'H01A', label: 'H01A — Anterior pituitary hormones and analogues' },
  { code: 'H01C', label: 'H01C — Hypothalamic hormones' },
  { code: 'H05A', label: 'H05A — Parathyroid hormones and analogues' },

  // ---- Anti-infectives for systemic use ----
  { code: 'J05A', label: 'J05A — Direct acting antivirals' },
  { code: 'J06B', label: 'J06B — Immunoglobulins' },
  { code: 'J07A', label: 'J07A — Bacterial vaccines' },
  { code: 'J07B', label: 'J07B — Viral vaccines' },

  // ---- Musculoskeletal system ----
  { code: 'M01A', label: 'M01A — Anti-inflammatory and antirheumatic products, non-steroids' },
  { code: 'M05B', label: 'M05B — Drugs affecting bone structure and mineralization' },
  { code: 'M09A', label: 'M09A — Other drugs for disorders of the musculoskeletal system' },

  // ---- Nervous system ----
  { code: 'N02A', label: 'N02A — Opioids' },
  { code: 'N03A', label: 'N03A — Antiepileptics' },
  { code: 'N04B', label: 'N04B — Dopaminergic agents' },
  { code: 'N06A', label: 'N06A — Antidepressants' },
  { code: 'N07X', label: 'N07X — Other nervous system drugs' },

  // ---- Respiratory system ----
  { code: 'R03A', label: 'R03A — Adrenergics, inhalants' },
  { code: 'R03B', label: 'R03B — Other drugs for obstructive airway diseases, inhalants' },
  { code: 'R03D', label: 'R03D — Other systemic drugs for obstructive airway diseases' },
  { code: 'R07A', label: 'R07A — Other respiratory system products' },

  // ---- Sensory organs ----
  { code: 'S01L', label: 'S01L — Ocular vascular disorder agents' },

  // ---- Various ----
  { code: 'V04C', label: 'V04C — Other diagnostic agents' },
];
