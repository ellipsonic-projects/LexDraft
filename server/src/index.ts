import app from './app';
import { env } from './config/env';
import { logger } from './middlewares/errorHandler';
import { prisma } from './lib/prisma';
import { Server } from 'http';

let server: Server;

async function startServer() {
  try {
    // Test database connection
    logger.info('Verifying database connection...');
    await prisma.$connect();
    logger.info('Database connection successfully established.');

    server = app.listen(env.PORT, () => {
      logger.info(`🚀 LexDraft backend server successfully started on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start server due to database connection error:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('Express HTTP server closed.');
      try {
        await prisma.$disconnect();
        logger.info('Database connection gracefully closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during database disconnection:', err);
        process.exit(1);
      }
    });

    // If graceful shutdown takes too long, force exit
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
