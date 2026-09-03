import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes';

const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or localhost
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root welcome & API info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    app: 'VERA Backend API',
    description: 'Voice Emergency Response Assistant & Smart Complaint Management System',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      complaints: '/api/complaints',
      incidents: '/api/incidents',
      voice: '/api/voice',
      ai: '/api/ai',
    },
  });
});

// API Routes
app.use('/api', apiRouter);

// Global 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Start Server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚨 VERA Backend Server Running`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  console.log(`🤖 OmniRoute Gateway: ${config.omniRoute.baseUrl}`);
  console.log(`=========================================`);
});

export default app;
