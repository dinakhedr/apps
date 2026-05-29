// ============================================================
// CONFIG.JS — Health Tracker constants
// ============================================================

const CLIENT_ID = '152235789997-ma74t430sqgsim9hn8sqhc6gskvddv0a.apps.googleusercontent.com';

const FOLDER_NAME      = 'Health Tracker';
const SPREADSHEET_NAME = 'My Health Log';

// Sheet tab names
const PRODUCTS_SHEET           = 'Products';
const ROUTINE_SHEET            = 'Routine';
const ROUTINE_LOG_SHEET        = 'Routine Log';
const SUPPLEMENTS_SHEET        = 'Supplements';
const SUPPLEMENT_ROUTINE_SHEET = 'Supplement Routine';
const SUPPLEMENTS_LOG_SHEET    = 'Supplements Log';

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets';

const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// Skincare brands
const BRANDS = [
  { id: 'alejon',    name: 'Alejon',        logo: 'Alejon.png'    },
  { id: 'beesline',  name: 'Beesline',      logo: 'Beesline.png'  },
  { id: 'bioderma',  name: 'Bioderma',      logo: 'Bioderma.png'  },
  { id: 'laroche',   name: 'LaRoche Posay', logo: 'LaRoche.png'   },
  { id: 'loreal',    name: "L'Oréal",       logo: 'Loreal.png'    },
  { id: 'melatime',  name: 'Melatime',      logo: 'Melatime.png'  },
  { id: 'nanotreat',  name: 'NanoTreat',      logo: 'NanoTreat.png'  },
  { id: 'sophia',    name: 'Sophia',        logo: 'Sophia.png'    },
  { id: 'vichy',     name: 'Vichy',         logo: 'Vichy.png'     }
];

// Skincare use-for options
const USE_FOR_OPTIONS = [
  'Cleansing',
  'Clogged pores',
  'Acne / pimples',
  'Dry skin',
  'Oily skin',
  'Wrinkles / aging',
  'Dark spots',
  'Redness / sensitivity',
  'Sun protection',
  'Whitening / brightening'
];

// Supplement use-for options
const USE_FOR_OPTIONS_SUPP = [
  'Acid reflux / heartburn',
  'Bone health',
  'Cough / bronchial congestion',
  'Energy & metabolism',
  'Fatigue / low energy',
  'Hair & Nail Growth',
  'Heart health / cholesterol balance',
  'Immune support',
  'Iron deficiency / anemia',
  'Joint health',
  'Nerve function & neuropathy',
  'Pregnancy support / fetal development',
  'Skin health (acne, wound healing)'
];

// ID generators
const PRODUCT_ID_PREFIX         = 'PROD-';
const ASSIGNMENT_ID_PREFIX      = 'ASG-';
const SUPPLEMENT_ID_PREFIX      = 'SUP-';
const SUPP_ASSIGNMENT_ID_PREFIX = 'SUPASG-';

function generateProductId()             { return PRODUCT_ID_PREFIX         + Math.random().toString(36).substring(2, 10); }
function generateAssignmentId()          { return ASSIGNMENT_ID_PREFIX       + Math.random().toString(36).substring(2, 10); }
function generateSupplementId()          { return SUPPLEMENT_ID_PREFIX       + Math.random().toString(36).substring(2, 10); }
function generateSupplementAssignmentId(){ return SUPP_ASSIGNMENT_ID_PREFIX  + Math.random().toString(36).substring(2, 10); }
