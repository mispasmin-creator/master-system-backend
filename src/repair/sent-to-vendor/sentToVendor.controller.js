const { advanceStage } = require('../shared/repairWorkflow.service');
const { uploadRepairFile } = require('../shared/fileUpload.service');

// POST /api/repair/tasks/:id/sent-to-vendor
const advanceSentToVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    let weighmentSlip = body.weighmentSlip || null;
    if (body.weighmentSlip && body.weighmentSlip.startsWith('data:')) {
      const uploaded = await uploadRepairFile(body.weighmentSlip, 'weighment_slip.png', 'image/png', `${req.protocol}://${req.get('host')}`);
      weighmentSlip = uploaded.url;
    }

    let transportingImageWithMachine = body.transportingImageWithMachine || body.transportingImage || null;
    if (body.transportingImage && (typeof body.transportingImage === 'string' && body.transportingImage.startsWith('data:'))) {
      const uploaded = await uploadRepairFile(body.transportingImage, 'transporting_image.png', 'image/png', `${req.protocol}://${req.get('host')}`);
      transportingImageWithMachine = uploaded.url;
    }

    const hostUrl = `${req.protocol}://${req.get('host')}`;

    const updateFields = {
      planned: body.planned || body.taskStartDate || new Date(),
      actual: body.actual || new Date(),
      vendorName: body.vendorName,
      leadTimeToDeliverDays: body.leadTimeToDeliverDays || body.leadTimeToDeliver,
      transporterName: body.transporterName,
      transportationCharges: body.transportationCharges,
      weighmentSlip,
      transportingImageWithMachine,
      paymentType: body.paymentType,
      howMuch: body.paymentType === 'Advance' ? (body.advancePayment || body.howMuch) : null
    };

    const task = await advanceStage(id, 'sent-to-vendor', updateFields);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error('advanceSentToVendor error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  advanceSentToVendor
};
