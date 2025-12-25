import express from 'express';
import WebSocket from 'ws';
import cors from 'cors';
import http from 'http';

interface MessageData {
    message: string;
}

interface WebSocketMessage {
    type: 'message' | 'welcome';
    data: string;
    timestamp: string;
}

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('Client connected. Total clients:', clients.size);

    ws.on('message', (message: WebSocket.RawData) => {
        try {
            const data: MessageData = JSON.parse(message.toString());
            console.log('Received message:', data);

            const broadcastMessage: WebSocketMessage = {
                type: 'message',
                data: data.message,
                timestamp: new Date().toISOString(),
            }

            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(broadcastMessage));
                }
            });
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected. Total clients:', clients.size);
    });

    const welcomeMessage: WebSocketMessage = {
        type: 'welcome',
        data: 'Welcome to the WebSocket server!',
        timestamp: new Date().toISOString(),
    };

    ws.send(JSON.stringify(welcomeMessage));
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', clients: clients.size });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
    console.log(`WebSocket server listening on port 8080`);
});