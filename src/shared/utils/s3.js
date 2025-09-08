const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../config/aws');
const logger = require('./logger');

class S3Service {
  /**
   * Obtiene un template de email desde S3
   * @param {string} bucketName - Nombre del bucket
   * @param {string} templateKey - Clave del template
   */
  async getEmailTemplate(bucketName, templateKey) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: templateKey
      });

      const response = await s3Client.send(command);
      const template = await response.Body.transformToString();
      
      logger.info(`Email template retrieved: ${templateKey}`);
      return template;
    } catch (error) {
      logger.error(`Error retrieving email template ${templateKey}`, error);
      throw error;
    }
  }

  /**
   * Cache simple para templates (en memoria)
   */
  constructor() {
    this.templateCache = new Map();
  }

  /**
   * Obtiene template con cache
   * @param {string} bucketName - Nombre del bucket
   * @param {string} templateKey - Clave del template
   */
  async getCachedEmailTemplate(bucketName, templateKey) {
    const cacheKey = `${bucketName}/${templateKey}`;
    
    if (this.templateCache.has(cacheKey)) {
      logger.info(`Email template retrieved from cache: ${templateKey}`);
      return this.templateCache.get(cacheKey);
    }

    const template = await this.getEmailTemplate(bucketName, templateKey);
    this.templateCache.set(cacheKey, template);
    return template;
  }

  /**
   * Limpia el cache de templates
   */
  clearCache() {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }
}

module.exports = new S3Service();