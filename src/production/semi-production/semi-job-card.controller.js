const { prisma } = require('../../config/db');

const getAll = async (req, res, next) => {
    try {
        const data = await prisma.productionSemiJobCard.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

const getOne = async (req, res, next) => {
    try {
        const data = await prisma.productionSemiJobCard.findUnique({ where: { id: req.params.id } });
        if (!data) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

const create = async (req, res, next) => {
    try {
        const data = await prisma.productionSemiJobCard.create({ data: req.body });
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
};

const update = async (req, res, next) => {
    try {
        const data = await prisma.productionSemiJobCard.update({ where: { id: req.params.id }, data: req.body });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

const remove = async (req, res, next) => {
    try {
        await prisma.productionSemiJobCard.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: {} });
    } catch (error) { next(error); }
};

module.exports = { getAll, getOne, create, update, remove };