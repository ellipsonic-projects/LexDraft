import app from './app';
import { env } from './config/env';
import { logger } from './middlewares/errorHandler';
import { prisma } from './lib/prisma';


async function startServer() {
  try {
    // Test database connection
    logger.info('Verifying database connection...');
    await prisma.$connect();
    logger.info('Database connection successfully established.');

    app.listen(env.PORT, () => {
      logger.info(`🚀 LexDraft backend server successfully started on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start server due to database connection error:', error);
    // In production/dev setup phase, keep server alive or exit
    process.exit(1);
  }
}

startServer();
