"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or localhost
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Root welcome & API info
app.get('/', (_req, res) => {
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
app.use('/api', routes_1.default);
// Global 404 Handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: env_1.config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
    });
});
// Start Server
const PORT = env_1.config.port;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚨 VERA Backend Server Running`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`🤖 OmniRoute Gateway: ${env_1.config.omniRoute.baseUrl}`);
    console.log(`=========================================`);
});
exports.default = app;
