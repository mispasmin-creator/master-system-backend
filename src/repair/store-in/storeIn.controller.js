const { advanceStage } = require('../shared/repairWorkflow.service');
const { uploadRepairFile } = require('../shared/fileUpload.service');

// POST /api/repair/tasks/:id/store-in
const advanceStoreIn = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    let productImage = body.productImage || null;
    if (body.productImage && typeof body.productImage === 'string' && body.productImage.startsWith('data:')) {
      const uploaded = await uploadRepairFile(body.productImage, 'product_image.png', 'image/png', `${req.protocol}://${req.get('host')}`);
      productImage = uploaded.url;
    }

    let billImage = body.billImage || null;
    if (body.billImage && typeof body.billImage === 'string' && body.billImage.startsWith('data:')) {
      const uploaded = await uploadRepairFile(body.billImage, 'bill_image_store.png', 'image/png', `${req.protocol}://${req.get('host')}`);
      billImage = uploaded.url;
    }

    const updateFields = {
      planned2: body.planned2 || new Date(),
      actual2: body.actual2 || new Date(),
      receivedQuantity: body.receivedQuantity,
      billMatch: body.billMatch,
      productImage,
      billImage,
      billNo: body.billNo
    };

    const task = await advanceStage(id, 'store-in', updateFields);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error('advanceStoreIn error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  advanceStoreIn
};
