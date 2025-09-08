const { PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { documentClient } = require('../../config/aws');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class DynamoDBService {
  /**
   * Guarda una notificación en la tabla
   * @param {string} tableName - Nombre de la tabla
   * @param {Object} notification - Datos de la notificación
   */
  async saveNotification(tableName, notification) {
  try {
    if (typeof notification.resolved === 'boolean') {
      notification.resolved = notification.resolved ? "true" : "false";
    }

    const item = {
      uuid: uuidv4(),
      ...notification,
      createdAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item
    });

    await documentClient.send(command);
    logger.info(`Notification saved to ${tableName}`, { uuid: item.uuid });
    return item;
  } catch (error) {
    logger.error(`Error saving notification to ${tableName}`, error);
    throw error;
  }
}

  /**
   * Obtiene notificaciones por filtro
   * @param {string} tableName - Nombre de la tabla
   * @param {Object} filters - Filtros para la consulta
   */
  async getNotifications(tableName, filters = {}) {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        ...filters
      });

      const result = await documentClient.send(command);
      logger.info(`Retrieved ${result.Items?.length || 0} notifications from ${tableName}`);
      return result.Items || [];
    } catch (error) {
      logger.error(`Error retrieving notifications from ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Obtiene una notificación específica por UUID
   * @param {string} tableName - Nombre de la tabla
   * @param {string} uuid - UUID de la notificación
   */
  async getNotificationById(tableName, uuid) {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: { uuid }
      });

      const result = await documentClient.send(command);
      logger.info(`Retrieved notification ${uuid} from ${tableName}`);
      return result.Item;
    } catch (error) {
      logger.error(`Error retrieving notification ${uuid} from ${tableName}`, error);
      throw error;
    }
  }
}

module.exports = new DynamoDBService();