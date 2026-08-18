const express = require('express');
const router = express.Router();

router.use('/department',     require('./department/department.routes'));
router.use('/company',        require('./company/company.routes'));
router.use('/task-template',  require('./task-template/task-template.routes'));
router.use('/task',           require('./task/task.routes'));
router.use('/verification',   require('./verification/verification.routes'));
router.use('/license',        require('./license/license.routes'));
router.use('/training-video', require('./training-video/training-video.routes'));
router.use('/dashboard',      require('./dashboard/dashboard.routes'));
router.use('/master',         require('./checklist-master/checklist-master.routes'));
router.use('/checklist-master', require('./checklist-master/checklist-master.routes'));

router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'Checklist System overview' } });
});

module.exports = router;
