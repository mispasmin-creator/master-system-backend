const { prisma } = require('../../config/db');

// @desc    Get pending job cards
// @route   GET /api/production/production-tracking/pending
const getPending = async (req, res, next) => {
  try {
    const jobCards = await prisma.productionJobCard.findMany({
      include: {
        order: true,
        actualRuns: {
          select: { quantityFg: true }
        }
      }
    });

    const pendingJobCards = jobCards
      .map(jc => {
        const totalMade = jc.actualRuns.reduce((sum, run) => sum + (run.quantityFg || 0), 0);
        return {
          id: jc.id,
          jobCardNo: jc.jobCardNo,
          quantity: jc.quantity,
          firmName: jc.order?.firmName,
          deliveryOrderNo: jc.order?.deliveryOrderNo,
          partyName: jc.order?.partyName,
          productName: jc.order?.productName,
          expectedDeliveryDate: jc.order?.expectedDeliveryDate,
          totalMade
        };
      })
      .filter(jc => (jc.quantity || 0) > 0 && jc.totalMade < jc.quantity);

    res.json({ success: true, data: pendingJobCards });
  } catch (error) {
    next(error);
  }
};

// @desc    Get history of production actual runs
// @route   GET /api/production/production-tracking/history
const getHistory = async (req, res, next) => {
  try {
    const runs = await prisma.productionActualRun.findMany({
      include: {
        jobCard: {
          include: {
            order: true
          }
        },
        materials: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const flatHistory = runs.map(run => ({
      id: run.id,
      dateOfProduction: run.dateOfProduction,
      supervisorName: run.supervisorName,
      quantityFg: run.quantityFg,
      machineHours: run.machineHours,
      remarks: run.remarks,
      jobCardNo: run.jobCard?.jobCardNo,
      firmName: run.jobCard?.order?.firmName,
      deliveryOrderNo: run.jobCard?.order?.deliveryOrderNo,
      partyName: run.jobCard?.order?.partyName,
      productName: run.jobCard?.order?.productName,
      expectedDeliveryDate: run.jobCard?.order?.expectedDeliveryDate,
      materials: run.materials
    }));

    res.json({ success: true, data: flatHistory });
  } catch (error) {
    next(error);
  }
};

// @desc    Get raw material summary
// @route   GET /api/production/production-tracking/rm-summary
const getRmSummary = async (req, res, next) => {
  try {
    const materials = await prisma.productionActualMaterial.groupBy({
      by: ['materialName'],
      _sum: {
        quantity: true
      },
      where: {
        materialName: {
          not: null
        }
      }
    });
    
    const summary = materials.map(m => ({
      materialName: m.materialName,
      quantity: m._sum.quantity || 0
    }));

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Create production actual run (Log)
// @route   POST /api/production/production-tracking/log
const createLog = async (req, res, next) => {
  try {
    const { jobCardId, quantityFg, machineHours, materials, dateOfProduction, supervisorName, remarks } = req.body;
    
    const data = await prisma.$transaction(async (tx) => {
      const run = await tx.productionActualRun.create({
        data: {
          jobCardId,
          quantityFg: quantityFg ? parseFloat(quantityFg) : null,
          machineHours: machineHours ? parseFloat(machineHours) : null,
          dateOfProduction: dateOfProduction ? new Date(dateOfProduction) : null,
          supervisorName,
          remarks,
          status: 'Logged'
        }
      });
      
      if (materials && Array.isArray(materials)) {
        for (const [index, mat] of materials.entries()) {
          if (mat.materialName && mat.quantity) {
            await tx.productionActualMaterial.create({
              data: {
                actualRunId: run.id,
                materialName: mat.materialName,
                quantity: parseFloat(mat.quantity),
                sequence: index + 1
              }
            });
          }
        }
      }
      return run;
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPending, getHistory, getRmSummary, createLog };
