const { uploadFile } = require('../../shared/fileUpload.service');

/**
 * Services module wrapper around central fileUpload.service.js
 */
async function uploadServiceFile(fileBuffer, fileName, mimeType, hostUrl = '') {
  return uploadFile(fileBuffer, fileName, mimeType, hostUrl);
}

module.exports = {
  uploadServiceFile,
  uploadFile
};
