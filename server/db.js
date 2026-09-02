import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

/**
 * Vortex Play - Database Access Layer & MongoDB Atlas Interface
 * Handles Mongoose Schemas (User, Machine, Transaction, Session, Package, Settings),
 * database auto-seeding, DNS SRV resolution for Windows, and async dbOps helper functions.
 */

// Fix DNS SRV lookup issues on Windows networks
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // fallback if system restricts custom DNS
  }
}

// --- MONGOOSE SCHEMAS & MODELS ---

// User Profile Schema: Tracks credentials, admin status, and token key balance
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
  cpuSpec: { type: String, default: 'High-Performance Zen/Core Processor' },
  gpuSpec: { type: String, default: 'Custom Ray-Tracing GPU' },
  ramSpec: { type: String, default: '16GB High-Speed RAM' },
  resolutionSpec: { type: String, default: '4K @ 60 FPS' },
  regionTag: { type: String, default: 'Tokyo - Asia East' },
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

const PackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  tokens: { type: Number, required: true },
  price: { type: Number, required: true },
  desc: { type: String, default: '' },
  recommended: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  sessionDurationMinutes: { type: Number, default: 15 }, // duration in minutes per token session
  homeBackgroundImageUrl: { type: String, default: '' }
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true }, // PlayStation 5, Xbox Series X, Gaming PC
  type: { type: String, required: true, unique: true }, // ps5, xbox, pc
  icon: { type: String, default: 'Tv' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const GameSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  categoryId: { type: String, required: true }, // ps5, xbox, pc
  tokenCost: { type: Number, default: 1 },
  genre: { type: String, default: 'Action / Adventure' },
  coverUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const Machine = mongoose.model('Machine', MachineSchema);
export const Transaction = mongoose.model('Transaction', TransactionSchema);
export const Session = mongoose.model('Session', SessionSchema);
export const Package = mongoose.model('Package', PackageSchema);
export const Settings = mongoose.model('Settings', SettingsSchema);
export const Category = mongoose.model('Category', CategorySchema);
export const Game = mongoose.model('Game', GameSchema);

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
          cpuSpec: 'Custom AMD Zen 2 8-Core',
          gpuSpec: 'RDNA 2 Engine (10.28 TFLOPS)',
          ramSpec: '16GB GDDR6 Unified',
          resolutionSpec: '4K @ 60 FPS',
          regionTag: 'Tokyo - Asia East',
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
          cpuSpec: 'Custom AMD Zen 2 8-Core',
          gpuSpec: 'RDNA 2 Engine (10.28 TFLOPS)',
          ramSpec: '16GB GDDR6 Unified',
          resolutionSpec: '4K @ 60 FPS',
          regionTag: 'Tokyo - Asia East',
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
          cpuSpec: 'Custom AMD Zen 2 8-Core (3.8 GHz)',
          gpuSpec: 'RDNA 2 Engine (12 TFLOPS)',
          ramSpec: '16GB GDDR6',
          resolutionSpec: '4K @ 120 FPS',
          regionTag: 'Seattle - US West',
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
          cpuSpec: 'Intel Core i9-14900K (24-Core)',
          gpuSpec: 'NVIDIA GeForce RTX 4090 24GB',
          ramSpec: '64GB DDR5 6000MHz',
          resolutionSpec: '4K @ 144 FPS (DLSS 3.5)',
          regionTag: 'Frankfurt - EU Central',
          currentUserId: null,
          currentUsername: null
        }
      ]);
      console.log('Default gaming nodes seeded in MongoDB Atlas.');
    }

    const packageCount = await Package.countDocuments();
    if (packageCount === 0) {
      await Package.create([
        { id: 'pkg_starter', title: 'Casual Pack', tokens: 5, price: 5.00, desc: 'Perfect for a quick session.', recommended: false },
        { id: 'pkg_pro', title: 'Gamer Pack', tokens: 12, price: 10.00, desc: 'Most Popular. Extra play time.', recommended: true },
        { id: 'pkg_elite', title: 'Pro Streamer Pack', tokens: 30, price: 20.00, desc: 'Ultimate package for hardcore gamers.', recommended: false }
      ]);
      console.log('Default token packages seeded in MongoDB Atlas.');
    }

    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({ key: 'global', sessionDurationMinutes: 15 });
      console.log('Default system settings seeded in MongoDB Atlas.');
    }

    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      await Category.create([
        { id: 'cat_ps5', name: 'PlayStation 5', type: 'ps5', icon: 'Tv', description: 'Next-gen Sony 4K console gaming cluster' },
        { id: 'cat_ps4', name: 'PlayStation 4', type: 'ps4', icon: 'Tv', description: 'Classic PS4 Pro hits & exclusive remastered titles' },
        { id: 'cat_xbox', name: 'Xbox Series X', type: 'xbox', icon: 'Monitor', description: 'High-performance Microsoft Xbox gaming node array' },
        { id: 'cat_pc', name: 'Liquid PC Rig', type: 'pc', icon: 'Laptop', description: 'Ultra-settings RTX 4090 Ray-Tracing cloud PC rigs' }
      ]);
      console.log('Default categories seeded in MongoDB Atlas.');
    }

    const gameCount = await Game.countDocuments();
    if (gameCount === 0) {
      await Game.create([
        {
          id: 'game_gtav',
          title: 'Grand Theft Auto V (Expanded)',
          categoryId: 'ps5',
          tokenCost: 1,
          genre: 'Open World Action',
          coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
          description: 'Experience Los Santos in ray-traced 60 FPS performance mode on PS5 Pro.'
        },
        {
          id: 'game_spiderman2',
          title: "Marvel's Spider-Man 2",
          categoryId: 'ps5',
          tokenCost: 1,
          genre: 'Action / Superhero',
          coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
          description: 'Swing through New York as Peter Parker and Miles Morales with near-instant loading.'
        },
        {
          id: 'game_gow_ps4',
          title: 'God of War Ragnarök (PS4)',
          categoryId: 'ps4',
          tokenCost: 1,
          genre: 'Action Adventure',
          coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
          description: 'Embark on an epic Norse mythological journey with Kratos and Atreus.'
        },
        {
          id: 'game_gt7',
          title: 'Gran Turismo 7',
          categoryId: 'ps5',
          tokenCost: 1,
          genre: 'Racing Simulator',
          coverUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=600&auto=format&fit=crop&q=80',
          description: 'Real Driving Simulator featuring over 400 cars and ultra-responsive haptic feedback.'
        },
        {
          id: 'game_forza5',
          title: 'Forza Horizon 5',
          categoryId: 'xbox',
          tokenCost: 1,
          genre: 'Open World Racing',
          coverUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80',
          description: 'Explore the vibrant open world landscapes of Mexico in 4K 120Hz on Xbox Series X.'
        },
        {
          id: 'game_cyberpunk',
          title: 'Cyberpunk 2077 (Path Tracing)',
          categoryId: 'pc',
          tokenCost: 2,
          genre: 'Sci-Fi RPG',
          coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
          description: 'Full Ray Tracing Path Tracing Overdrive Mode powered by NVIDIA RTX 4090 DLSS 3.5.'
        }
      ]);
      console.log('Default games catalog seeded in MongoDB Atlas.');
    }
  } catch (err) {
    console.error('Error seeding MongoDB Atlas database:', err);
  }
};

