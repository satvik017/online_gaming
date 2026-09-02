import mongoose from 'mongoose';

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
  sessionDurationMinutes: { type: Number, default: 15 },
  homeBackgroundImageUrl: { type: String, default: '' }
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true }, 
  type: { type: String, required: true, unique: true }, 
  icon: { type: String, default: 'Tv' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const GameSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  categoryId: { type: String, required: true }, 
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
