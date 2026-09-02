import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import { User, Machine, Transaction, Session, Package, Settings, Category, Game } from '../models/index.js';

// Fix DNS SRV lookup issues on Windows networks
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {}
}

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
