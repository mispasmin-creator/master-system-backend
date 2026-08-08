const { prisma } = require('../../config/db');
const { seedPurchaserCoordinate } = require('../shared/purchaserCoordinate');

// ---------------------------------------------------------------------------
// Lift The Material — reference: lift-material.jsx.
//
// A PO becomes liftable (reference: Planned4) once its tally entry is done,
// i.e. the indent has a PurchasePoEntry row. Unlike the earlier stages this
// one is many-per-PO: a PO is lifted truck by truck, so each lift creates a
// new PurchaseLift row and the PO stays in the pending list until the lifted
// quantity catches up with the ordered quantity (minus any cancelled qty).
//
// Pending rows are grouped by po_number and carry per-material item lines so
// the frontend can drive partial lifting. Lift numbers are LF-001 style and
// are allocated inside the same transaction as the insert, so concurrent
// lifts can't collide (the reference allocated these client-side).
// ---------------------------------------------------------------------------

const iso = (d) => (d ? new Date(d).toISOString() : '');
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
// Quantities are money-adjacent; keep them free of float dust.
const round = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;

// A PO's item lines. `poItems` is written by generate-po/submit as
// [{ indentId, material, quantity, rate, ... }]; older rows may lack it, so
// fall back to the per-indent approved quantity.
const readPoItems = (row) => {
  const items = Array.isArray(row.poItems) ? row.poItems : [];
  if (items.length > 0) {
    return items.map((it) => ({
      indentId: it.indentId ?? null,
      material: String(it.material || '').trim(),
      quantity: num(it.quantity),
      rate: num(it.rate),
    }));
  }
  return [
    {
      indentId: row.indentId ?? null,
      material: String(row.indent?.material || '').trim(),
      quantity: num(row.approvedQty ?? row.totalQuantity),
      rate: num(row.rate),
    },
  ];
};

