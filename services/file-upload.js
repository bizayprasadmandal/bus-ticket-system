const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

let sharpModule = null;
let sharpLoadFailed = false;

function getSharp() {
  if (sharpLoadFailed) return null;
  if (sharpModule) return sharpModule;
  try {
    sharpModule = require('sharp');
    return sharpModule;
  } catch (error) {
    sharpLoadFailed = true;
    console.warn('sharp unavailable, images will be stored without resize:', error.message);
    return null;
  }
}

function loadImageExt(file) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  return map[file.mimetype] || path.extname(file.originalname || '') || '.jpg';
}

// Local file storage service
class LocalFileStorage {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.ensureUploadDirExists();
  }

  ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['images', 'documents', 'temp'];
    subdirs.forEach(subdir => {
      const dirPath = path.join(this.uploadDir, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  // Configure multer for local storage
  getMulterStorage(type = 'images') {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, type);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    });
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get file URL
  getFileUrl(filePath) {
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    if (base) return `${base}/uploads/${filePath}`;
    return `/uploads/${filePath}`;
  }
}

// AWS S3 storage service
class S3FileStorage {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = process.env.AWS_S3_BUCKET;
  }

  // Upload file to S3
  async uploadFile(file, folder = 'images') {
    try {
      const fileName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
      
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      const result = await this.s3.upload(params).promise();
      
      return {
        success: true,
        url: result.Location,
        key: result.Key,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete file from S3
  async deleteFile(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      return { success: true };
    } catch (error) {
      console.error('S3 delete error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get signed URL for private files
  getSignedUrl(key, expiresIn = 3600) {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    });
  }
}

// File upload service
class FileUploadService {
  constructor() {
    this.storage = process.env.FILE_STORAGE === 's3' 
      ? new S3FileStorage() 
      : new LocalFileStorage();
    
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.allowedDocumentTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  }

  // Get multer configuration for images
  getImageUploadMiddleware() {
    const storage = this.storage instanceof LocalFileStorage 
      ? this.storage.getMulterStorage('images')
      : multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 10, // Max 10 files at once
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedImageTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
      },
    });
  }

  // Get multer configuration for documents
  getDocumentUploadMiddleware() {
    const storage = this.storage instanceof LocalFileStorage 
      ? this.storage.getMulterStorage('documents')
      : multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize * 2, // 10MB for documents
        files: 5,
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedDocumentTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
        }
      },
    });
  }

  // Process and upload image
  async processAndUploadImage(file, options = {}) {
    try {
      const {
        resize = { width: 800, height: 600 },
        quality = 80,
        format = 'jpeg',
        folder = 'images'
      } = options;

      const sharp = getSharp();
      let processedBuffer;
      let outFormat = format;
      let outExt = `.${format}`;

      if (sharp && file.buffer) {
        processedBuffer = await sharp(file.buffer)
          .resize(resize.width, resize.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
      } else {
        processedBuffer = file.buffer;
        outFormat = 'bin';
        outExt = loadImageExt(file);
      }

      const processedFile = {
        ...file,
        buffer: processedBuffer,
        originalname: `processed_${file.originalname}`,
      };

      // Upload based on storage type
      if (this.storage instanceof S3FileStorage) {
        return await this.storage.uploadFile(processedFile, folder);
      } else {
        // For local storage, save processed file
        const fileName = `${uuidv4()}${outExt}`;
        const filePath = path.join(this.storage.uploadDir, folder, fileName);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, processedBuffer);

        return {
          success: true,
          url: this.storage.getFileUrl(`${folder}/${fileName}`),
          path: `${folder}/${fileName}`,
        };
      }
    } catch (error) {
      console.error('Image processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Upload multiple bus images
  async uploadBusImages(files, busId) {
    try {
      const uploadPromises = files.map(file => 
        this.processAndUploadImage(file, {
          folder: `buses/${busId}`,
          resize: { width: 1200, height: 800 },
          quality: 85,
        })
      );

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success);
      
      return {
        success: true,
        images: successfulUploads.map(result => ({
          url: result.url,
          path: result.path || result.key,
        })),
        failed: results.filter(result => !result.success),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Upload operator documents
  async uploadOperatorDocuments(files, operatorId) {
    try {
      const uploadPromises = files.map(async (file) => {
        const folder = `operators/${operatorId}/documents`;
        
        if (this.storage instanceof S3FileStorage) {
          return await this.storage.uploadFile(file, folder);
        } else {
          const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
          const filePath = path.join(this.storage.uploadDir, 'documents', fileName);
          
          fs.writeFileSync(filePath, file.buffer);
          
          return {
            success: true,
            url: this.storage.getFileUrl(`documents/${fileName}`),
            path: `documents/${fileName}`,
            originalName: file.originalname,
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success);
      
      return {
        success: true,
        documents: successfulUploads.map(result => ({
          url: result.url,
          path: result.path || result.key,
          originalName: result.originalName,
        })),
        failed: results.filter(result => !result.success),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Upload user profile image
  async uploadProfileImage(file, userId) {
    try {
      const result = await this.processAndUploadImage(file, {
        folder: `profiles/${userId}`,
        resize: { width: 400, height: 400 },
        quality: 90,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      return await this.storage.deleteFile(filePath);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate thumbnail
  async generateThumbnail(file, options = {}) {
    try {
      const { width = 200, height = 200, quality = 70 } = options;
      const sharp = getSharp();
      if (!sharp) {
        return { success: true, buffer: file.buffer };
      }

      const thumbnailBuffer = await sharp(file.buffer)
        .resize(width, height, { fit: 'cover' })
        .jpeg({ quality })
        .toBuffer();

      return {
        success: true,
        buffer: thumbnailBuffer,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get file info
  async getFileInfo(filePath) {
    try {
      if (this.storage instanceof S3FileStorage) {
        // Get S3 object metadata
        const params = {
          Bucket: this.storage.bucket,
          Key: filePath,
        };
        
        const metadata = await this.storage.s3.headObject(params).promise();
        
        return {
          success: true,
          size: metadata.ContentLength,
          lastModified: metadata.LastModified,
          contentType: metadata.ContentType,
        };
      } else {
        // Get local file stats
        const fullPath = path.join(this.storage.uploadDir, filePath);
        const stats = fs.statSync(fullPath);
        
        return {
          success: true,
          size: stats.size,
          lastModified: stats.mtime,
          contentType: 'application/octet-stream',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = {
  FileUploadService,
  LocalFileStorage,
  S3FileStorage,
};