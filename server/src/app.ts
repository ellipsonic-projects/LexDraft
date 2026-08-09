import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);

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
