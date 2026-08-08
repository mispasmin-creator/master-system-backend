const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// ---------------------------------------------------------------------------
// Arrange Logistics — reference: ArrangeLogistics.jsx.
//
// Only Ex-Factory POs need a logistics arrangement (FOR POs are freight-borne
// by the supplier and skip this stage entirely — reference filters on
// Transport Type === "ex-factory"). A PO is grouped by po_number across its
// indents; arranging logistics creates a PurchaseArrangeLogistics row for
// every indent in the group and stamps the parent Generate PO's updatedAt.
// ---------------------------------------------------------------------------

const iso = (d) => (d ? new Date(d).toISOString() : '');
const isExFactory = (t) => String(t || '').trim().toLowerCase() === 'ex-factory';

// @desc    Pending + history lists for Arrange Logistics, grouped by PO.
// @route   GET /api/purchase/arrange-logistics/data
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
            logisticsApproval: { select: { id: true, createdAt: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const groups = {};
    for (const row of rows) {
      if (!isExFactory(row.transportType)) continue;
      const indent = row.indent;
      if (!indent) continue;
      const poNumber = String(row.poNumber || indent.id || '').trim();
      if (!poNumber) continue;

      if (!groups[poNumber]) {
        groups[poNumber] = {
          primary: row,
          indentIds: [],
          materials: new Set(),
          arrange: null,
          logisticsApprovalAt: null,
        };
      }
      const g = groups[poNumber];
      g.indentIds.push(indent.id);
      if (indent.material) g.materials.add(String(indent.material).trim());
      if (indent.arrangeLogistics && !g.arrange) g.arrange = indent.arrangeLogistics;
      if (indent.logisticsApproval && !g.logisticsApprovalAt) {
        g.logisticsApprovalAt = indent.logisticsApproval.createdAt;
      }
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

      if (!g.arrange) {
        pending.push({
          ...base,
          transportType: row.transportType || '',
          plannedLogistics: iso(row.createdAt),
          actualLogistics: '',
          actual2: iso(row.createdAt),
          logisticsOptions: [],
        });
      } else {
        history.push({
          ...base,
          actualLogistics: iso(g.logisticsApprovalAt),
          planned9: iso(g.arrange.createdAt),
          selectedTransporter:
            g.arrange.selectedTransporter ||
            (Array.isArray(g.arrange.logisticsOptions)
              ? g.arrange.logisticsOptions[g.arrange.selectedTransporterIndex || 0]
              : null),
        });
      }
    }

    pending.sort((a, b) => new Date(b.plannedLogistics).getTime() - new Date(a.plannedLogistics).getTime());
    history.sort((a, b) => new Date(b.planned9 || b.actualLogistics).getTime() - new Date(a.planned9 || a.actualLogistics).getTime());

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Arrange logistics for a PO group: write the transporter options and
//          the chosen transporter to every indent in the group.
// @route   POST /api/purchase/arrange-logistics/submit
// @access  Private
const submit = async (req, res, next) => {
  try {
    const {
      indentIds = [],
      logisticsOptions = [],
      selectedTransporter = null,
      selectedTransporterIndex = 0,
    } = req.body;

    if (!Array.isArray(indentIds) || indentIds.length === 0) {
      res.status(400);
      throw new Error('No indents supplied for logistics arrangement.');
    }
    if (!selectedTransporter?.name) {
      res.status(400);
      throw new Error('Please choose a selected transporter.');
    }

    const data = {
      logisticsOptions,
      selectedTransporter,
      selectedTransporterIndex: Number(selectedTransporterIndex) || 0,
    };

    await prisma.$transaction(async (tx) => {
      for (const rawId of indentIds) {
        const indentId = Number(rawId);
        await upsertStageAndStampParent(tx, {
          model: tx.purchaseArrangeLogistics,
          where: { indentId },
          create: { indentId, ...data },
          update: data,
          parentModel: tx.purchaseGeneratePo,
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
