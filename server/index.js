import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbOps, connectDB } from './db.js';

const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'vortex-super-secret-key-10982-x';

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

// --- HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Vortex Play Backend API & WebSockets Server',
    timestamp: new Date().toISOString()
  });
});

// --- AUTH API ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const existing = await dbOps.getUserByUsername(username);
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
    const user = await dbOps.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbOps.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      tokenBalance: user.tokenBalance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WALLET & TOKEN API ROUTES ---

app.post('/api/wallet/buy', authenticateToken, async (req, res) => {
  const { amount, cost, cardNumber, cardExpiry, cardCvc } = req.body;

  if (!amount || amount <= 0 || !cost) {
    return res.status(400).json({ error: 'Invalid transaction parameters' });
  }

  if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
    return res.status(400).json({ error: 'Invalid card number' });
  }

  try {
    const updatedUser = await dbOps.updateUserTokens(req.user.id, amount);
    const tx = await dbOps.createTransaction(req.user.id, 'purchase', amount, cost, 'completed');

    res.json({
      message: 'Tokens purchased successfully!',
      tokenBalance: updatedUser.tokenBalance,
      transaction: tx
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/transactions', authenticateToken, async (req, res) => {
  try {
    const txs = await dbOps.getTransactionsByUserId(req.user.id);
    res.json(txs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TOKEN PACKAGES API ROUTES ---

app.get('/api/packages', async (req, res) => {
  try {
    const pkgs = await dbOps.getPackages();
    res.json(pkgs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/packages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pkg = await dbOps.createPackage(req.body);
    io.emit('packages_update', await dbOps.getPackages());
    res.status(201).json(pkg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/packages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await dbOps.updatePackage(req.params.id, req.body);
    io.emit('packages_update', await dbOps.getPackages());
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/packages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbOps.deletePackage(req.params.id);
    io.emit('packages_update', await dbOps.getPackages());
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SYSTEM SETTINGS API ROUTES ---

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await dbOps.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sessionDurationMinutes, homeBackgroundImageUrl } = req.body;
    const duration = parseInt(sessionDurationMinutes);
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Invalid session duration' });
    }
    const updatePayload = { sessionDurationMinutes: duration };
    if (homeBackgroundImageUrl !== undefined) {
      updatePayload.homeBackgroundImageUrl = homeBackgroundImageUrl;
    }
    const updated = await dbOps.updateSettings(updatePayload);
    io.emit('settings_update', updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CATEGORIES & GAMES CATALOG API ROUTES ---

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbOps.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const category = await dbOps.createCategory(req.body);
    io.emit('categories_update', await dbOps.getCategories());
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await dbOps.updateCategory(req.params.id, req.body);
    io.emit('categories_update', await dbOps.getCategories());
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbOps.deleteCategory(req.params.id);
    io.emit('categories_update', await dbOps.getCategories());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const games = await dbOps.getGames();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/games', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const game = await dbOps.createGame(req.body);
    io.emit('games_update', await dbOps.getGames());
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/games/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await dbOps.updateGame(req.params.id, req.body);
    io.emit('games_update', await dbOps.getGames());
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/games/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbOps.deleteGame(req.params.id);
    io.emit('games_update', await dbOps.getGames());
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Users List Route
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbOps.getUsersList();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Game Request
app.post('/api/games/:id/play-request', authenticateToken, async (req, res) => {
  const gameId = req.params.id;
  try {
    const game = await dbOps.getGameById(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    
    if (req.user.tokenBalance < game.tokenCost) {
      return res.status(400).json({ error: 'Insufficient Token Keys' });
    }

    const request = await dbOps.createGameRequest(req.user.id, req.user.username, game.id, game.title);
    io.emit('admin_game_request', request);
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Get Requests
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const requests = await dbOps.getPendingGameRequests();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Approve Request
app.post('/api/admin/requests/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  const { code, link } = req.body;
  if (!code || !link) return res.status(400).json({ error: 'Code and link are required' });

  try {
    const request = await dbOps.updateGameRequest(req.params.id, 'approved', code, link);
    
    // Deduct tokens
    const game = await dbOps.getGameById(request.gameId);
    if (game) {
      await dbOps.addTransaction(request.userId, 'spend', game.tokenCost);
      await dbOps.updateUserBalance(request.userId, -game.tokenCost);
    }

    io.emit('game_request_status_update', request);
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Reject Request
app.post('/api/admin/requests/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const request = await dbOps.updateGameRequest(req.params.id, 'rejected');
    io.emit('game_request_status_update', request);
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REST route to initiate play for a Game
app.post('/api/games/:id/play', authenticateToken, async (req, res) => {
  const gameId = req.params.id;
  const userId = req.user.id;

  try {
    const user = await dbOps.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const game = await dbOps.getGameById(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found in catalog' });

    // Find available machine matching game category (PS4 games can run on PS4 or PS5 hardware nodes)
    const machines = await dbOps.getMachines();
    const availableMachine = machines.find(m => m.status === 'available' && (
      m.type === game.categoryId || 
      m.type.includes(game.categoryId) ||
      (game.categoryId === 'ps4' && (m.type === 'ps5' || m.type === 'ps4'))
    ));

    if (!availableMachine) {
      return res.status(400).json({ error: `All ${game.categoryId.toUpperCase()} gaming stations are currently occupied. Please wait a moment.` });
    }

    const tokenCost = game.tokenCost || availableMachine.tokenCostPerSession || 1;
    if (user.tokenBalance < tokenCost) {
      return res.status(400).json({ error: 'Insufficient token balance. Please purchase more tokens.' });
    }

    await dbOps.updateUserTokens(userId, -tokenCost);
    await dbOps.createTransaction(userId, 'spend', tokenCost, 0, 'completed');

    await dbOps.updateMachine(availableMachine.id, {
      status: 'in-use',
      activeGame: game.title,
      currentUserId: userId,
      currentUsername: user.username
    });

    const settings = await dbOps.getSettings();
    const sessionDurationSec = (settings?.sessionDurationMinutes || 15) * 60;

    const sess = await dbOps.createSession(userId, availableMachine.id, sessionDurationSec);

    io.emit('machines_update', await dbOps.getMachines());
    io.emit('admin_sessions_update');

    res.json({
      message: 'Game session initiated successfully',
      sessionId: sess.id,
      machineId: availableMachine.id,
      machineName: availableMachine.name,
      gameTitle: game.title,
      tokenBalance: user.tokenBalance - tokenCost,
      durationSec: sessionDurationSec
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MACHINES API ROUTES ---

app.get('/api/machines', async (req, res) => {
  try {
    const machines = await dbOps.getMachines();
    res.json(machines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Machine (Admin)
app.post('/api/machines', authenticateToken, requireAdmin, async (req, res) => {
  const { name, type, ipAddress, activeGame, tokenCostPerSession, cpuSpec, gpuSpec, ramSpec, resolutionSpec, regionTag } = req.body;
  if (!name) return res.status(400).json({ error: 'Machine name is required' });

  try {
    const machine = await dbOps.createMachine({
      name,
      type,
      ipAddress,
      activeGame,
      tokenCostPerSession: parseInt(tokenCostPerSession) || 1,
      cpuSpec,
      gpuSpec,
      ramSpec,
      resolutionSpec,
      regionTag,
      status: 'available'
    });
    io.emit('machines_update', await dbOps.getMachines());
    res.status(201).json(machine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Machine (Admin)
app.put('/api/machines/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await dbOps.updateMachine(req.params.id, req.body);
    io.emit('machines_update', await dbOps.getMachines());
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Machine (Admin)
app.delete('/api/machines/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const activeSess = await dbOps.getActiveSessionByMachine(req.params.id);
    if (activeSess) {
      await endSessionInternal(activeSess.id, 'Machine Deleted');
    }

    await dbOps.deleteMachine(req.params.id);
    io.emit('machines_update', await dbOps.getMachines());
    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN CONTROL & STATS ---

app.get('/api/admin/sessions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allSessions = await dbOps.getSessions();
    const sessions = allSessions.filter(s => s.status === 'active');
    const enriched = await Promise.all(sessions.map(async (s) => {
      const user = await dbOps.getUserById(s.userId);
      const mach = await dbOps.getMachineById(s.machineId);
      return {
        ...s,
        username: user ? user.username : 'Unknown',
        machineName: mach ? mach.name : 'Unknown Device',
        machineType: mach ? mach.type : 'ps5'
      };
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbOps.getUsers();
    const txs = await dbOps.getTransactions();
    const machines = await dbOps.getMachines();

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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force End Session Route (Admin)
app.post('/api/admin/sessions/:id/terminate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ended = await endSessionInternal(req.params.id, 'Terminated by Administrator');
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

const activePlaySessions = new Map();
const SESSION_TIME_LIMIT = 5 * 60; // 5 minutes (300 seconds)

const endSessionInternal = async (sessionId, reason = 'Time expired') => {
  const db = await dbOps.getSessions();
  const sess = db.find(s => s.id === sessionId && s.status === 'active');
  if (!sess) return false;

  console.log(`Ending session ${sessionId}. Reason: ${reason}`);

  await dbOps.updateSession(sess.id, {
    status: 'completed',
    endTime: new Date(),
    endReason: reason
  });

  const mach = await dbOps.getMachineById(sess.machineId);
  if (mach) {
    await dbOps.updateMachine(sess.machineId, {
      status: 'available',
      currentUserId: null,
      currentUsername: null
    });
  }

  const sessionTimerObj = activePlaySessions.get(sess.machineId);
  if (sessionTimerObj) {
    clearInterval(sessionTimerObj.timer);
    io.to(sessionTimerObj.socketId).emit('play_session_end', { reason });
    activePlaySessions.delete(sess.machineId);
  }

  io.emit('machines_update', await dbOps.getMachines());
  io.emit('admin_sessions_update');

  return true;
};

// REST route to initiate play
app.post('/api/machines/:id/play', authenticateToken, async (req, res) => {
  const machineId = req.params.id;
  const userId = req.user.id;

  try {
    const user = await dbOps.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const machine = await dbOps.getMachineById(machineId);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    if (machine.status !== 'available') {
      return res.status(400).json({ error: 'Machine is not available to play' });
    }

    const tokenCost = machine.tokenCostPerSession;
    if (user.tokenBalance < tokenCost) {
      return res.status(400).json({ error: 'Insufficient token balance. Please purchase more tokens.' });
    }

    await dbOps.updateUserTokens(userId, -tokenCost);
    await dbOps.createTransaction(userId, 'spend', tokenCost, 0, 'completed');

    await dbOps.updateMachine(machineId, {
      status: 'in-use',
      currentUserId: userId,
      currentUsername: user.username
    });

    const settings = await dbOps.getSettings();
    const sessionDurationSec = (settings?.sessionDurationMinutes || 15) * 60;

    const sess = await dbOps.createSession(userId, machineId, sessionDurationSec);

    io.emit('machines_update', await dbOps.getMachines());
    io.emit('admin_sessions_update');

    res.json({
      message: 'Session initiated successfully',
      sessionId: sess.id,
      tokenBalance: user.tokenBalance - tokenCost,
      durationSec: sessionDurationSec
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket server event connections
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('join_play_room', ({ token, machineId, sessionId }) => {
    if (!token || !machineId || !sessionId) {
      socket.emit('play_error', { message: 'Parameters missing for play room access' });
      return;
    }

    jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
      if (err) {
        socket.emit('play_error', { message: 'Socket auth token failed' });
        return;
      }

      const machine = await dbOps.getMachineById(machineId);
      const session = await dbOps.getActiveSessionByMachine(machineId);

      if (!session || session.id !== sessionId || session.userId !== decodedUser.id || machine?.currentUserId !== decodedUser.id) {
        socket.emit('play_error', { message: 'Invalid active session configuration' });
        return;
      }

      socket.join(`room_${machineId}`);
      console.log(`User ${decodedUser.username} entered play room for ${machineId}`);

      const existing = activePlaySessions.get(machineId);
      if (existing) {
        clearInterval(existing.timer);
      }

      socket.emit('play_telemetry', { latency: 15, fps: 60, bitrate: '18.4', streamStarted: true });
      socket.emit('play_chat_message', { sender: 'System', text: `Console connected successfully to ${machine.name}.` });
      socket.emit('play_chat_message', { sender: 'System', text: `Inputs mapped: WASD / Arrow Keys for joystick, J/K/L/Space for actions.` });

      const settings = await dbOps.getSettings();
      let secondsLeft = session.durationSec || (settings?.sessionDurationMinutes || 15) * 60;

      const timer = setInterval(async () => {
        secondsLeft--;

        if (secondsLeft % 2 === 0) {
          const jitter = Math.floor(Math.random() * 6) - 3;
          socket.emit('play_telemetry', {
            latency: Math.max(8, 14 + jitter),
            fps: Math.random() > 0.05 ? 60 : 59,
            bitrate: (18.0 + Math.random() * 2).toFixed(1)
          });
        }

        socket.emit('play_timer', { secondsLeft });

        if (secondsLeft === 60) {
          socket.emit('play_chat_message', { sender: 'System', text: 'WARNING: 1 minute remaining in session!' });
        } else if (secondsLeft === 10) {
          socket.emit('play_chat_message', { sender: 'System', text: 'WARNING: 10 seconds remaining! Save your game.' });
        }

        if (secondsLeft <= 0) {
          await endSessionInternal(session.id, 'Session Time Expired');
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

  socket.on('controller_input', ({ machineId, key, action }) => {
    io.to(`room_${machineId}`).emit('remote_input_feedback', { key, action });
  });

  socket.on('leave_play_room', async ({ sessionId }) => {
    if (sessionId) {
      await endSessionInternal(sessionId, 'User left session');
    }
  });

  socket.on('disconnect', async () => {
    console.log(`Socket client disconnected: ${socket.id}`);
    for (const [machId, sObj] of activePlaySessions.entries()) {
      if (sObj.socketId === socket.id) {
        console.log(`Active session user disconnected from socket. Ending play room session.`);
        await endSessionInternal(sObj.sessionId, 'User disconnected');
        break;
      }
    }
  });
});

// Init Database connection & API Server Listen
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Vortex Play backend API running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to start server due to DB connection error:', err);
});
