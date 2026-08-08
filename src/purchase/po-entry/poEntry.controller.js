const { prisma } = require('../../config/db');
const { upsertStageAndStampParent, revertStage } = require('../shared/stageChain');

// ---------------------------------------------------------------------------
// PO Entry in Tally — reference: tally-entry.jsx / POEntry.jsx.
//
// A pure checkbox stage. A PO is ready for tally entry (reference: Planned3)
// once its logistics are settled — either it is FOR (logistics skipped) or its
// Ex-Factory logistics have been approved. Checking the box records the entry
// (reference: Actual3) by creating a PurchasePoEntry row per indent; unchecking
// deletes it. Grouped by po_number.
// ---------------------------------------------------------------------------

const iso = (d) => (d ? new Date(d).toISOString() : null);
const isFor = (t) => String(t || '').trim().toUpperCase() === 'FOR';

// @desc    All PO-entry-eligible rows, grouped by PO (frontend splits into
//          pending / completed from `rawActual3`).
// @route   GET /api/purchase/po-entry/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseGeneratePo.findMany({
      include: {
        indent: {
          select: {
            id: true,
            firmName: true,
            material: true,
            deliveryOrderNo: true,
            priority: true,
            managementApproval: { select: { aluminaPercent: true, ironPercent: true } },
            logisticsApproval: { select: { createdAt: true } },
            poEntry: { select: { createdAt: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const groups = {};
    for (const row of rows) {
      const indent = row.indent;
      if (!indent) continue;

      // Only rows whose logistics are settled reach PO entry (reference: Planned3).
      const logisticsDone = isFor(row.transportType) || !!indent.logisticsApproval;
      if (!logisticsDone) continue;

      const poNumber = String(row.poNumber || indent.id || '').trim();
      if (!poNumber) continue;

      if (!groups[poNumber]) {
        const ma = indent.managementApproval || {};
        groups[poNumber] = {
          _id: `po-entry-${poNumber}`,
          dbRowIds: [],
          indentId: poNumber,
          firmName: indent.firmName || '',
          poNumber,
          deliveryOrderNo: indent.deliveryOrderNo || '',
          vendorName: row.vendorName || '',
          materials: new Set(),
          approvedQty: String(row.totalQuantity ?? row.approvedQty ?? ''),
          advanceAmount: String(row.toBePaidAmount ?? ''),
          typeOfIndent: String(indent.priority || ''),
          poCopyLink: row.poCopy || '',
          notes: row.poNotes || '',
          totalAmount: String(row.totalAmount ?? ''),
          alumina: String(ma.aluminaPercent ?? ''),
          iron: String(ma.ironPercent ?? ''),
          transportType: row.transportType || '',
          planned: isFor(row.transportType)
            ? iso(row.createdAt)
            : iso(indent.logisticsApproval?.createdAt),
          rawActualLogistics: iso(indent.logisticsApproval?.createdAt) || '',
          rawActual3: iso(indent.poEntry?.createdAt),
          tallyEntryTimestamp: iso(indent.poEntry?.createdAt),
        };
      }
      const g = groups[poNumber];
      g.dbRowIds.push(indent.id);
      if (indent.material) g.materials.add(String(indent.material).trim());
    }

    const data = Object.values(groups).map((g) => {
      const { materials, ...rest } = g;
      return { ...rest, rawMaterialName: Array.from(materials).filter(Boolean).join(', ') };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Check / uncheck the tally-entry box for a PO group.
// @route   POST /api/purchase/po-entry/toggle
// @access  Private
const toggle = async (req, res, next) => {
  try {
    const { indentIds = [], checked } = req.body;
    if (!Array.isArray(indentIds) || indentIds.length === 0) {
      res.status(400);
      throw new Error('Cannot update: entry ids are missing.');
    }

    await prisma.$transaction(async (tx) => {
      for (const rawId of indentIds) {
        const indentId = Number(rawId);
        // Parent to stamp/reset: the approved-logistics row if present, else the PO.
        const hasLogistics = await tx.purchaseLogisticsApproval.findUnique({ where: { indentId } });
        const parentModel = hasLogistics ? tx.purchaseLogisticsApproval : tx.purchaseGeneratePo;

        if (checked) {
          await upsertStageAndStampParent(tx, {
            model: tx.purchasePoEntry,
            where: { indentId },
            create: { indentId },
            update: {},
            parentModel,
            parentWhere: { indentId },
          });
        } else {
          const existing = await tx.purchasePoEntry.findUnique({ where: { indentId } });
          if (existing) {
            await revertStage(tx, {
              model: tx.purchasePoEntry,
              where: { indentId },
              parentModel,
              parentWhere: { indentId },
            });
          }
        }
      }
    });

    res.json({ success: true, data: { count: indentIds.length } });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listData, toggle };
