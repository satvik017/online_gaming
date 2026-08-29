import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbOps } from './db.js';

const PORT = process.env.PORT || 5050;
const JWT_SECRET = 'vortex-super-secret-key-10982-x';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware: Authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Middleware: Admin Only check
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// --- AUTH API ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const existing = dbOps.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    const user = await dbOps.createUser(username, password, false);
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, isAdmin: user.isAdmin, tokenBalance: user.tokenBalance }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const user = dbOps.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Using simple password compare with bcrypt
    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, isAdmin: user.isAdmin, tokenBalance: user.tokenBalance }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = dbOps.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    tokenBalance: user.tokenBalance
  });
});

// --- WALLET & TOKEN API ROUTES ---

app.post('/api/wallet/buy', authenticateToken, (req, res) => {
  const { amount, cost, cardNumber, cardExpiry, cardCvc } = req.body;
  
  if (!amount || amount <= 0 || !cost) {
    return res.status(400).json({ error: 'Invalid transaction parameters' });
  }
  
  // Card validation check simulation
  if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
    return res.status(400).json({ error: 'Invalid card number' });
  }
  
  try {
    // Process Token Balance top up
    const updatedUser = dbOps.updateUserTokens(req.user.id, amount);
    
    // Log transaction
    const tx = dbOps.createTransaction(req.user.id, 'purchase', amount, cost, 'completed');
    
    res.json({
      message: 'Tokens purchased successfully!',
      tokenBalance: updatedUser.tokenBalance,
      transaction: tx
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/transactions', authenticateToken, (req, res) => {
  const txs = dbOps.getTransactionsByUserId(req.user.id);
  // Sort transactions by date descending
  txs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(txs);
});

// --- MACHINES API ROUTES ---

app.get('/api/machines', (req, res) => {
  const machines = dbOps.getMachines();
  res.json(machines);
});

// Create Machine (Admin)
app.post('/api/machines', authenticateToken, requireAdmin, (req, res) => {
  const { name, type, ipAddress, activeGame, tokenCostPerSession } = req.body;
  if (!name) return res.status(400).json({ error: 'Machine name is required' });

  try {
    const machine = dbOps.createMachine({
      name,
      type,
      ipAddress,
      activeGame,
      tokenCostPerSession: parseInt(tokenCostPerSession) || 1,
      status: 'available'
    });
    // Broadcast updated machines
    io.emit('machines_update', dbOps.getMachines());
    res.status(201).json(machine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Machine (Admin)
app.put('/api/machines/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const updated = dbOps.updateMachine(req.params.id, req.body);
    // Broadcast update
    io.emit('machines_update', dbOps.getMachines());
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Machine (Admin)
app.delete('/api/machines/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    // End any active sessions first
    const activeSess = dbOps.getActiveSessionByMachine(req.params.id);
    if (activeSess) {
      endSessionInternal(activeSess.id, 'Machine Deleted');
    }
    
    dbOps.deleteMachine(req.params.id);
    io.emit('machines_update', dbOps.getMachines());
    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN CONTROL & STATS ---

app.get('/api/admin/sessions', authenticateToken, requireAdmin, (req, res) => {
  const sessions = dbOps.getSessions().filter(s => s.status === 'active');
  const enriched = sessions.map(s => {
    const user = dbOps.getUserById(s.userId);
    const mach = dbOps.getMachineById(s.machineId);
    return {
      ...s,
      username: user ? user.username : 'Unknown',
      machineName: mach ? mach.name : 'Unknown Device',
      machineType: mach ? mach.type : 'ps5'
    };
  });
  res.json(enriched);
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const users = dbOps.getUsers();
  const txs = dbOps.getTransactions();
  const machines = dbOps.getMachines();

  const totalUsers = users.length;
  const totalTokensSold = txs.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = txs.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.cost, 0);
  const totalActivePlayers = machines.filter(m => m.status === 'in-use').length;

  res.json({
    totalUsers,
    totalTokensSold,
    totalRevenue,
    totalActivePlayers
  });
});

// Force End Session Route (Admin)
app.post('/api/admin/sessions/:id/terminate', authenticateToken, requireAdmin, (req, res) => {
  try {
    const ended = endSessionInternal(req.params.id, 'Terminated by Administrator');
    if (ended) {
      res.json({ message: 'Session terminated successfully' });
    } else {
      res.status(404).json({ error: 'Session not found or already closed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WEBSOCKET REAL-TIME GAMING ROOM LOGIC ---

// Cache active playing timers: machineId -> { timer, secondsLeft, socketId, userId }
const activePlaySessions = new Map();

const SESSION_TIME_LIMIT = 5 * 60; // 5 minutes (300 seconds) per session

// Internal helper to stop session safely
const endSessionInternal = (sessionId, reason = 'Time expired') => {
  const db = dbOps.getSessions();
  const sess = db.find(s => s.id === sessionId && s.status === 'active');
  if (!sess) return false;

  console.log(`Ending session ${sessionId}. Reason: ${reason}`);

  // 1. Mark session as completed
  dbOps.updateSession(sess.id, {
    status: 'completed',
    endTime: new Date().toISOString(),
    endReason: reason
  });

  // 2. Reset machine status
  const mach = dbOps.getMachineById(sess.machineId);
  if (mach) {
    dbOps.updateMachine(sess.machineId, {
      status: 'available',
      currentUserId: null,
      currentUsername: null
    });
  }

  // 3. Clear timer instance
  const sessionTimerObj = activePlaySessions.get(sess.machineId);
  if (sessionTimerObj) {
    clearInterval(sessionTimerObj.timer);
    
    // Send force-exit notice to the user's WebSocket
    io.to(sessionTimerObj.socketId).emit('play_session_end', { reason });
    
    activePlaySessions.delete(sess.machineId);
  }

  // 4. Notify everyone of updated machines
  io.emit('machines_update', dbOps.getMachines());
  
  // 5. Notify admin of active session lists
  io.emit('admin_sessions_update');

  return true;
};

// REST route to initiate play
app.post('/api/machines/:id/play', authenticateToken, (req, res) => {
  const machineId = req.params.id;
  const userId = req.user.id;

  try {
    const user = dbOps.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const machine = dbOps.getMachineById(machineId);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    if (machine.status !== 'available') {
      return res.status(400).json({ error: 'Machine is not available to play' });
    }

    const tokenCost = machine.tokenCostPerSession;
    if (user.tokenBalance < tokenCost) {
      return res.status(400).json({ error: 'Insufficient token balance. Please purchase more tokens.' });
    }

    // Spend tokens
    dbOps.updateUserTokens(userId, -tokenCost);
    dbOps.createTransaction(userId, 'spend', tokenCost, 0, 'completed');

    // Lock machine
    dbOps.updateMachine(machineId, {
      status: 'in-use',
      currentUserId: userId,
      currentUsername: user.username
    });

    // Create session database record
    const sess = dbOps.createSession(userId, machineId, SESSION_TIME_LIMIT);

    // Broadcast machine list update
    io.emit('machines_update', dbOps.getMachines());
    io.emit('admin_sessions_update');

    res.json({
      message: 'Session initiated successfully',
      sessionId: sess.id,
      tokenBalance: user.tokenBalance - tokenCost,
      durationSec: SESSION_TIME_LIMIT
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket server event connections
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Authentication over socket
  socket.on('join_play_room', ({ token, machineId, sessionId }) => {
    if (!token || !machineId || !sessionId) {
      socket.emit('play_error', { message: 'Parameters missing for play room access' });
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
      if (err) {
        socket.emit('play_error', { message: 'Socket auth token failed' });
        return;
      }

      // Check if session is active
      const machine = dbOps.getMachineById(machineId);
      const session = dbOps.getActiveSessionByMachine(machineId);

      if (!session || session.id !== sessionId || session.userId !== decodedUser.id || machine.currentUserId !== decodedUser.id) {
        socket.emit('play_error', { message: 'Invalid active session configuration' });
        return;
      }

      // User joins unique machine channel
      socket.join(`room_${machineId}`);
      console.log(`User ${decodedUser.username} entered play room for ${machineId}`);

      // Clear any pre-existing play room loops for this machine
      const existing = activePlaySessions.get(machineId);
      if (existing) {
        clearInterval(existing.timer);
      }

      // Send initial successful telemetry details
      socket.emit('play_telemetry', { latency: 15, fps: 60, bitrate: '18.4', streamStarted: true });
      socket.emit('play_chat_message', { sender: 'System', text: `Console connected successfully to ${machine.name}.` });
      socket.emit('play_chat_message', { sender: 'System', text: `Inputs mapped: WASD / Arrow Keys for joystick, J/K/L/Space for actions.` });

      // Start countdown loop
      let secondsLeft = SESSION_TIME_LIMIT;
      
      const timer = setInterval(() => {
        secondsLeft--;

        // Periodic telemetry simulation
        if (secondsLeft % 2 === 0) {
          const jitter = Math.floor(Math.random() * 6) - 3; // -3 to 3 ms
          socket.emit('play_telemetry', {
            latency: Math.max(8, 14 + jitter),
            fps: Math.random() > 0.05 ? 60 : 59, // slight fluctuations
            bitrate: (18.0 + Math.random() * 2).toFixed(1)
          });
        }

        // Send countdown notification
        socket.emit('play_timer', { secondsLeft });

        // Warning alerts
        if (secondsLeft === 60) {
          socket.emit('play_chat_message', { sender: 'System', text: 'WARNING: 1 minute remaining in session!' });
        } else if (secondsLeft === 10) {
          socket.emit('play_chat_message', { sender: 'System', text: 'WARNING: 10 seconds remaining! Save your game.' });
        }

        if (secondsLeft <= 0) {
          endSessionInternal(session.id, 'Session Time Expired');
        }
      }, 1000);

      activePlaySessions.set(machineId, {
        timer,
        secondsLeft,
        socketId: socket.id,
        userId: decodedUser.id,
        sessionId: session.id
      });
    });
  });

  // Handle inputs sent by active users
  socket.on('controller_input', ({ machineId, key, action }) => {
    // Log command internally or emit back to room
    // Broadcast key inputs back to play room so virtual UI elements show the active key highlights
    io.to(`room_${machineId}`).emit('remote_input_feedback', { key, action });
  });

  // User manual session release
  socket.on('leave_play_room', ({ sessionId }) => {
    if (sessionId) {
      endSessionInternal(sessionId, 'User left session');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
    
    // Detect if this socket belonged to a running gameplay room
    for (const [machId, sObj] of activePlaySessions.entries()) {
      if (sObj.socketId === socket.id) {
        console.log(`Active session user disconnected from socket. Ending play room session.`);
        endSessionInternal(sObj.sessionId, 'User disconnected');
        break;
      }
    }
  });
});

// Init API Server Listen
server.listen(PORT, () => {
  console.log(`Vortex Play backend API running on port ${PORT}`);
});