// @desc    Pending POs to lift + full lift history.
// @route   GET /api/purchase/lift/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const [poRows, lifts] = await Promise.all([
      prisma.purchaseGeneratePo.findMany({
        include: {
          indent: {
            select: {
              id: true,
              firmName: true,
              material: true,
              deliveryOrderNo: true,
              poEntry: { select: { createdAt: true } },
              managementApproval: { select: { aluminaPercent: true, ironPercent: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.purchaseLift.findMany({
        include: { indent: { select: { id: true, firmName: true, deliveryOrderNo: true } } },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    // How much has already been lifted, per indent and per indent+material.
    const liftedByIndent = {};
    const liftedByItem = {};
    for (const l of lifts) {
      const qty = num(l.liftingQty ?? l.qty);
      if (l.indentId == null) continue;
      liftedByIndent[l.indentId] = (liftedByIndent[l.indentId] || 0) + qty;
      const key = `${l.indentId}||${String(l.rawMaterialName || '').trim().toLowerCase()}`;
      liftedByItem[key] = (liftedByItem[key] || 0) + qty;
    }

    const groups = {};
    for (const row of poRows) {
      const indent = row.indent;
      // Gate: tally entry done (reference: Planned4 not null).
      if (!indent || !indent.poEntry) continue;

      const poNumber = String(row.poNumber || indent.id || '').trim();
      if (!poNumber) continue;

      if (!groups[poNumber]) {
        const ma = indent.managementApproval || {};
        groups[poNumber] = {
          id: `PO-${poNumber}`,
          poNumber,
          indentNos: new Set(),
          dbRowIds: [],
          firmName: indent.firmName || '',
          vendorName: row.vendorName || '',
          rate: row.rate != null ? String(row.rate) : '',
          alumina: String(ma.aluminaPercent ?? ''),
          iron: String(ma.ironPercent ?? ''),
          transportType: row.transportType || '',
          transporterName: '',
          transporterRate: '',
          whatIsToBeDone: row.poNotes || '',
          doNumber: indent.deliveryOrderNo || '',
          planned: iso(indent.poEntry.createdAt),
          plannedRaw: iso(indent.poEntry.createdAt),
          // Cancellation is tracked per-PO (matches reference: the same
          // cancelled qty/reason applies to every indent row under the PO).
          orderCancelQty: 0,
          cancelReason: '',
          status: 'Pending',
          items: [],
        };
      }

      const g = groups[poNumber];
      g.indentNos.add(String(indent.id));
      g.dbRowIds.push(indent.id);
      if (row.orderCancelQty) g.orderCancelQty = Math.max(g.orderCancelQty, num(row.orderCancelQty));
      if (row.reasonOfCancel) g.cancelReason = row.reasonOfCancel;
      if (row.status) g.status = row.status;

      for (const it of readPoItems(row)) {
        const indentId = it.indentId ?? indent.id;
        const key = `${indentId}||${it.material.toLowerCase()}`;
        const lifted = round(liftedByItem[key] || 0);
        const pending = round(Math.max(it.quantity - lifted, 0));
        g.items.push({
          indentId,
          material: it.material,
          quantity: it.quantity,
          poRate: it.rate,
          liftedQuantity: lifted,
          pendingQuantity: pending,
        });
      }
    }

    const pending = Object.values(groups)
      .map((g) => {
        const totalQty = round(g.items.reduce((s, i) => s + i.quantity, 0));
        const lifted = round(g.items.reduce((s, i) => s + i.liftedQuantity, 0));
        // Cancelled qty comes out of the pending pool, same as the reference's
        // "Pending PO Qty" adjustment — it never goes below zero.
        const pendingBeforeCancel = round(g.items.reduce((s, i) => s + i.pendingQuantity, 0));
        const pendingQty = round(Math.max(pendingBeforeCancel - g.orderCancelQty, 0));
        const { indentNos, ...rest } = g;
        return {
          ...rest,
          indentNo: Array.from(indentNos).join(', '),
          rawMaterialName: g.items.map((i) => i.material).filter(Boolean).join(', '),
          quantity: String(totalQty),
          receivedQty: String(lifted),
          pendingQty: String(pendingQty),
          pendingLiftQty: String(pendingQty),
          pendingPOQty: String(pendingQty),
          _totalQty: totalQty,
          _liftedSoFar: lifted,
        };
      })
      // Reference: a fully lifted (or fully cancelled) PO drops out of the pending list.
      .filter((p) => num(p.pendingQty) > 0);

    const history = lifts.map((l) => ({
      id: l.id,
      _dbId: l.id,
      liftNo: l.liftNo || '',
      indentNo: l.indentId != null ? String(l.indentId) : '',
      timestamp: iso(l.timestamp),
      createdAt: iso(l.timestamp || l.createdAt),
      firmName: l.firmName || l.indent?.firmName || '',
      vendorName: l.vendorName || '',
      rawMaterialName: l.rawMaterialName || '',
      qty: l.qty != null ? String(l.qty) : '',
      liftingQty: l.liftingQty != null ? String(l.liftingQty) : '',
      billNo: l.billNo || '',
      dateOfBill: iso(l.dateOfBill),
      areaLifting: l.areaLifting || '',
      type: l.type || '',
      transporterName: l.transporterName || '',
      truckNo: l.truckNo || '',
      driverNo: l.driverNo || '',
      biltyNo: l.biltyNo || '',
      typeOfTransportingRate: l.typeOfTransportingRate || '',
      rate: l.rate != null ? String(l.rate) : '',
      billImage: l.billImage || '',
      truckQty: l.truckQty != null ? String(l.truckQty) : '',
      biltyImage: l.biltyImage || '',
      testingCertificate: l.testingCertificate || '',
      transporterRate: l.transporterRate != null ? String(l.transporterRate) : '',
      transportingRate: l.transportingRate != null ? String(l.transportingRate) : '',
      pendingPoQty: l.pendingPoQty || '',
      doNumber: l.indent?.deliveryOrderNo || '',
    }));

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// Next free LF-nnn. Must run inside the caller's transaction.
const nextLiftNumbers = async (tx, count) => {
  const rows = await tx.purchaseLift.findMany({
    where: { liftNo: { startsWith: 'LF-' } },
    select: { liftNo: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.liftNo).slice(3), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return Array.from({ length: count }, (_, i) => `LF-${String(max + i + 1).padStart(3, '0')}`);
};

// @desc    Record one lift (one truck) across the PO's material lines.
// @route   POST /api/purchase/lift/create
// @access  Private
const createLift = async (req, res, next) => {
  try {
    const {
      poNumber,
      firmName,
      vendorName,
      items = [],
      billNo,
      dateOfBill,
      areaLifting,
      leadTimeToReachFactory,
      type,
      transporterName,
      truckNo,
      driverNo,
      biltyNo,
      typeOfTransportingRate,
      billImage,
      truckQty,
      biltyImage,
      testingCertificate,
      // Fallback single values (kept for backward compatibility); per-item
      // transporterRate/transportingRate below take priority when present so
      // a multi-material lift's freight is split the same way the reference
      // split it client-side (proportional to each item's lift quantity).
      transporterRate,
      transportingRate,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('At least one material line is required.');
    }

    const clean = items
      .map((it) => ({
        indentId: Number(it.indentId),
        material: String(it.material || '').trim(),
        liftingQty: num(it.liftingQty ?? it.quantity),
        rate: num(it.rate),
        poRate: num(it.poRate),
        transporterRate: it.transporterRate != null && it.transporterRate !== '' ? num(it.transporterRate) : null,
        transportingRate: it.transportingRate != null && it.transportingRate !== '' ? num(it.transportingRate) : null,
      }))
      .filter((it) => Number.isFinite(it.indentId) && it.liftingQty > 0);

    if (clean.length === 0) {
      res.status(400);
      throw new Error('Every material line needs a lifting quantity greater than zero.');
    }

    const leadTime =
      leadTimeToReachFactory != null && leadTimeToReachFactory !== ''
        ? Number(leadTimeToReachFactory)
        : null;

    const created = await prisma.$transaction(async (tx) => {
      const liftNos = await nextLiftNumbers(tx, clean.length);
      const timestamp = new Date();
      const out = [];

      for (let i = 0; i < clean.length; i += 1) {
        const it = clean[i];
        const lift = await tx.purchaseLift.create({
          data: {
            indentId: it.indentId,
            liftNo: liftNos[i],
            timestamp,
            vendorName: vendorName || null,
            qty: it.liftingQty,
            liftingQty: it.liftingQty,
            rawMaterialName: it.material || null,
            billNo: billNo || null,
            dateOfBill: dateOfBill ? new Date(dateOfBill) : null,
            areaLifting: areaLifting || null,
            leadTimeToReachFactory: Number.isFinite(leadTime) ? leadTime : null,
            type: type || null,
            transporterName: transporterName || null,
            truckNo: truckNo || null,
            driverNo: driverNo || null,
            biltyNo: biltyNo || null,
            typeOfTransportingRate: typeOfTransportingRate || null,
            rate: it.rate || null,
            billImage: billImage || null,
            truckQty: truckQty != null && truckQty !== '' ? num(truckQty) : null,
            biltyImage: biltyImage || null,
            testingCertificate: testingCertificate || null,
            firmName: firmName || null,
            transporterRate:
              it.transporterRate != null
                ? it.transporterRate
                : transporterRate != null && transporterRate !== ''
                  ? num(transporterRate)
                  : null,
            transportingRate:
              it.transportingRate != null
                ? it.transportingRate
                : transportingRate != null && transportingRate !== ''
                  ? num(transportingRate)
                  : null,
          },
        });

        // First lift for this indent stamps the PO-entry stage as advanced
        // (same chain rule as upsertStageAndStampParent: only the first one
        // counts, later trucks must not re-stamp it).
        const poEntry = await tx.purchasePoEntry.findUnique({
          where: { indentId: it.indentId },
          select: { updatedAt: true },
        });
        if (poEntry && poEntry.updatedAt == null) {
          await tx.purchasePoEntry.update({
            where: { indentId: it.indentId },
            data: { updatedAt: lift.createdAt },
          });
        }

        // Reference seeds a Mismatch row whenever the lifted rate differs
        // from the PO rate, so the difference can be triaged downstream.
        const rateDiff = round(it.poRate - it.rate);
        if (it.poRate > 0 && rateDiff !== 0) {
          const mismatch = await tx.purchaseMismatch.create({
            data: {
              timestamp,
              liftId: lift.id,
              firmName: firmName || null,
              partyName: vendorName || null,
              productName: it.material || null,
              qty: it.liftingQty,
              type: type || null,
              billNo: billNo || null,
              areaLifting: areaLifting || null,
              truckNo: truckNo || null,
              transporterName: transporterName || null,
              transporter: transporterName || null,
              billImage: billImage || null,
              biltyNo: biltyNo || null,
              biltyImage: biltyImage || null,
              typeOfRate: typeOfTransportingRate || null,
              rate: it.rate || null,
              truckQty: truckQty != null && truckQty !== '' ? num(truckQty) : null,
              testingCertificate: testingCertificate || null,
              status: 'Pending',
              rateDifference: rateDiff,
            },
          });

          // Pure rate/value discrepancy — no goods need to physically go back.
          await seedPurchaserCoordinate(tx, {
            mismatchId: mismatch.id,
            poNumber: poNumber || (it.indentId != null ? String(it.indentId) : ''),
            vendorName: vendorName || null,
            transporterName: transporterName || null,
            materialName: it.material || null,
            type: 'Make Debit Note',
          });
        }

        out.push({ id: lift.id, liftNo: lift.liftNo, indentId: it.indentId });
      }

      return out;
    });

    res.status(201).json({ success: true, data: { poNumber, lifts: created } });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Cancel a pending quantity against a PO (reduces what's still
//          liftable). Reference applied the same cumulative cancel qty and
//          reason to every indent row under the PO — replicated here.
// @route   POST /api/purchase/lift/cancel
// @access  Private
const cancelPo = async (req, res, next) => {
  try {
    const { indentIds = [], cancelQty, reason } = req.body;
    const qty = num(cancelQty);
    if (!Array.isArray(indentIds) || indentIds.length === 0) {
      res.status(400);
      throw new Error('Cannot cancel: PO row ids are missing.');
    }
    if (!(qty > 0)) {
      res.status(400);
      throw new Error('Cancel quantity must be greater than zero.');
    }

    await prisma.$transaction(async (tx) => {
      for (const rawId of indentIds) {
        const indentId = Number(rawId);
        const existing = await tx.purchaseGeneratePo.findUnique({ where: { indentId } });
        const newCancelQty = round((existing?.orderCancelQty || 0) + qty);
        await tx.purchaseGeneratePo.update({
          where: { indentId },
          data: { orderCancelQty: newCancelQty, reasonOfCancel: reason || null },
        });
      }
    });

    res.json({ success: true, data: { count: indentIds.length } });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Super-admin edit of a PO row's editable fields.
// @route   POST /api/purchase/lift/po/:indentId
// @access  Private
const editPo = async (req, res, next) => {
  try {
    const indentId = Number(req.params.indentId);
    if (!Number.isFinite(indentId)) {
      res.status(400);
      throw new Error('Invalid PO row id.');
    }
    const { vendorName, firmName, quantity, rate, alumina, iron, status, orderCancelQty, cancelReason } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.purchaseGeneratePo.update({
        where: { indentId },
        data: {
          vendorName: vendorName ?? undefined,
          totalQuantity: quantity != null && quantity !== '' ? Number(quantity) : undefined,
          rate: rate != null && rate !== '' ? Number(rate) : undefined,
          status: status ?? undefined,
          orderCancelQty: orderCancelQty != null && orderCancelQty !== '' ? Number(orderCancelQty) : undefined,
          reasonOfCancel: cancelReason ?? undefined,
        },
      });

      if (firmName != null && firmName !== '') {
        await tx.purchaseIndent.update({ where: { id: indentId }, data: { firmName } });
      }
      if (alumina != null || iron != null) {
        await tx.purchaseManagementApproval.upsert({
          where: { indentId },
          create: {
            indentId,
            aluminaPercent: alumina != null && alumina !== '' ? Number(alumina) : null,
            ironPercent: iron != null && iron !== '' ? Number(iron) : null,
          },
          update: {
            aluminaPercent: alumina != null && alumina !== '' ? Number(alumina) : undefined,
            ironPercent: iron != null && iron !== '' ? Number(iron) : undefined,
          },
        });
      }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Super-admin edit of a recorded lift's editable fields.
// @route   POST /api/purchase/lift/entry/:liftId
// @access  Private
const editLift = async (req, res, next) => {
  try {
    const liftId = Number(req.params.liftId);
    if (!Number.isFinite(liftId)) {
      res.status(400);
      throw new Error('Invalid lift id.');
    }
    const {
      billNo,
      dateOfBill,
      qty,
      liftingQty,
      truckNo,
      firmName,
      rate,
      transporterRate,
      transporterName,
      biltyNo,
      billImage,
    } = req.body;

    await prisma.purchaseLift.update({
      where: { id: liftId },
      data: {
        billNo: billNo ?? undefined,
        dateOfBill: dateOfBill ? new Date(dateOfBill) : dateOfBill === '' ? null : undefined,
        qty: qty != null && qty !== '' ? Number(qty) : undefined,
        liftingQty: liftingQty != null && liftingQty !== '' ? Number(liftingQty) : undefined,
        truckNo: truckNo ?? undefined,
        firmName: firmName ?? undefined,
        rate: rate != null && rate !== '' ? Number(rate) : undefined,
        transporterRate: transporterRate != null && transporterRate !== '' ? Number(transporterRate) : undefined,
        transporterName: transporterName ?? undefined,
        biltyNo: biltyNo ?? undefined,
        billImage: billImage ?? undefined,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, createLift, cancelPo, editPo, editLift };
