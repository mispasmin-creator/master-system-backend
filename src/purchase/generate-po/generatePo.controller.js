const { prisma } = require('../../config/db');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// ---------------------------------------------------------------------------
// Generate PO (Make PO) — reference: generate-po.jsx (INDENT-PO wide table).
//
// Reference flow, reproduced on the normalized per-stage tables:
//   * An indent is "ready for PO" once Management Approval is done with
//     "Have To Make PO" = Yes (reference: Planned2 is set). That maps to a
//     PurchaseManagementApproval row with haveToMakePo === 'Yes' and a real
//     approvedVendorName (i.e. not "Rejected").
//   * A PO has been "created" for an indent once a PurchaseGeneratePo row
//     exists (reference: Actual2 / po_number set). The frontend splits the
//     same row set into the Create tab (no PO yet) and Revise tab (PO made)
//     by looking at `poTimestamp`, exactly like the reference.
//   * File upload of the PO PDF stays on Supabase Storage (frontend uploads
//     and passes us the resulting `poCopy` URL) — same as every other
//     already-migrated stage.
//   * Ex-Factory vs FOR "skip logistics" behaviour is reproduced downstream
//     in the Arrange Logistics / PO Entry pending queries (FOR needs no
//     manual logistics arrangement), NOT by writing phantom rows here.
// ---------------------------------------------------------------------------

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

// Builds a { vendorName -> { gstNumber, email, phoneNumber } } lookup from
// purchase_master so the PO form can pre-fill supplier contact details, the
// same way the reference read them off the merged INDENT-PO row.
const buildVendorMasterMap = (masterRows) => {
  const map = {};
  masterRows.forEach((row) => {
    const name = row.vendorName?.trim();
    if (!name) return;
    if (!map[name]) {
      map[name] = {
        gstNumber: row.gstNumber || '',
        email: row.email || '',
        phoneNumber: row.phoneNumber || '',
      };
    }
  });
  return map;
};

// Maps one indent (with its stage rows) into the exact shape the reference
// generate-po.jsx `mapRow` produced, so the frontend consumes it unchanged.
const mapIndentToPoRow = (indent, vendorMap) => {
  const ma = indent.managementApproval || {};
  const tp = indent.threeParty || {};
  const hod = indent.hodApproval || {};
  const po = indent.generatePo || null;
  const vendorName = ma.approvedVendorName || '';
  const contact = vendorMap[vendorName?.trim()] || {};

  // Find the slot for the approved vendor in threeParty (1, 2, or 3)
  let slot = 1;
  if (tp.vendorName1 && tp.vendorName1.trim() === vendorName.trim()) slot = 1;
  else if (tp.vendorName2 && tp.vendorName2.trim() === vendorName.trim()) slot = 2;
  else if (tp.vendorName3 && tp.vendorName3.trim() === vendorName.trim()) slot = 3;

  const quotationNumber = tp[`quotationNumber${slot}`] || tp.quotationNumber1 || '';
  const quotationDate = tp[`quotationDate${slot}`] || tp.quotationDate1;
  const advancePercentage = tp[`advancePercentage${slot}`] ?? null;
  const paymentTerms = ma.approvedPaymentTerm || tp[`paymentTerm${slot}`] || tp.paymentTerm1 || '1 DAY';
  const transportType = po?.transportType || ma.transportType4 || tp[`transportType${slot}`] || tp.transportType1 || 'FOR';
  const packaging = po?.packaging || ma.packaging || tp[`packaging${slot}`] || tp.packaging1 || '';
  const expectedDate = ma.expectedDate4 || tp[`expectedDate${slot}`] || indent.expectedRequirementDate;

  return {
    id: indent.id,
    supabaseId: indent.id,
    firmName: indent.firmName || '',
    vendorName,
    rawMaterialName: indent.material || '',
    typeOfIndent: indent.typeOfIndent || '',
    indentQuantity: indent.quantity,
    approvedQty: Number(po?.approvedQty ?? hod.approvedQty ?? indent.quantity ?? 0),
    approvedRate: Number(ma.approvedRate ?? tp[`rate${slot}`] ?? tp.rate1 ?? 0),
    quotationNumber,
    quotationDate: toDateInput(quotationDate),
    paymentTerms,
    advancePercentage,
    // reference: Actual2 (PO created) / Planned2 (ready for PO)
    poTimestamp: po?.createdAt ? po.createdAt.toISOString() : '',
    planned: ma.createdAt ? ma.createdAt.toISOString() : '',
    notes: po?.poNotes || indent.notes || '',
    supplierAddress: contact.address || '',
    supplierGstin: contact.gstNumber || '',
    supplierEmail: contact.email || '',
    alumina: ma.aluminaPercent ?? tp[`alumina${slot}`] ?? '',
    iron: ma.ironPercent ?? tp[`iron${slot}`] ?? '',
    sio2: ma.sio2Percent ?? tp[`sio2${slot}`] ?? '',
    cao: ma.caoPercent ?? tp[`cao${slot}`] ?? '',
    ap: ma.apPercentAge ?? tp[`ap${slot}`] ?? '',
    bd: ma.bdPercentAge ?? tp[`bd${slot}`] ?? '',
    fineness: ma.fineness ?? tp[`fineness${slot}`] ?? '',
    packaging,
    poFile: po?.poCopy || '',
    advanceToBePaid: po?.advanceToBePaid || (advancePercentage && Number(advancePercentage) > 0 ? 'yes' : 'no'),
    toBePaidAmount: po?.toBePaidAmount ?? '',
    whenToBePaid: toDateInput(po?.whenToBePaidAmount),
    transportType,
    dest: '',
    poDate: toDateInput(po?.createdAt) || toDateInput(new Date()),
    deliveryDate: po?.leadTimeToLiftDays
      ? String(po.leadTimeToLiftDays).split(' ')[0]
      : toDateInput(expectedDate),
    poNumber: po?.poNumber || '',
    uom: indent.uom || 'MT',
  };
};

