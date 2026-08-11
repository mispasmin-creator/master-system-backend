const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Saves a file buffer or base64 data to storage and returns the accessible file URL.
 * Replaces old Apps Script uploadFileToDrive().
 */
async function uploadServiceFile(fileBuffer, fileName, mimeType, hostUrl = '') {
  if (!fileBuffer) {
    throw new Error('No file data provided for upload.');
  }

  let buffer = fileBuffer;
  if (typeof fileBuffer === 'string') {
    const base64Data = fileBuffer.includes('base64,') ? fileBuffer.split('base64,')[1] : fileBuffer;
    buffer = Buffer.from(base64Data, 'base64');
  }

  const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') : 'attachment.bin';
  const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const finalFilename = `${uniquePrefix}_${safeFileName}`;
  const filePath = path.join(uploadDir, finalFilename);

  await fs.promises.writeFile(filePath, buffer);

  const relativePath = `/uploads/${finalFilename}`;
  const fileUrl = hostUrl ? `${hostUrl.replace(/\/$/, '')}${relativePath}` : relativePath;

  return {
    filename: finalFilename,
    path: relativePath,
    url: fileUrl
  };
}

module.exports = {
  uploadServiceFile
};
