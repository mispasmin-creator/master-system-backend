// Port of systems/purchase/utils/approvalVendorUtils.js — pure functions,
// no Prisma/Supabase calls. Reused by the three-party/factory-approval/
// management-approval controllers.

const TECHNICAL_TAGS = ['T1', 'T2', 'T3'];

function safeString(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function toFloatOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Converts a raw vendor form (from the Three Party UI) into the exact
// shape/types the purchase_threeParty columns expect.
function formatVendorInput(v) {
  const rateTypeText = v.rateType === 'basic' ? 'Basic Rate' : 'With Tax';
  const withTaxOrNot = v.rateType === 'basic' ? 'No' : 'Yes';
  const taxValue = v.rateType === 'basic' ? String(v.gstPercent || 0) : '0';

  return {
    name: safeString(v.name),
    rateType: rateTypeText,
    rate: v.rate?.toString() || '0',
    withTaxOrNot,
    taxValue,
    paymentTerm: safeString(v.paymentTerm),
    advancePercentage: toFloatOrNull(v.advancePercentage),
    quotationNumber: safeString(v.quotationNumber),
    quotationDate: toDateOrNull(v.quotationDate),
    whatsapp: safeString(v.whatsapp),
    email: safeString(v.email),
    alumina: toFloatOrNull(v.alumina),
    iron: toFloatOrNull(v.iron),
    sio2: toFloatOrNull(v.sio2),
    cao: toFloatOrNull(v.cao),
    ap: toFloatOrNull(v.ap),
    bd: toFloatOrNull(v.bd),
    fineness: toFloatOrNull(v.fineness),
    packaging: safeString(v.packaging),
    transportType: safeString(v.transportType) || 'FOR',
    notes: safeString(v.notes),
    expectedDate: v.expectedDate || null,
  };
}

const THREE_PARTY_FIELD_MAP = [
  ['name', 'vendorName'],
  ['rateType', 'selectRateType'],
  ['rate', 'rate'],
  ['withTaxOrNot', 'withTaxOrNot'],
  ['taxValue', 'taxValue'],
  ['paymentTerm', 'paymentTerm'],
  ['advancePercentage', 'advancePercentage'],
  ['quotationNumber', 'quotationNumber'],
  ['quotationDate', 'quotationDate'],
  ['whatsapp', 'whatsappNumber'],
  ['email', 'emailId'],
  ['packaging', 'packaging'],
  ['alumina', 'alumina'],
  ['iron', 'iron'],
  ['sio2', 'sio2'],
  ['cao', 'cao'],
  ['ap', 'ap'],
  ['bd', 'bd'],
  ['fineness', 'fineness'],
  ['transportType', 'transportType'],
  ['notes', 'notes'],
  ['expectedDate', 'expectedDate'],
];

// Builds the purchase_threeParty create/update payload from 3 formatted vendors.
function buildThreePartyData(vendors) {
  const data = { threePartyStatus: 'Approved' };
  vendors.forEach((v, idx) => {
    const slot = idx + 1;
    THREE_PARTY_FIELD_MAP.forEach(([from, to]) => {
      data[`${to}${slot}`] = v[from];
    });
  });
  return data;
}

// Reads the 3 vendor slots off a PurchaseThreeParty row (+ optional
// PurchaseFactoryApproval row for technicalTag) back into vendor objects,
// matching the reference system's getVendorsFromRow.
function getVendorsFromThreeParty(threeParty, factoryApproval) {
  return [1, 2, 3]
    .map((slot) => ({
      slot,
      name: safeString(threeParty?.[`vendorName${slot}`]),
      rate: safeString(threeParty?.[`rate${slot}`]) || '0',
      paymentTerm: safeString(threeParty?.[`paymentTerm${slot}`]),
      rateType: safeString(threeParty?.[`selectRateType${slot}`]) || 'With Tax',
      withTaxOrNot: safeString(threeParty?.[`withTaxOrNot${slot}`]) || 'Yes',
      taxValue: safeString(threeParty?.[`taxValue${slot}`]) || '0',
      alumina: threeParty?.[`alumina${slot}`] ?? '',
      iron: threeParty?.[`iron${slot}`] ?? '',
      sio2: threeParty?.[`sio2${slot}`] ?? '',
      cao: threeParty?.[`cao${slot}`] ?? '',
      ap: threeParty?.[`ap${slot}`] ?? '',
      bd: threeParty?.[`bd${slot}`] ?? '',
      fineness: threeParty?.[`fineness${slot}`] ?? '',
      packaging: safeString(threeParty?.[`packaging${slot}`]),
      transportType: safeString(threeParty?.[`transportType${slot}`]) || 'FOR',
      expectedDate: safeString(threeParty?.[`expectedDate${slot}`]),
      quotationNumber: safeString(threeParty?.[`quotationNumber${slot}`]),
      quotationDate: threeParty?.[`quotationDate${slot}`] ?? null,
      advancePercentage: threeParty?.[`advancePercentage${slot}`] ?? '',
      technicalTag: safeString(factoryApproval?.[`technicalTag${slot}`]),
    }))
    .filter((vendor) => vendor.name);
}

function getTechnicalAssignments(vendors) {
  const assignments = Object.fromEntries(TECHNICAL_TAGS.map((tag) => [tag, null]));
  vendors.forEach((vendor) => {
    if (TECHNICAL_TAGS.includes(vendor.technicalTag)) {
      assignments[vendor.technicalTag] = vendor.slot;
    }
  });
  return assignments;
}

function buildTechnicalTagUpdate(assignments) {
  const update = {};
  [1, 2, 3].forEach((slot) => {
    const tag = TECHNICAL_TAGS.find((t) => assignments[t] === slot) || null;
    update[`technicalTag${slot}`] = tag;
  });
  return update;
}

function buildApprovedVendorUpdate(vendor) {
  return {
    vendor: vendor.name || '',
    approvedVendorName: vendor.name || '',
    approvedRate: vendor.rate || '0',
    approvedPaymentTerm: vendor.paymentTerm || '',
    withTaxOrNot4: vendor.withTaxOrNot || 'Yes',
    taxValue4: vendor.taxValue || '0',
    aluminaPercent: toFloatOrNull(vendor.alumina),
    ironPercent: toFloatOrNull(vendor.iron),
    sio2Percent: toFloatOrNull(vendor.sio2),
    caoPercent: toFloatOrNull(vendor.cao),
    apPercentAge: toFloatOrNull(vendor.ap),
    bdPercentAge: toFloatOrNull(vendor.bd),
    fineness: toFloatOrNull(vendor.fineness),
    packaging: vendor.packaging || '',
    transportType4: vendor.transportType || 'FOR',
    expectedDate4: vendor.expectedDate || null,
  };
}

function compareTechnicalTags(a, b) {
  return TECHNICAL_TAGS.indexOf(a.technicalTag) - TECHNICAL_TAGS.indexOf(b.technicalTag);
}

module.exports = {
  TECHNICAL_TAGS,
  formatVendorInput,
  buildThreePartyData,
  getVendorsFromThreeParty,
  getTechnicalAssignments,
  buildTechnicalTagUpdate,
  buildApprovedVendorUpdate,
  compareTechnicalTags,
};
