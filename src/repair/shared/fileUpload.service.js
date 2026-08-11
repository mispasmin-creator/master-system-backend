const { uploadFile } = require('../../shared/fileUpload.service');

/**
 * Repair module file upload helper.
 * Manages uploads for Repair fields:
 * - imageUrl (Machine image in Indent)
 * - weighmentSlip (Sent to Vendor)
 * - transportingImageWithMachine (Sent to Vendor)
 * - billImage (Check Machine / Store In)
 * - productImage (Store In)
 */
async function uploadRepairFile(fileInput, fileName, mimeType, hostUrl = '') {
  return uploadFile(fileInput, fileName, mimeType, hostUrl);
}

module.exports = {
  uploadRepairFile,
  uploadFile
};
