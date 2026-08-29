import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

// Fix DNS SRV lookup issues on Windows networks
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // fallback if system restricts custom DNS
  }
}

// --- MONGOOSE SCHEMAS & MODELS ---

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  tokenBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const MachineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, default: 'ps5' }, // ps5, xbox, pc
  status: { type: String, default: 'available' }, // available, in-use, offline
  ipAddress: { type: String, default: '127.0.0.1' },
  activeGame: { type: String, default: 'Lobby Menu' },
  tokenCostPerSession: { type: Number, default: 1 },
  currentUserId: { type: String, default: null },
  currentUsername: { type: String, default: null }
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true }, // 'purchase' | 'spend'
  amount: { type: Number, required: true },
  cost: { type: Number, default: 0 },
  status: { type: String, default: 'completed' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  machineId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  durationSec: { type: Number, required: true },
  status: { type: String, default: 'active' }, // active, completed
  endReason: { type: String, default: null }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const Machine = mongoose.model('Machine', MachineSchema);
export const Transaction = mongoose.model('Transaction', TransactionSchema);
export const Session = mongoose.model('Session', SessionSchema);

// Helper to generate IDs
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// --- DATABASE CONNECTION & SEEDING ---

export const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vortex_gaming';
  try {
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB Atlas database.');
    await seedDb();
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err);
    throw err;
  }
};

const seedDb = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('admin123', salt);
      const userHash = await bcrypt.hash('user123', salt);

      await User.create([
        {
          id: 'usr_admin',
          username: 'admin',
          passwordHash: adminHash,
          isAdmin: true,
          tokenBalance: 1000,
          createdAt: new Date()
        },
        {
          id: 'usr_demo',
          username: 'demo',
          passwordHash: userHash,
          isAdmin: false,
          tokenBalance: 10,
          createdAt: new Date()
        }
      ]);
      console.log('Default admin & demo user seeded in MongoDB Atlas.');
    }

    const machineCount = await Machine.countDocuments();
    if (machineCount === 0) {
      await Machine.create([
        {
          id: 'mach_ps5_01',
          name: 'PS5 Pro - Tokyo Node 1',
          type: 'ps5',
          status: 'available',
          ipAddress: '192.168.1.100',
          activeGame: 'Gran Turismo 7',
          tokenCostPerSession: 1,
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
      ]);
      console.log('Default gaming nodes seeded in MongoDB Atlas.');
    }
  } catch (err) {
    console.error('Error seeding MongoDB Atlas database:', err);
  }
};

// --- ASYNC DATABASE OPERATIONS ---

export const dbOps = {
  // Users
  getUsers: async () => {
    return await User.find().lean();
  },

  getUserById: async (id) => {
    return await User.findOne({ id }).lean();
  },

  getUserByUsername: async (username) => {
    if (!username) return null;
    return await User.findOne({ username: new RegExp(`^${username}$`, 'i') }).lean();
  },

  createUser: async (username, password, isAdmin = false) => {
    const existing = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (existing) throw new Error('User already exists');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      id: generateId('usr'),
      username,
      passwordHash,
      isAdmin,
      tokenBalance: 0,
      createdAt: new Date()
    });
    return newUser.toObject();
  },

  updateUserTokens: async (userId, amount) => {
    const user = await User.findOne({ id: userId });
    if (!user) throw new Error('User not found');

    const newBalance = Math.max(0, user.tokenBalance + amount);
    user.tokenBalance = newBalance;
    await user.save();
    return user.toObject();
  },

  // Machines
  getMachines: async () => {
    return await Machine.find().lean();
  },

  getMachineById: async (id) => {
    return await Machine.findOne({ id }).lean();
  },

  createMachine: async (machineData) => {
    const newMachine = await Machine.create({
      id: generateId('mach'),
      name: machineData.name,
      type: machineData.type || 'ps5',
      status: machineData.status || 'available',
      ipAddress: machineData.ipAddress || '127.0.0.1',
      activeGame: machineData.activeGame || 'Lobby Menu',
      tokenCostPerSession: parseInt(machineData.tokenCostPerSession) || 1,
      currentUserId: null,
      currentUsername: null
    });
    return newMachine.toObject();
  },

  updateMachine: async (id, updates) => {
    const updated = await Machine.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    if (!updated) throw new Error('Machine not found');
    return updated;
  },

  deleteMachine: async (id) => {
    const res = await Machine.findOneAndDelete({ id });
    if (!res) throw new Error('Machine not found');
    return true;
  },

  // Transactions
  getTransactions: async () => {
    return await Transaction.find().lean();
  },

  getTransactionsByUserId: async (userId) => {
    return await Transaction.find({ userId }).sort({ timestamp: -1 }).lean();
  },

  createTransaction: async (userId, type, amount, cost = 0, status = 'completed') => {
    const newTx = await Transaction.create({
      id: generateId('tx'),
      userId,
      type,
      amount,
      cost,
      status,
      timestamp: new Date()
    });
    return newTx.toObject();
  },

  // Sessions
  getSessions: async () => {
    return await Session.find().lean();
  },

  getActiveSessionByMachine: async (machineId) => {
    return await Session.findOne({ machineId, status: 'active' }).lean();
  },

  getActiveSessionByUser: async (userId) => {
    return await Session.findOne({ userId, status: 'active' }).lean();
  },

  createSession: async (userId, machineId, durationSec) => {
    const newSess = await Session.create({
      id: generateId('sess'),
      userId,
      machineId,
      startTime: new Date(),
      durationSec,
      status: 'active'
    });
    return newSess.toObject();
  },

  updateSession: async (id, updates) => {
    const updated = await Session.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    if (!updated) throw new Error('Session not found');
    return updated;
  }
};