// @desc    All indents that are management-approved (ready for PO) plus any
//          that already have a PO — the frontend splits these into the
//          Create / Revise tabs by `poTimestamp`.
// @route   GET /api/purchase/generate-po/rows
// @access  Public
const listRows = async (req, res, next) => {
  try {
    const indents = await prisma.purchaseIndent.findMany({
      where: {
        managementApproval: {
          is: { haveToMakePo: 'Yes' },
        },
      },
      include: {
        managementApproval: true,
        threeParty: true,
        hodApproval: true,
        generatePo: true,
      },
      orderBy: { id: 'asc' },
    });

    const masterRows = await prisma.purchaseMaster.findMany({
      where: { vendorName: { not: null } },
      select: { vendorName: true, gstNumber: true, email: true, phoneNumber: true },
    });
    const vendorMap = buildVendorMasterMap(masterRows);

    const data = indents
      .filter((i) => (i.managementApproval?.approvedVendorName || '') !== 'Rejected')
      .map((i) => mapIndentToPoRow(i, vendorMap));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Grouped PO history (reference: POHistory.jsx). One entry per
//          po_number + vendor + firm, with a status derived from how far the
//          indent has advanced downstream.
// @route   GET /api/purchase/generate-po/po-history
// @access  Public
const listPoHistory = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseGeneratePo.findMany({
      include: {
        indent: {
          select: {
            id: true,
            firmName: true,
            material: true,
            arrangeLogistics: { select: { id: true } },
            poEntry: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = {};
    for (const row of rows) {
      const indent = row.indent || {};
      const poId = row.poNumber || 'Draft';
      const vendorName = row.vendorName || 'N/A';
      const firmName = indent.firmName || '';
      const key = `${poId}_${vendorName}_${firmName}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: row.id,
          poId,
          date: row.createdAt ? row.createdAt.toISOString() : null,
          vendorName,
          items: [],
          totalAmount: row.totalAmount || 0,
          pdfUrl: row.poCopy,
          firmName,
          // reference order: logistics-arranged wins, then tally-entered.
          status: indent.arrangeLogistics
            ? 'Logistics Arranged'
            : indent.poEntry
              ? 'Entered in Tally'
              : 'PO Created',
        };
      }
      if (indent.material && !grouped[key].items.includes(indent.material)) {
        grouped[key].items.push(indent.material);
      }
      let poItemsArray = [];
      if (Array.isArray(row.poItems)) {
        poItemsArray = row.poItems;
      } else if (typeof row.poItems === 'string') {
        try {
          const parsed = JSON.parse(row.poItems);
          if (Array.isArray(parsed)) poItemsArray = parsed;
        } catch (_) {}
      } else if (row.poItems && typeof row.poItems === 'object') {
        poItemsArray = [row.poItems];
      }

      for (const it of poItemsArray) {
        if (it && typeof it === 'object' && it.material && !grouped[key].items.includes(it.material)) {
          grouped[key].items.push(it.material);
        } else if (typeof it === 'string' && it.trim() && !grouped[key].items.includes(it.trim())) {
          grouped[key].items.push(it.trim());
        }
      }
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
};

// @desc    Super-admin edit of a whole PO group (reference: POHistory edit
//          modal). Matches by po_number + firm, updates vendor/total/PO-copy
//          on every generatePo row, and optionally re-firms the linked indents.
// @route   POST /api/purchase/generate-po/po-history/edit
// @access  Private
const editPoGroup = async (req, res, next) => {
  try {
    const { poNumber, firmName, vendorName, totalAmount, pdfUrl, newFirmName } = req.body;
    if (!poNumber) {
      res.status(400);
      throw new Error('poNumber is required');
    }

    const rows = await prisma.purchaseGeneratePo.findMany({
      where: { poNumber, indent: { is: { firmName } } },
      select: { id: true, indentId: true },
    });

    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        await tx.purchaseGeneratePo.update({
          where: { id: r.id },
          data: {
            vendorName: vendorName ?? undefined,
            totalAmount: totalAmount != null && totalAmount !== '' ? Number(totalAmount) : undefined,
            poCopy: pdfUrl ?? undefined,
          },
        });
        if (newFirmName && newFirmName !== firmName && r.indentId) {
          await tx.purchaseIndent.update({
            where: { id: r.indentId },
            data: { firmName: newFirmName },
          });
        }
      }
    });

    res.json({ success: true, data: { updated: rows.length } });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview the next PO number for a firm WITHOUT consuming it
//          (reference RPC: preview_next_po_number).
// @route   GET /api/purchase/generate-po/preview-po-number?firmId=...
// @access  Public
const previewPoNumber = async (req, res, next) => {
  try {
    const { firmId } = req.query;
    if (!firmId) {
      res.status(400);
      throw new Error('firmId is required');
    }
    const firm = await prisma.purchaseFirm.findUnique({ where: { id: String(firmId) } });
    if (!firm) {
      res.status(404);
      throw new Error('Firm not found');
    }
    const nextId = (firm.lastPoId || 0) + 1;
    res.json({
      success: true,
      data: { nextId, prefix: firm.poPrefix || '', poNumber: `${firm.poPrefix || ''}${nextId}` },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Atomically consume and return the next PO number for a firm
//          (reference RPC: get_next_po_number). Called once, before the PDF
//          is generated/uploaded, so the frontend can stamp the real number
//          on the PDF and then submit with it.
// @route   POST /api/purchase/generate-po/allocate-po-number
// @access  Private
const allocatePoNumber = async (req, res, next) => {
  try {
    const { firmId } = req.body;
    if (!firmId) {
      res.status(400);
      throw new Error('firmId is required');
    }
    const poNumber = await prisma.$transaction(async (tx) => {
      const firm = await tx.purchaseFirm.findUnique({ where: { id: String(firmId) } });
      if (!firm) {
        const err = new Error('Firm not found');
        err.statusCode = 404;
        throw err;
      }
      const nextId = (firm.lastPoId || 0) + 1;
      await tx.purchaseFirm.update({ where: { id: firm.id }, data: { lastPoId: nextId } });
      return `${firm.poPrefix || ''}${nextId}`;
    });
    res.status(201).json({ success: true, data: { poNumber } });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Create or revise a PO across a vendor group of indents.
// @route   POST /api/purchase/generate-po/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const {
      mode = 'create',
      poNumber,
      supplierName,
      poDate,
      deliveryDate,
      notes,
      transportType,
      advanceToBePaid,
      toBePaidAmount,
      whenToBePaid,
      poCopy,
      totalQuantity,
      totalAmount,
      indents = [],
      removedIndentIds = [],
    } = req.body;

    if (!Array.isArray(indents) || indents.length === 0) {
      res.status(400);
      throw new Error('At least one indent item is required.');
    }
    if (!poNumber) {
      res.status(400);
      throw new Error('poNumber is required.');
    }
    if (removedIndentIds.length > 30) {
      res.status(400);
      throw new Error('Safety check: too many removals.');
    }

    const advanceYes =
      String(advanceToBePaid || '').trim().toLowerCase() === 'yes';

    const result = await prisma.$transaction(async (tx) => {
      const finalPoNumber = poNumber;

      const shared = {
        poNumber: finalPoNumber,
        vendorName: supplierName || '',
        leadTimeToLiftDays: deliveryDate ? `${deliveryDate} 00:00:00` : null,
        totalQuantity: totalQuantity != null ? Number(totalQuantity) : null,
        totalAmount: totalAmount != null ? Number(totalAmount) : null,
        poCopy: poCopy || null,
        advanceToBePaid: advanceYes ? 'Yes' : 'No',
        toBePaidAmount: advanceYes ? Number(toBePaidAmount) || 0 : null,
        whenToBePaidAmount: advanceYes && whenToBePaid ? new Date(whenToBePaid) : null,
        status5: advanceYes ? 'Pending' : null,
        poNotes: notes || null,
        packaging: indents[0]?.packaging || '',
        transportType: transportType || '',
        poItems: indents.map((item) => ({
          indentId: item.id,
          material: item.productName,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          gstPercent: Number(item.gstPercent) || 0,
          specs: { ...(item.specs || {}), packaging: item.packaging || '' },
        })),
      };

      for (const item of indents) {
        const indentId = Number(item.id);
        const data = {
          ...shared,
          approvedQty: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
        };
        await upsertStageAndStampParent(tx, {
          model: tx.purchaseGeneratePo,
          where: { indentId },
          create: { indentId, ...data },
          update: data,
          parentModel: tx.purchaseManagementApproval,
          parentWhere: { indentId },
        });
      }

      // Revise: drop PO from indents removed from the group.
      for (const removedId of removedIndentIds) {
        const indentId = Number(removedId);
        await revertStage(tx, {
          model: tx.purchaseGeneratePo,
          where: { indentId },
          childModel: tx.purchaseArrangeLogistics,
          childWhere: { indentId },
          parentModel: tx.purchaseManagementApproval,
          parentWhere: { indentId },
        });
      }

      return { poNumber: finalPoNumber };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = {
  listRows,
  listPoHistory,
  editPoGroup,
  previewPoNumber,
  allocatePoNumber,
  submit,
};
