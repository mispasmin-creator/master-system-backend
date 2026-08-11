const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

// GET /api/repair/master
const getMasterDropdowns = async (req, res) => {
  try {
    const items = await prisma.repairMasterDropdown.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const vendors = items.map((i) => i.vendorName).filter(Boolean);
    const transporters = items.map((i) => i.transporterName).filter(Boolean);
    const departments = items.map((i) => i.department).filter(Boolean);
    const machines = items.map((i) => i.machineName).filter(Boolean);

    res.json({
      success: true,
      data: {
        items,
        vendors: [...new Set(vendors)],
        transporters: [...new Set(transporters)],
        departments: [...new Set(departments)],
        machines: [...new Set(machines)]
      }
    });
  } catch (err) {
    console.error('getMasterDropdowns error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/repair/master
const addMasterDropdown = async (req, res) => {
  try {
    const body = req.body; // { vendorName, transporterName, department, machineName, firmName }

    const item = await prisma.repairMasterDropdown.create({
      data: {
        vendorName: body.vendorName || body['Vendor Name'] || null,
        transporterName: body.transporterName || body['Transporter Name'] || null,
        department: body.department || body['Department'] || null,
        machineName: body.machineName || body['Machine Name'] || null,
        firmName: body.firmName || body['Firm Name'] || null
      }
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error('addMasterDropdown error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT /api/repair/master/:id
const updateMasterDropdown = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const item = await prisma.repairMasterDropdown.update({
      where: { id },
      data: {
        vendorName: body.vendorName,
        transporterName: body.transporterName,
        department: body.department,
        machineName: body.machineName,
        firmName: body.firmName
      }
    });

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('updateMasterDropdown error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE /api/repair/master/:id
const deleteMasterDropdown = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.repairMasterDropdown.delete({ where: { id } });
    res.json({ success: true, message: 'Master item deleted successfully.' });
  } catch (err) {
    console.error('deleteMasterDropdown error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getMasterDropdowns,
  addMasterDropdown,
  updateMasterDropdown,
  deleteMasterDropdown
};
