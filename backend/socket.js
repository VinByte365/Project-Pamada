const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/user');

let ioInstance = null;
const userSockets = new Map();

function addSocket(userId, socketId) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
}

function removeSocket(userId, socketId) {
  if (!userSockets.has(userId)) return;
  const sockets = userSockets.get(userId);
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
}

function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const rawAuth = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
      const token = rawAuth.startsWith('Bearer ') ? rawAuth.split(' ')[1] : rawAuth;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id full_name email profile_image is_active');
      if (!user || !user.is_active) {
        return next(new Error('Authentication error'));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    addSocket(userId, socket.id);

    socket.emit('socket:ready', { userId, connectedAt: new Date().toISOString() });

    socket.on('typing:start', ({ toUserId }) => {
      emitToUser(toUserId, 'typing:start', {
        fromUserId: userId,
        fromName: socket.user.full_name,
        at: new Date().toISOString(),
      });
    });

    socket.on('typing:stop', ({ toUserId }) => {
      emitToUser(toUserId, 'typing:stop', {
        fromUserId: userId,
        at: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  const ids = userSockets.get(String(userId));
  if (!ids || ids.size === 0) return;
  ids.forEach((socketId) => {
    ioInstance.to(socketId).emit(event, payload);
  });
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
};
