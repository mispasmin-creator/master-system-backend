const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// ---------------------------------------------------------------------------
// Logistics Approval — reference: LogisticsApp.jsx.
//
// After Arrange Logistics proposes transporter options (reference: Planned9),
// this stage approves a chosen transporter (reference: Actual9 / Planned3).
// Grouped by po_number across the PO's indents; approving writes a
// PurchaseLogisticsApproval row for every indent and stamps the parent
// Arrange Logistics row's updatedAt.
// ---------------------------------------------------------------------------

const iso = (d) => (d ? new Date(d).toISOString() : '');

// @desc    Pending + history lists for Logistics Approval, grouped by PO.
// @route   GET /api/purchase/logistics-approval/data
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
            arrangeLogistics: true,
            logisticsApproval: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const groups = {};
    for (const row of rows) {
      const indent = row.indent;
      if (!indent || !indent.arrangeLogistics) continue; // only arranged POs reach here
      const poNumber = String(row.poNumber || indent.id || '').trim();
      if (!poNumber) continue;

      if (!groups[poNumber]) {
        groups[poNumber] = {
          primary: row,
          indentIds: [],
          materials: new Set(),
          arrange: indent.arrangeLogistics,
          approval: null,
        };
      }
      const g = groups[poNumber];
      g.indentIds.push(indent.id);
      if (indent.material) g.materials.add(String(indent.material).trim());
      if (indent.logisticsApproval && !g.approval) g.approval = indent.logisticsApproval;
    }

    const pending = [];
    const history = [];

    for (const [poNumber, g] of Object.entries(groups)) {
      const row = g.primary;
      const base = {
        id: g.indentIds[0],
        rowIds: g.indentIds,
        indentId: poNumber,
        firmName: row.indent.firmName || '',
        vendorName: row.vendorName || '',
        material: Array.from(g.materials).filter(Boolean).join(', '),
        poNumber,
        totalQuantity: row.totalQuantity ?? row.approvedQty ?? '',
        totalAmount: row.totalAmount ?? '',
      };

      if (!g.approval) {
        pending.push({
          ...base,
          planned9: iso(g.arrange.createdAt),
          actualLogistics: '',
          logisticsOptions: Array.isArray(g.arrange.logisticsOptions) ? g.arrange.logisticsOptions : [],
          proposedTransporter: g.arrange.selectedTransporter || null,
          proposedTransporterIndex: g.arrange.selectedTransporterIndex,
        });
      } else {
        history.push({
          ...base,
          actual9: iso(g.approval.createdAt),
          selectedTransporter: g.approval.selectedTransporter || null,
        });
      }
    }

    history.sort((a, b) => new Date(b.actual9).getTime() - new Date(a.actual9).getTime());

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a chosen transporter for a PO group.
// @route   POST /api/purchase/logistics-approval/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const {
      indentIds = [],
      selectedTransporter = null,
      selectedTransporterIndex = 0,
    } = req.body;

    if (!Array.isArray(indentIds) || indentIds.length === 0) {
      res.status(400);
      throw new Error('No indents supplied for logistics approval.');
    }
    if (!selectedTransporter) {
      res.status(400);
      throw new Error('Invalid transporter selection.');
    }

    const data = {
      transporterName: selectedTransporter.name || '',
      transporterRate: Number(selectedTransporter.cost || 0),
      transpoterRateType: selectedTransporter.rateType || '',
      selectedTransporter,
      selectedTransporterIndex: Number(selectedTransporterIndex) || 0,
    };

    await prisma.$transaction(async (tx) => {
      for (const rawId of indentIds) {
        const indentId = Number(rawId);
        await upsertStageAndStampParent(tx, {
          model: tx.purchaseLogisticsApproval,
          where: { indentId },
          create: { indentId, ...data },
          update: data,
          parentModel: tx.purchaseArrangeLogistics,
          parentWhere: { indentId },
        });
      }
    });

    res.status(201).json({ success: true, data: { count: indentIds.length } });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listData, submit };
