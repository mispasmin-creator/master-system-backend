const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { convertOfferToService } = require('../shared/serviceStatus.service');

// GET /api/services/offers
const getOffers = async (req, res) => {
  try {
    const { firm, search } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }
    if (search) {
      where.OR = [
        { offerNo: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const offers = await prisma.serviceOffer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { services: true }
    });

    res.json({ success: true, count: offers.length, data: offers });
  } catch (err) {
    console.error('getOffers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/services/offers
const createOffer = async (req, res) => {
  try {
    const { offerNo, firmName, vendor, description, location, amount, isOffer, offerCopy, amountPaid, outstanding, status } = req.body;

    let offerNum = offerNo;
    if (!offerNum) {
      const count = await prisma.serviceOffer.count();
      offerNum = `OFF-${String(count + 1).padStart(2, '0')}`;
    }

    const offer = await prisma.serviceOffer.create({
      data: {
        offerNo: offerNum,
        firmName: firmName || 'PMMPL',
        vendor: vendor || 'Vendor',
        description: description || null,
        location: location || null,
        amount: parseFloat(amount) || 0,
        isOffer: isOffer || 'Yes',
        offerCopy: offerCopy || null,
        amountPaid: parseFloat(amountPaid) || 0,
        outstanding: parseFloat(outstanding) || ((parseFloat(amount) || 0) - (parseFloat(amountPaid) || 0)),
        status: status || 'Pending'
      }
    });

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    console.error('createOffer error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT /api/services/offers/:id
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firmName, vendor, description, location, amount, isOffer, offerCopy, amountPaid, outstanding, status } = req.body;

    const data = {};
    if (firmName !== undefined) data.firmName = firmName;
    if (vendor !== undefined) data.vendor = vendor;
    if (description !== undefined) data.description = description;
    if (location !== undefined) data.location = location;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (isOffer !== undefined) data.isOffer = isOffer;
    if (offerCopy !== undefined) data.offerCopy = offerCopy;
    if (amountPaid !== undefined) data.amountPaid = parseFloat(amountPaid);
    if (outstanding !== undefined) data.outstanding = parseFloat(outstanding);
    if (status !== undefined) data.status = status;

    const offer = await prisma.serviceOffer.update({
      where: { id },
      data
    });

    res.json({ success: true, data: offer });
  } catch (err) {
    console.error('updateOffer error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST /api/services/offers/:id/convert
const convertOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceFields = req.body;

    const serviceJob = await convertOfferToService(id, serviceFields);

    await prisma.serviceOffer.update({
      where: { id },
      data: { status: 'Converted' }
    }).catch(() => {});

    res.status(201).json({ success: true, data: serviceJob });
  } catch (err) {
    console.error('convertOffer error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getOffers,
  createOffer,
  updateOffer,
  convertOffer
};
