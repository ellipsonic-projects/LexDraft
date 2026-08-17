import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import clientsMatterRoutes from './routes/clients-matters.routes';
import tasksRoutes from './routes/tasks.routes';
import templatesRoutes from './routes/templates.routes';
import customizationRequestsRoutes from './routes/customization-requests.routes';
import documentsRoutes from './routes/documents.routes';
import notificationsRoutes from './routes/notifications.routes';
import activityRoutes from './routes/activity.routes';
import analyticsRoutes from './routes/analytics.routes';
import clientApprovalRoutes from './routes/client-approval.routes';
import signatureRoutes from './routes/signature.routes';
import aiRoutes from './routes/ai.routes';
import invitationRoutes from './routes/invitation.routes';

const app = express();

// Trust Proxy Configuration for production reverse proxies (Render, Nginx, ALBs, Cloudflare, etc.)
// Use numeric value (1) instead of boolean true to satisfy express-rate-limit security validation
if (env.TRUST_PROXY === 'true' || env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
} else if (env.TRUST_PROXY && env.TRUST_PROXY !== 'false') {
  const parsed = parseInt(env.TRUST_PROXY, 10);
  app.set('trust proxy', isNaN(parsed) ? env.TRUST_PROXY : parsed);
}

// Security Middlewares
app.use(helmet());

// Configure robust production CORS matching comma-separated origins, localhost in dev, or * wildcard
const allowedOrigins = env.ALLOWED_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes('*') ||
        (env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

// Configurable Rate Limiter
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request Logging
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Status / Health Check Checkpoint
app.get('/api/status', (_req, res) => {
  const fs = require('fs');
  const path = require('path');
  const cachePath = path.join(__dirname, '..', 'node_modules', 'puppeteer_cache');
  let cacheExists = false;
  let cacheFiles: string[] = [];
  let errorMsg = '';
  try {
    cacheExists = fs.existsSync(cachePath);
    if (cacheExists) {
      cacheFiles = fs.readdirSync(cachePath);
    }
  } catch (err: any) {
    errorMsg = err.message;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    cacheExists,
    cacheFiles,
    errorMsg,
    cwd: process.cwd(),
    envRender: process.env.RENDER
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api', clientsMatterRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/customization-requests', customizationRequestsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/client-actions', clientApprovalRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/invitations', invitationRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Global Error Handler (must be last)
app.use(errorHandler);

export default app;
