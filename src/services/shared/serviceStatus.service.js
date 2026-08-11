const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

/**
 * Derived status calculation for ServiceJob based on 5 stage-column groups.
 * Replaces old client-side getServiceStatus() logic.
 */
function deriveServiceStatus(s = {}) {
  if (s.status5 === 'Completed' || s.actual5) return 'Completed';
  if (s.status4 === 'Completed' || s.status4 === 'Paid' || s.actual4 || (s.actual2 && !s.planned2)) return 'Tally Pending';
  if (s.status3 === 'Approved' || s.actual3 || (s.actual1 && !s.planned1)) return 'Payment Pending';
  if (s.billNo || s.billCopy) return 'Bill Received';
  if (s.actual2) return 'Work Completed';
  if (s.actual1) return 'Work Started';
  return 'Service Created';
}

/**
 * Calculates delay days between planned date and actual date.
 * Returns positive integer if actual > planned, else 0.
 */
function calculateDelay(planned, actual) {
  if (!planned || !actual) return 0;
  const pDate = new Date(planned);
  const aDate = new Date(actual);
  if (isNaN(pDate.getTime()) || isNaN(aDate.getTime())) return 0;

  pDate.setHours(0, 0, 0, 0);
  aDate.setHours(0, 0, 0, 0);

  const diffTime = aDate.getTime() - pDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Generates sequential Service Number (e.g. SRV-01, SRV-02).
 */
async function generateServiceNo() {
  const count = await prisma.serviceJob.count();
  return `SRV-${String(count + 1).padStart(2, '0')}`;
}

/**
 * Converts a ServiceOffer into a ServiceJob.
 */
async function convertOfferToService(offerId, serviceFields = {}) {
  let offer = null;
  if (offerId) {
    offer = await prisma.serviceOffer.findFirst({
      where: {
        OR: [
          { id: offerId },
          { offerNo: offerId }
        ]
      }
    });
  }

  const serviceNo = serviceFields.serviceNo || await generateServiceNo();

  const payload = {
    serviceNo: serviceNo,
    offerId: offer ? offer.id : null,
    firmName: serviceFields.firmName || (offer ? offer.firmName : 'PMMPL'),
    vendor: serviceFields.vendor || (offer ? offer.vendor : 'Vendor'),
    description: serviceFields.description || (offer ? offer.description : null),
    location: serviceFields.location || (offer ? offer.location : null),
    checker: serviceFields.checker || null,
    amount: parseFloat(serviceFields.amount) || (offer ? offer.amount : 0),
    tdsAmount: parseFloat(serviceFields.tdsAmount) || 0,
    remark: serviceFields.remark || null,
    planned1: serviceFields.planned1 ? new Date(serviceFields.planned1) : null,
    actual1: serviceFields.actual1 ? new Date(serviceFields.actual1) : null
  };

  payload.delay1 = calculateDelay(payload.planned1, payload.actual1);
  payload.status = deriveServiceStatus(payload);

  const serviceJob = await prisma.serviceJob.create({
    data: payload
  });

  return serviceJob;
}

module.exports = {
  deriveServiceStatus,
  calculateDelay,
  generateServiceNo,
  convertOfferToService
};
