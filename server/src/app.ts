import express from 'express';
import WebSocket from 'ws';
import cors from 'cors';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from './config/database';
import { ChatController } from './controllers/chatController';
import { WebSocketService } from './services/webSocketService';
import authRoutes from './routes/auth';
import { logger } from './utils/logger';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.get('/debug/rooms', (req, res) => {
    const stats = WebSocketService.getStats();
    res.json({
        success: true,
        data: stats
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            mongodb: 'connected',
            websocket: 'running'
        },
        stats: WebSocketService.getStats()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`Unhandled error: ${error.message}`);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
    const socketId = uuidv4();
    ChatController.handleConnection(ws, socketId);
});

wss.on('error', (error) => {
    logger.error(`WebSocket server error: ${error.message}`);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    logger.info(`🚀 Express server running on port ${PORT}`);
    logger.info(`🔌 WebSocket server running on port 8080`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
    });
});

export default app;
