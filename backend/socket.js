const socketIo = require('socket.io');

let io;

module.exports = {
    init: (httpServer) => {
        io = socketIo(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
            }
        });
        
        io.on('connection', (socket) => {
            console.log(`[Socket] Client connected: ${socket.id}`);
            
            socket.on('disconnect', () => {
                console.log(`[Socket] Client disconnected: ${socket.id}`);
            });
        });
        
        return io;
    },
    
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    },
    
    broadcastTelemetry: (payload) => {
        if (!io) {
            console.warn('[Socket] Attempted to broadcast before init');
            return;
        }
        io.emit('telemetry_update', payload);
    }
};
