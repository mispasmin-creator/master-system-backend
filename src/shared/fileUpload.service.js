const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Common file upload service shared across all modules (Services, Repair, Inventory, etc.)
 * Supports file buffers, Express req.file objects, and Base64 encoded file strings.
 * Replaces old Apps Script uploadFileToDrive().
 *
 * @param {Buffer|Object|string} fileInput - Buffer, Express req.file, or base64 string
 * @param {string} [fileName] - Optional original filename
 * @param {string} [mimeType] - Optional file mime type
 * @param {string} [hostUrl] - Optional base host URL (e.g. http://localhost:5000)
 * @returns {Promise<{filename: string, path: string, url: string}>}
 */
async function uploadFile(fileInput, fileName, mimeType, hostUrl = '') {
  if (!fileInput) {
    throw new Error('No file data provided for upload.');
  }

  let buffer;
  let originalName = fileName || 'attachment.bin';

  if (typeof fileInput === 'object' && fileInput !== null && fileInput.buffer) {
    // Express / Multer file object
    buffer = fileInput.buffer;
    if (fileInput.originalname) {
      originalName = fileInput.originalname;
    }
  } else if (Buffer.isBuffer(fileInput)) {
    buffer = fileInput;
  } else if (typeof fileInput === 'string') {
    // Base64 string input (from legacy Google Apps Script upload data URLs)
    const base64Data = fileInput.includes('base64,')
      ? fileInput.split('base64,')[1]
      : fileInput;
    buffer = Buffer.from(base64Data, 'base64');
  } else if (fileInput instanceof ArrayBuffer || ArrayBuffer.isView(fileInput)) {
    buffer = Buffer.from(fileInput);
  } else {
    throw new Error('Invalid file input format provided for upload.');
  }

  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }

  const safeFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const finalFilename = `${uniquePrefix}_${safeFileName}`;
  const filePath = path.join(uploadDir, finalFilename);

  await fs.promises.writeFile(filePath, buffer);

  const relativePath = `/uploads/${finalFilename}`;
  const fileUrl = hostUrl
    ? `${hostUrl.replace(/\/$/, '')}${relativePath}`
    : relativePath;

  return {
    filename: finalFilename,
    path: relativePath,
    url: fileUrl
  };
}

module.exports = {
  uploadFile,
  uploadServiceFile: uploadFile // backward compatibility alias
};
