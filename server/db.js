import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const defaultDb = {
  users: [],
  machines: [],
  transactions: [],
  sessions: []
};

// Seed database helper
const seedDb = async (db) => {
  let modified = false;

  // Add default admin if no users exist
  if (db.users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    db.users.push({
      id: 'usr_admin',
      username: 'admin',
      passwordHash,
      isAdmin: true,
      tokenBalance: 1000,
      createdAt: new Date().toISOString()
    });

    // Also add a default regular user for testing
    const userHash = await bcrypt.hash('user123', salt);
    db.users.push({
      id: 'usr_demo',
      username: 'demo',
      passwordHash: userHash,
      isAdmin: false,
      tokenBalance: 10,
      createdAt: new Date().toISOString()
    });

    modified = true;
  }

  // Add default machines if none exist
  if (db.machines.length === 0) {
    db.machines = [
      {
        id: 'mach_ps5_01',
        name: 'PS5 Pro - Tokyo Node 1',
        type: 'ps5',
        status: 'available', // available, in-use, offline
        ipAddress: '192.168.1.100',
        activeGame: 'Gran Turismo 7',
        tokenCostPerSession: 1, // 1 token per 5 minute session
        currentUserId: null,
        currentUsername: null
      },
      {
        id: 'mach_ps5_02',
        name: 'PS5 Pro - Tokyo Node 2',
        type: 'ps5',
        status: 'available',
        ipAddress: '192.168.1.101',
        activeGame: 'Elden Ring: Shadow of the Erdtree',
        tokenCostPerSession: 1,
        currentUserId: null,
        currentUsername: null
      },
      {
        id: 'mach_xbox_01',
        name: 'Xbox Series X - Seattle Node 1',
        type: 'xbox',
        status: 'available',
        ipAddress: '192.168.2.50',
        activeGame: 'Forza Horizon 5',
        tokenCostPerSession: 1,
        currentUserId: null,
        currentUsername: null
      },
      {
        id: 'mach_pc_01',
        name: 'Liquid PC RTX 4090 - Frankfurt',
        type: 'pc',
        status: 'available',
        ipAddress: '10.0.0.12',
        activeGame: 'Cyberpunk 2077 (Path Tracing)',
        tokenCostPerSession: 2,
        currentUserId: null,
        currentUsername: null
      }
    ];
    modified = true;
  }

  return modified;
};

// Safe thread-safe DB read/write
export const readDb = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
      return defaultDb;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading JSON DB, returning default:', err);
    return defaultDb;
  }
};

export const writeDb = (data) => {
  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (err) {
    console.error('Error writing to JSON DB:', err);
    return false;
  }
};

// Helper to generate IDs
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// Database Operations
export const dbOps = {
  // Users
  getUsers: () => readDb().users,
  getUserById: (id) => readDb().users.find(u => u.id === id),
  getUserByUsername: (username) => readDb().users.find(u => u.username.toLowerCase() === username.toLowerCase()),
  createUser: async (username, password, isAdmin = false) => {
    const db = readDb();
    const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) throw new Error('User already exists');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = {
      id: generateId('usr'),
      username,
      passwordHash,
      isAdmin,
      tokenBalance: 0,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDb(db);
    return newUser;
  },
  updateUserTokens: (userId, amount) => {
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    
    db.users[userIndex].tokenBalance = Math.max(0, db.users[userIndex].tokenBalance + amount);
    writeDb(db);
    return db.users[userIndex];
  },

  // Machines
  getMachines: () => readDb().machines,
  getMachineById: (id) => readDb().machines.find(m => m.id === id),
  createMachine: (machineData) => {
    const db = readDb();
    const newMachine = {
      id: generateId('mach'),
      name: machineData.name,
      type: machineData.type || 'ps5',
      status: machineData.status || 'available',
      ipAddress: machineData.ipAddress || '127.0.0.1',
      activeGame: machineData.activeGame || 'Lobby Menu',
      tokenCostPerSession: parseInt(machineData.tokenCostPerSession) || 1,
      currentUserId: null,
      currentUsername: null
    };
    db.machines.push(newMachine);
    writeDb(db);
    return newMachine;
  },
  updateMachine: (id, updates) => {
    const db = readDb();
    const index = db.machines.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Machine not found');

    db.machines[index] = { ...db.machines[index], ...updates };
    writeDb(db);
    return db.machines[index];
  },
  deleteMachine: (id) => {
    const db = readDb();
    const filtered = db.machines.filter(m => m.id !== id);
    if (filtered.length === db.machines.length) throw new Error('Machine not found');
    db.machines = filtered;
    writeDb(db);
    return true;
  },

  // Transactions
  getTransactions: () => readDb().transactions,
  getTransactionsByUserId: (userId) => readDb().transactions.filter(t => t.userId === userId),
  createTransaction: (userId, type, amount, cost = 0, status = 'completed') => {
    const db = readDb();
    const newTx = {
      id: generateId('tx'),
      userId,
      type, // 'purchase' | 'spend'
      amount,
      cost,
      status,
      timestamp: new Date().toISOString()
    };
    db.transactions.push(newTx);
    writeDb(db);
    return newTx;
  },

  // Sessions
  getSessions: () => readDb().sessions,
  getActiveSessionByMachine: (machineId) => readDb().sessions.find(s => s.machineId === machineId && s.status === 'active'),
  getActiveSessionByUser: (userId) => readDb().sessions.find(s => s.userId === userId && s.status === 'active'),
  createSession: (userId, machineId, durationSec) => {
    const db = readDb();
    const newSess = {
      id: generateId('sess'),
      userId,
      machineId,
      startTime: new Date().toISOString(),
      durationSec,
      status: 'active'
    };
    db.sessions.push(newSess);
    writeDb(db);
    return newSess;
  },
  updateSession: (id, updates) => {
    const db = readDb();
    const index = db.sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Session not found');

    db.sessions[index] = { ...db.sessions[index], ...updates };
    writeDb(db);
    return db.sessions[index];
  }
};

// Seed DB on load
const currentDb = readDb();
seedDb(currentDb).then((modified) => {
  if (modified) {
    writeDb(currentDb);
    console.log('Database successfully seeded with default assets.');
  } else {
    console.log('Database loaded successfully (already seeded).');
  }
});
