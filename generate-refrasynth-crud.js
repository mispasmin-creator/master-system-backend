const fs = require('fs');
const path = require('path');

const modules = [
  { folder: 'master', model: 'refrasynthMaster' },
  { folder: 'user', model: 'refrasynthUser' },
  { folder: 'indent', model: 'refrasynthIndent' },
  { folder: 'po-master', model: 'refrasynthPoMaster' },
  { folder: 'store-in', model: 'refrasynthStoreIn' },
  { folder: 'fullkitting', model: 'refrasynthFullkitting' },
  { folder: 'payments', model: 'refrasynthPayment' },
  { folder: 'issue', model: 'refrasynthIssue' },
  { folder: 'inventory', model: 'refrasynthInventory' },
  { folder: 'tally-entry', model: 'refrasynthTallyEntry' },
  { folder: 'pc-report', model: 'refrasynthPcReport' }
];

const basePath = path.join(__dirname, 'src', 'refrasynth');

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

let routesIndexContent = `const express = require('express');\nconst router = express.Router();\n\n`;

modules.forEach(({ folder, model }) => {
  const folderPath = path.join(basePath, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const controllerCode = `const { prisma } = require('../../config/db');

// @desc    Get all ${folder}
// @route   GET /api/refrasynth/${folder}
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.${model}.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ${folder} by ID
// @route   GET /api/refrasynth/${folder}/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.${model}.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create ${folder}
// @route   POST /api/refrasynth/${folder}
const create = async (req, res, next) => {
  try {
    const data = await prisma.${model}.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ${folder}
// @route   PATCH /api/refrasynth/${folder}/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.${model}.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: req.body
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete ${folder}
// @route   DELETE /api/refrasynth/${folder}/:id
const remove = async (req, res, next) => {
  try {
    await prisma.${model}.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
`;

  const routesCode = `const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, create, update, remove } = require('./${folder}.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, update)
  .delete(protect, remove);

module.exports = router;
`;

  fs.writeFileSync(path.join(folderPath, `${folder}.controller.js`), controllerCode);
  fs.writeFileSync(path.join(folderPath, `${folder}.routes.js`), routesCode);

  routesIndexContent += `router.use('/${folder}', require('./${folder}/${folder}.routes'));\n`;
});

routesIndexContent += `\nmodule.exports = router;\n`;
fs.writeFileSync(path.join(basePath, 'routes.js'), routesIndexContent);

console.log('CRUD controllers and routes generated for Refrasynth system.');