// --- ASYNC DATABASE OPERATIONS ---

export const dbOps = {
  // Categories
  getCategories: async () => {
    return await Category.find().lean();
  },

  createCategory: async (catData) => {
    const newCat = await Category.create({
      id: generateId('cat'),
      name: catData.name,
      type: catData.type || 'ps5',
      icon: catData.icon || 'Tv',
      description: catData.description || '',
      isActive: catData.isActive !== undefined ? catData.isActive : true
    });
    return newCat.toObject();
  },

  updateCategory: async (id, updates) => {
    const updated = await Category.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    if (!updated) throw new Error('Category not found');
    return updated;
  },

  deleteCategory: async (id) => {
    const res = await Category.findOneAndDelete({ id });
    if (!res) throw new Error('Category not found');
    return true;
  },

  // Games Catalog
  getGames: async () => {
    return await Game.find().lean();
  },

  getGameById: async (id) => {
    return await Game.findOne({ id }).lean();
  },

  getGamesByCategory: async (categoryId) => {
    return await Game.find({ categoryId }).lean();
  },

  createGame: async (gameData) => {
    const newGame = await Game.create({
      id: generateId('game'),
      title: gameData.title,
      categoryId: gameData.categoryId || 'ps5',
      tokenCost: parseInt(gameData.tokenCost) || 1,
      genre: gameData.genre || 'Action / Adventure',
      coverUrl: gameData.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      description: gameData.description || '',
      isActive: gameData.isActive !== undefined ? gameData.isActive : true
    });
    return newGame.toObject();
  },

  updateGame: async (id, updates) => {
    const updated = await Game.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    if (!updated) throw new Error('Game not found');
    return updated;
  },

  deleteGame: async (id) => {
    const res = await Game.findOneAndDelete({ id });
    if (!res) throw new Error('Game not found');
    return true;
  },

  // Users Management List (Admin)
  getUsersList: async () => {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    return users;
  },
  // Token Packages
  getPackages: async () => {
    return await Package.find().lean();
  },

  createPackage: async (pkgData) => {
    const newPkg = await Package.create({
      id: generateId('pkg'),
      title: pkgData.title || 'Custom Pack',
      tokens: parseInt(pkgData.tokens) || 5,
      price: parseFloat(pkgData.price) || 5.00,
      desc: pkgData.desc || '',
      recommended: Boolean(pkgData.recommended),
      isActive: pkgData.isActive !== undefined ? pkgData.isActive : true
    });
    return newPkg.toObject();
  },

  updatePackage: async (id, updates) => {
    const updated = await Package.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    if (!updated) throw new Error('Package not found');
    return updated;
  },

  deletePackage: async (id) => {
    const res = await Package.findOneAndDelete({ id });
    if (!res) throw new Error('Package not found');
    return true;
  },

  // Settings & Session Duration
  getSettings: async () => {
    let settings = await Settings.findOne({ key: 'global' }).lean();
    if (!settings) {
      const created = await Settings.create({ key: 'global', sessionDurationMinutes: 15 });
      settings = created.toObject();
    }
    return settings;
  },

  updateSettings: async (updates) => {
    const updated = await Settings.findOneAndUpdate({ key: 'global' }, { $set: updates }, { new: true, upsert: true }).lean();
    return updated;
  },

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
      cpuSpec: machineData.cpuSpec || 'High-Performance Zen/Core Processor',
      gpuSpec: machineData.gpuSpec || 'Custom Ray-Tracing GPU',
      ramSpec: machineData.ramSpec || '16GB High-Speed RAM',
      resolutionSpec: machineData.resolutionSpec || '4K @ 60 FPS',
      regionTag: machineData.regionTag || 'Tokyo - Asia East',
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
