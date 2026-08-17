const { prisma } = require('../../config/db');

// @desc    Get consolidated master dropdown data (firms, parties, products, transport types)
// @route   GET /api/rmsales/master
const getMasterData = async (req, res, next) => {
  try {
    // 1. Independently fetch non-null partyName rows from rmsales_master
    const masterPartyRows = await prisma.rmSalesMaster.findMany({
      where: { partyName: { not: null } },
      select: { id: true, partyName: true, firmName: true }
    });

    // 2. Independently fetch non-null productName rows from rmsales_master
    const masterProductRows = await prisma.rmSalesMaster.findMany({
      where: { productName: { not: null } },
      select: { id: true, productName: true }
    });

    // 3. Independently fetch non-null firmName rows from rmsales_master
    const masterFirmRows = await prisma.rmSalesMaster.findMany({
      where: { firmName: { not: null } },
      select: { firmName: true }
    });

    // 4. Independently fetch non-null transportType rows from rmsales_master
    const masterTransportRows = await prisma.rmSalesMaster.findMany({
      where: { transportType: { not: null } },
      select: { transportType: true }
    });

    const dbParties = await prisma.rmSalesParty.findMany({ orderBy: { name: 'asc' } });
    const dbProducts = await prisma.rmSalesProduct.findMany({ orderBy: { name: 'asc' } });

    // Distinct Firm Names
    const defaultFirms = ['PMMPL', 'PURAB', 'RKl', 'Refrasynth'];
    const masterFirms = masterFirmRows.map(m => m.firmName).filter(Boolean);
    const dbFirms = dbParties.map(p => p.firmName).filter(Boolean);
    const firms = Array.from(new Set([...defaultFirms, ...masterFirms, ...dbFirms])).sort();

    // Distinct Parties
    const partyMap = new Map();
    dbParties.forEach(p => {
      if (p.name && p.name.trim()) {
        partyMap.set(p.name.trim().toLowerCase(), { id: p.id, name: p.name.trim(), firm_name: p.firmName || null });
      }
    });
    masterPartyRows.forEach(m => {
      if (m.partyName && m.partyName.trim()) {
        const trimmed = m.partyName.trim();
        const key = trimmed.toLowerCase();
        if (!partyMap.has(key)) {
          partyMap.set(key, { id: m.id || trimmed, name: trimmed, firm_name: m.firmName || null });
        }
      }
    });
    const parties = Array.from(partyMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Distinct Products
    const prodMap = new Map();
    dbProducts.forEach(p => {
      if (p.name && p.name.trim()) {
        prodMap.set(p.name.trim().toLowerCase(), { id: p.id, name: p.name.trim(), unit: p.unit || 'MT', available_qty: p.availableQty || 0 });
      }
    });
    masterProductRows.forEach(m => {
      if (m.productName && m.productName.trim()) {
        const trimmed = m.productName.trim();
        const key = trimmed.toLowerCase();
        if (!prodMap.has(key)) {
          prodMap.set(key, { id: m.id || trimmed, name: trimmed, unit: 'MT', available_qty: 0 });
        }
      }
    });
    const products = Array.from(prodMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Distinct Transport Types
    const defaultTransports = ['FOR Destination', 'Ex Factory Depot'];
    const masterTransports = masterTransportRows.map(m => m.transportType).filter(Boolean);
    const transportTypes = Array.from(new Set([...defaultTransports, ...masterTransports])).sort();

    res.json({
      success: true,
      data: {
        firms,
        parties,
        products,
        transportTypes,
        totalMastersCount: masterPartyRows.length + masterProductRows.length + masterFirmRows.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMasterData };
