const { advanceStage } = require('../shared/repairWorkflow.service');
const { uploadRepairFile } = require('../shared/fileUpload.service');

// POST /api/repair/tasks/:id/check-machine
const advanceCheckMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    let billImage = body.billImage || null;
    if (body.billImage && typeof body.billImage === 'string' && body.billImage.startsWith('data:')) {
      const uploaded = await uploadRepairFile(body.billImage, 'bill_image.png', 'image/png', `${req.protocol}://${req.get('host')}`);
      billImage = uploaded.url;
    }

    const updateFields = {
      planned1: body.planned1 || new Date(),
      actual1: body.actual1 || new Date(),
      returnTransporterName: body.transporterName,
      transportationAmount: body.transportationAmount,
      billImage,
      billNo: body.billNo,
      typeOfBill: body.typeOfBill,
      totalBillAmount: body.totalBillAmount,
      toBePaidAmount: body.toBePaidAmount
    };

    const task = await advanceStage(id, 'check-machine', updateFields);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error('advanceCheckMachine error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  advanceCheckMachine
};
