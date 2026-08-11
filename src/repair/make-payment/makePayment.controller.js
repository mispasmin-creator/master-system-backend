const { advanceStage } = require('../shared/repairWorkflow.service');

// POST /api/repair/tasks/:id/make-payment
const advanceMakePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updateFields = {
      planned4: body.planned4 || new Date(),
      actual4: body.actual4 || new Date()
    };

    const task = await advanceStage(id, 'make-payment', updateFields);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error('advanceMakePayment error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  advanceMakePayment
};
