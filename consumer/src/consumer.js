const { Kafka } = require('kafkajs');
const log4js = require('log4js');

// Configure logging
log4js.configure({
  appenders: {
    console: { 
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%d{ISO8601} [%p] %c - %m'
      }
    }
  },
  categories: {
    default: { appenders: ['console'], level: 'info' }
  }
});

const logger = log4js.getLogger('consumer');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'cdc-consumer',
  brokers: (process.env.KAFKA_BROKERS || 'kafka:29092').split(','),
  connectionTimeout: 30000,
  requestTimeout: 30000,
});

const consumer = kafka.consumer({ 
  groupId: 'cdc-consumer-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

class CDCMessageProcessor {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    try {
      logger.info('Starting CDC Consumer...');
      
      await consumer.connect();
      logger.info('Connected to Kafka');

      // Subscribe to TiDB CDC topic
      await consumer.subscribe({ 
        topic: process.env.KAFKA_TOPIC || 'tidb-cdc-changes',
        fromBeginning: false 
      });

      this.isRunning = true;
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.processMessage(topic, partition, message);
        },
      });

    } catch (error) {
      logger.error('Failed to start consumer:', error);
      process.exit(1);
    }
  }

  async processMessage(topic, partition, message) {
    try {
      const messageValue = message.value ? message.value.toString() : null;
      
      if (!messageValue) {
        logger.warn('Received empty message');
        return;
      }

      // Parse the CDC message
      let cdcData;
      try {
        cdcData = JSON.parse(messageValue);
      } catch (parseError) {
        logger.error('Failed to parse message JSON:', parseError);
        logger.info('Raw message:', messageValue);
        return;
      }

      // Process different types of database changes
      const processedData = this.processDatabaseChange(cdcData);
      
      // Log the processed change in structured format
      logger.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'database-cdc',
        topic: topic,
        partition: partition,
        offset: message.offset,
        changeType: processedData.changeType,
        table: processedData.table,
        database: processedData.database,
        primaryKey: processedData.primaryKey,
        changes: processedData.changes,
        metadata: {
          kafkaTimestamp: message.timestamp,
          messageSize: message.value.length
        }
      }));

    } catch (error) {
      logger.error('Error processing message:', error);
    }
  }

  processDatabaseChange(cdcData) {
    // TiDB CDC message format processing
    const result = {
      changeType: 'unknown',
      database: null,
      table: null,
      primaryKey: null,
      changes: {},
      rawData: cdcData
    };

    try {
      // Handle TiDB CDC format
      if (cdcData.type) {
        result.changeType = cdcData.type; // 'insert', 'update', 'delete'
      }

      if (cdcData.database) {
        result.database = cdcData.database;
      }

      if (cdcData.table) {
        result.table = cdcData.table;
      }

      // Extract primary key information
      if (cdcData.data && Array.isArray(cdcData.data) && cdcData.data.length > 0) {
        const firstRow = cdcData.data[0];
        if (firstRow.id !== undefined) {
          result.primaryKey = { id: firstRow.id };
        }
        
        // Store the actual data changes
        result.changes = cdcData.data;
      }

      // Handle old data for updates/deletes
      if (cdcData.old_data) {
        result.oldData = cdcData.old_data;
      }

      // Extract timestamp if available
      if (cdcData.ts || cdcData.timestamp) {
        result.changeTimestamp = cdcData.ts || cdcData.timestamp;
      }

    } catch (processingError) {
      logger.error('Error processing CDC data structure:', processingError);
    }

    return result;
  }

  async stop() {
    if (this.isRunning) {
      logger.info('Stopping CDC Consumer...');
      await consumer.disconnect();
      this.isRunning = false;
      logger.info('Consumer stopped');
    }
  }
}

// Graceful shutdown handling
const processor = new CDCMessageProcessor();

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await processor.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await processor.stop();
  process.exit(0);
});

// Health check endpoint for Docker
const express = require('express');
const app = express();
const port = process.env.HEALTH_PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ 
    status: processor.isRunning ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'cdc-consumer'
  });
});

app.listen(port, () => {
  logger.info(`Health check server running on port ${port}`);
});

// Start the consumer with retry logic
async function startConsumer() {
  const maxRetries = 10;
  const retryDelay = 15000; // 15 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Starting CDC message processor (attempt ${attempt}/${maxRetries})...`);
      
      // Test Kafka connectivity first
      await testKafkaConnection();
      
      // Start the processor
      await processor.start();
      logger.info('CDC Consumer started successfully');
      return;
      
    } catch (error) {
      logger.error(`Consumer startup attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        logger.error('Max retry attempts reached. Exiting...');
        process.exit(1);
      }
      
      logger.info(`Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Test Kafka connection
async function testKafkaConnection() {
  const admin = kafka.admin();
  try {
    await admin.connect();
    await admin.listTopics();
    logger.info('Kafka connectivity verified');
    await admin.disconnect();
  } catch (error) {
    await admin.disconnect();
    throw new Error(`Kafka connection test failed: ${error.message}`);
  }
}

startConsumer();
