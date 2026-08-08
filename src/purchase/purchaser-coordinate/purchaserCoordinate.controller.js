const { prisma } = require('../../config/db');

// @desc    List all purchaser coordination records
// @route   GET /api/purchase/purchaser-coordinate/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const rows = await prisma.purchasePurchaserCoordinate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map((r) => ({
      id: r.id,
      mismatch_id: r.mismatchId != null ? String(r.mismatchId) : '',
      po_number: r.poNumber || '',
      vendor_name: r.vendorName || '',
      transporter_name: r.transporterName || '',
      material_name: r.materialName || '',
      status: r.status || 'PENDING',
      type: r.type || '',
      coordinated_by: r.coordinatedBy || '',
      coordinated_at: r.coordinatedAt ? r.coordinatedAt.toISOString() : '',
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm a coordination as done and cascade the status onto the
//          linked Mismatch row (mirrors PurchaserCoordinate.jsx's handleCoordinate)
// @route   POST /api/purchase/purchaser-coordinate/coordinate/:coordinateId
// @access  Private
const coordinate = async (req, res, next) => {
  try {
    const coordinateId = req.params.coordinateId;
    if (!coordinateId) {
      res.status(400);
      throw new Error('Invalid coordinateId');
    }

    const existing = await prisma.purchasePurchaserCoordinate.findUnique({ where: { id: coordinateId } });
    if (!existing) {
      res.status(404);
      throw new Error('Coordination record not found');
    }

    const now = new Date();
    const coordinatedBy = req.user?.email || req.user?.id || '';

    await prisma.purchasePurchaserCoordinate.update({
      where: { id: coordinateId },
      data: {
        status: 'COORDINATED',
        coordinatedBy,
        coordinatedAt: now,
      },
    });

    if (existing.mismatchId != null) {
      const coordType = String(existing.type || '').trim();
      let mismatchStatus = 'Pending';
      let actionType = null;

      if (coordType === 'Make Debit Note') {
        mismatchStatus = 'Credit Notes';
        actionType = 'Make Debit Note';
      } else if (coordType === 'Return Material and Make Debit Note') {
        mismatchStatus = 'Purchase Return';
        actionType = 'Return Material and Make Debit Note';
      }

      try {
        await prisma.purchaseMismatch.update({
          where: { id: existing.mismatchId },
          data: {
            coordinationStatus: 'COORDINATED',
            status: mismatchStatus,
            actionType,
          },
        });
      } catch (e) {
        // Mirrors reference behavior: coordination is saved even if the
        // linked Mismatch row is missing/already resolved.
        console.warn('Could not update Mismatch status, but coordination saved.', e.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, coordinate };
