const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { createTask } = require('../shared/repairWorkflow.service');
const { uploadRepairFile } = require('../shared/fileUpload.service');

// POST /api/repair/tasks (create indent)
const createIndent = async (req, res) => {
  try {
    const body = req.body;

    let imageUrl = body.imageUrl || body.imageLink || null;
    if (body.userManualFile || body.imageFile || (body.imageLink && body.imageLink.startsWith('data:'))) {
      const fileData = body.userManualFile || body.imageFile || body.imageLink;
      const uploaded = await uploadRepairFile(fileData, body.fileName || 'machine_image.png', body.mimeType || 'image/png', `${req.protocol}://${req.get('host')}`);
      imageUrl = uploaded.url;
    }

    const payload = {
      ...body,
      imageUrl
    };

    const task = await createTask(payload);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error('createIndent error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// GET /api/repair/tasks?stage=&firm=&search=
const getTasks = async (req, res) => {
  try {
    const { stage, firm, search } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }

    if (stage && stage !== 'All') {
      if (stage.toLowerCase() === 'pending' || stage.toLowerCase() === 'complete') {
        where.status = stage;
      }
    }

    if (search) {
      where.OR = [
        { taskNo: { contains: search, mode: 'insensitive' } },
        { machineName: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { doerName: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { machinePartName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const tasks = await prisma.repairTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { advancePayments: true }
    });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    console.error('getTasks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/repair/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.repairTask.findFirst({
      where: {
        OR: [{ id: id }, { taskNo: id }]
      },
      include: { advancePayments: true }
    });

    if (!task) {
      return res.status(404).json({ success: false, error: `RepairTask '${id}' not found.` });
    }

    res.json({ success: true, data: task });
  } catch (err) {
    console.error('getTaskById error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createIndent,
  getTasks,
  getTaskById
};
