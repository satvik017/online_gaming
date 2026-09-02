import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Gamepad2, 
  Coins, 
  User, 
  LogOut, 
  Plus, 
  Trash2, 
  Play, 
  Clock, 
  Cpu, 
  Signal, 
  Activity, 
  CreditCard, 
  History, 
  Shield, 
  Laptop, 
  Tv, 
  Monitor, 
  Layers,
  Send,
  AlertTriangle,
  LayoutDashboard,
  Users,
  Sparkles,
  Filter,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  Key,
  Edit3,
  Upload,
  Image as ImageIcon,
  Zap,
  CheckCircle2,
  Star,
  Flame,
  Globe,
  ArrowRight,
  Menu,
  X,
  Info
} from 'lucide-react';
import { uploadGameCoverToSupabase, isSupabaseConfigured } from './supabase.js';

// Production Backend API & WebSockets URL (reads from VITE_BACKEND_URL env var, defaults to localhost:5050)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

// Deterministic Random Animal Avatar System for User Profile
const ANIMAL_AVATARS = [
  { emoji: '🦊', name: 'Cyber Fox', color: '#f97316' },
  { emoji: '🦁', name: 'Alpha Lion', color: '#eab308' },
  { emoji: '🐯', name: 'Neon Tiger', color: '#ea580c' },
  { emoji: '🐼', name: 'Zen Panda', color: '#06b6d4' },
  { emoji: '🐺', name: 'Shadow Wolf', color: '#6366f1' },
  { emoji: '🦅', name: 'Sky Eagle', color: '#3b82f6' },
  { emoji: '🐉', name: 'Storm Dragon', color: '#0284c7' },
  { emoji: '🦄', name: 'Mystic Unicorn', color: '#ec4899' }
];

const getAnimalAvatar = (username) => {
  if (!username) return ANIMAL_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[index];
};

function App() {
  // Dynamic Theme (light / dark)
  const [theme, setTheme] = useState(localStorage.getItem('vortex_theme') || 'light');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');

  // Apply theme data attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vortex_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Navigation & Authentication
  const [token, setToken] = useState(localStorage.getItem('vortex_token') || '');
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); // landing, login, register, lobby, wallet, play, admin
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [homeCategoryFilter, setHomeCategoryFilter] = useState('all'); // all, ps5, xbox, pc
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Input fields for Auth
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Core Data State
  const [machines, setMachines] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Active Gaming Session State
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(0);
  const [sessionTelemetry, setSessionTelemetry] = useState({ latency: 12, fps: 60, bitrate: '18.2' });
  const [sessionLogs, setSessionLogs] = useState([]);
  const [activeKeys, setActiveKeys] = useState({});

  // Wallet Packages & Payment Modal
  const [checkoutPackage, setCheckoutPackage] = useState(null); // null or { tokens, price }
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardFlipped, setCardFlipped] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Admin Dashboard State
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, totalTokensSold: 0, totalRevenue: 0, totalActivePlayers: 0 });
  const [adminSessions, setAdminSessions] = useState([]);
  
  // Admin form to add machine
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineType, setNewMachineType] = useState('ps5');
  const [newMachineIp, setNewMachineIp] = useState('192.168.1.100');
  const [newMachineGame, setNewMachineGame] = useState('Elden Ring');
  const [newMachineCost, setNewMachineCost] = useState(1);
  const [newMachineCpu, setNewMachineCpu] = useState('Custom AMD Zen 2 8-Core');
  const [newMachineGpu, setNewMachineGpu] = useState('RDNA 2 Engine (10.28 TFLOPS)');
  const [newMachineRam, setNewMachineRam] = useState('16GB GDDR6 Unified');
  const [newMachineResolution, setNewMachineResolution] = useState('4K @ 60 FPS');
  const [newMachineRegion, setNewMachineRegion] = useState('Tokyo - Asia East');
  const [adminActionError, setAdminActionError] = useState('');

  // Sockets & Refs
  const socketRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const logTerminalEndRef = useRef(null);

  // Category-Wise Games Catalog State
  const [categories, setCategories] = useState([
    { id: 'cat_ps5', name: 'PlayStation 5', type: 'ps5', icon: 'Tv', desc: 'Next-Gen 4K Ray-Tracing PS5 Pro Hardware Nodes' },
    { id: 'cat_ps4', name: 'PlayStation 4', type: 'ps4', icon: 'Tv', desc: 'Classic PS4 Exclusives & Remastered Hits' },
    { id: 'cat_xbox', name: 'Xbox Series X', type: 'xbox', icon: 'Monitor', desc: 'High-framerate 120Hz Xbox Cloud Clusters' },
    { id: 'cat_pc', name: 'Liquid PC Rig', type: 'pc', icon: 'Laptop', desc: 'Ultra-spec RTX 4090 Ray-Tracing Liquid PC Arrays' }
  ]);
  const [games, setGames] = useState([]);
  const [selectedLobbyCategory, setSelectedLobbyCategory] = useState(null); // null = Category Selection Cards, 'ps5'|'ps4'|'xbox'|'pc' = Selected Games Catalog
  const [gameDetailModal, setGameDetailModal] = useState(null); // null or selected game object for blurred popup modal
  const [launchingGameId, setLaunchingGameId] = useState(null);

  // Admin Sidebar & Users State
  const [adminTab, setAdminTab] = useState('overview'); // overview, games, nodes, pricing, sessions, players
  const [adminUsersList, setAdminUsersList] = useState([]);

  // Admin selected items for CRUD operations
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [selectedPkgId, setSelectedPkgId] = useState(null);

  // Admin Add Game Form State
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameCategory, setNewGameCategory] = useState('ps5');
  const [newGameCost, setNewGameCost] = useState(1);
  const [newGameGenre, setNewGameGenre] = useState('Action / Adventure');
  const [newGameCover, setNewGameCover] = useState('');
  const [newGameDesc, setNewGameDesc] = useState('');
  const [gameActionError, setGameActionError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Admin Machine Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tv');

  // File Upload Handler for Supabase Storage
  const handleSupabaseFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, etc.).');
      return;
    }

    setUploadingImage(true);
    setGameActionError('');

    try {
      if (isSupabaseConfigured) {
        // Upload directly to Supabase Storage bucket 'game-covers'
        const publicUrl = await uploadGameCoverToSupabase(file);
        setNewGameCover(publicUrl);
      } else {
        throw new Error('Supabase credentials (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are missing in environment variables.');
      }
    } catch (err) {
      setGameActionError(`Supabase Storage Notice: ${err.message}`);
      // Fallback preview so admin is never blocked from adding game cover
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setNewGameCover(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // Admin Package & Settings Config State
  const [packages, setPackages] = useState([
    { id: 'pkg_starter', tokens: 5, price: 5.00, title: 'Casual Pack', desc: 'Perfect for a quick session.' },
    { id: 'pkg_pro', tokens: 12, price: 10.00, title: 'Gamer Pack', desc: 'Most Popular. Extra play time.', recommended: true },
    { id: 'pkg_elite', tokens: 30, price: 20.00, title: 'Pro Streamer Pack', desc: 'Ultimate package for hardcore gamers.' }
  ]);
  const [systemSettings, setSystemSettings] = useState({ sessionDurationMinutes: 15 });
  const [newPkgTitle, setNewPkgTitle] = useState('');
  const [newPkgTokens, setNewPkgTokens] = useState(10);
  const [newPkgPrice, setNewPkgPrice] = useState(10.00);
  const [newPkgDesc, setNewPkgDesc] = useState('');
  const [newPkgRecommended, setNewPkgRecommended] = useState(false);
  const [configDurationMinutes, setConfigDurationMinutes] = useState(15);
  const [packageActionError, setPackageActionError] = useState('');
  const [settingsActionError, setSettingsActionError] = useState('');

  // Helper: Enforce headers and wrapper for fetch API
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  };

  // Sync token to localstorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('vortex_token', token);
      fetchCurrentUser();
    } else {
      localStorage.removeItem('vortex_token');
      setUser(null);
    }
  }, [token]);

  // Fetch Current Logged In User
  const fetchCurrentUser = async () => {
    try {
      const userData = await apiFetch('/api/auth/me');
      setUser(userData);
      if (currentView === 'landing' || currentView === 'login' || currentView === 'register') {
        setCurrentView('lobby');
      }
    } catch (err) {
      setToken('');
    }
  };

  // Fetch Core Data
  const fetchMachines = async () => {
    try {
      const data = await apiFetch('/api/machines');
      setMachines(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/categories');
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGames = async () => {
    try {
      const data = await apiFetch('/api/games');
      setGames(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const data = await apiFetch('/api/admin/users');
      setAdminUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPackages = async () => {
    try {
      const data = await apiFetch('/api/packages');
      setPackages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/api/settings');
      setSystemSettings(data);
      if (data.sessionDurationMinutes) {
        setConfigDurationMinutes(data.sessionDurationMinutes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load basic components on boot
  useEffect(() => {
    fetchMachines();
    fetchCategories();
    fetchGames();
    fetchPackages();
    fetchSettings();
    const interval = setInterval(() => {
      fetchMachines();
      fetchCategories();
      fetchGames();
      fetchPackages();
      fetchSettings();
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Socket Listener Initialization
  useEffect(() => {
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('machines_update', (updatedMachines) => {
      setMachines(updatedMachines);
    });

    socketRef.current.on('packages_update', (updatedPkgs) => {
      setPackages(updatedPkgs);
    });

    socketRef.current.on('settings_update', (updatedSettings) => {
      setSystemSettings(updatedSettings);
      if (updatedSettings.sessionDurationMinutes) {
        setConfigDurationMinutes(updatedSettings.sessionDurationMinutes);
      }
    });

    socketRef.current.on('play_timer', ({ secondsLeft }) => {
      setSessionSecondsLeft(secondsLeft);
    });

    socketRef.current.on('play_telemetry', (telemetry) => {
      setSessionTelemetry((prev) => ({ ...prev, ...telemetry }));
    });

    socketRef.current.on('play_chat_message', ({ sender, text }) => {
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSessionLogs((prev) => [...prev, `[${timeString}] ${sender}: ${text}`]);
    });

    socketRef.current.on('remote_input_feedback', ({ key, action }) => {
      setActiveKeys((prev) => ({ ...prev, [key]: action === 'down' }));
    });

    socketRef.current.on('play_session_end', ({ reason }) => {
      alert(`Game Session Ended: ${reason}`);
      cleanupGameLoop();
      setActiveSession(null);
      setSelectedMachine(null);
      fetchCurrentUser();
      setCurrentView('lobby');
    });

    socketRef.current.on('admin_sessions_update', () => {
      if (user?.isAdmin) {
        fetchAdminData();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  // Auto scroll telemetry logs
  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionLogs]);

  // Admin Data Pull
  const fetchAdminData = async () => {
    try {
      const stats = await apiFetch('/api/admin/stats');
      setAdminStats(stats);
      const activeSess = await apiFetch('/api/admin/sessions');
      setAdminSessions(activeSess);
      fetchAdminUsers();
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger admin poll when going to admin page
  useEffect(() => {
    if (currentView === 'admin' && user?.isAdmin) {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 5000);
      return () => clearInterval(interval);
    }
  }, [currentView, user]);

  // Load transaction history
  const fetchTransactionHistory = async () => {
    try {
      const data = await apiFetch('/api/wallet/transactions');
      setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentView === 'wallet' && token) {
      fetchTransactionHistory();
    }
  }, [currentView]);

  // Handle Authentication submit
  const handleAuth = async (isRegister) => {
    setAuthError('');
    setAuthLoading(true);
    if (!usernameInput || !passwordInput) {
      setAuthError('Please fill out all fields');
      setAuthLoading(false);
      return;
    }
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      setToken(data.token);
      setUser(data.user);
      setUsernameInput('');
      setPasswordInput('');
      setCurrentView('lobby');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    if (activeSession) {
      socketRef.current.emit('leave_play_room', { sessionId: activeSession.sessionId });
    }
    setToken('');
    setUser(null);
    setCurrentView('landing');
  };

  // --- TOKEN PURCHASE LOGIC ---
  const selectTokenPackage = (pkg) => {
    setCheckoutPackage(pkg);
    setPaymentSuccess(false);
    setPaymentError('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvc('');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setPaymentProcessing(true);

    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      setPaymentError('Invalid card number (must be 16 digits)');
      setPaymentProcessing(false);
      return;
    }
    if (!cardExpiry || !cardExpiry.includes('/')) {
      setPaymentError('Invalid expiry (MM/YY)');
      setPaymentProcessing(false);
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      setPaymentError('Invalid Security Code');
      setPaymentProcessing(false);
      return;
    }

    try {
      const res = await apiFetch('/api/wallet/buy', {
        method: 'POST',
        body: JSON.stringify({
          amount: checkoutPackage.tokens,
          cost: checkoutPackage.price,
          cardNumber,
          cardExpiry,
          cardCvc
        })
      });

      setPaymentSuccess(true);
      setUser((prev) => ({ ...prev, tokenBalance: res.tokenBalance }));
      fetchTransactionHistory();
      setTimeout(() => {
        setCheckoutPackage(null);
        setPaymentSuccess(false);
      }, 2000);
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Formatter helpers for checkout card input
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean.length >= 2) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    return clean;
  };

  // --- PLAY SESSION INITIATION ---
  const handleStartPlay = async (machine) => {
    if (!user) {
      setCurrentView('login');
      return;
    }
    if (user.tokenBalance < machine.tokenCostPerSession) {
      alert('Insufficient token balance! Please top up.');
      setCurrentView('wallet');
      return;
    }

    const confirmPlay = window.confirm(`Start session on ${machine.name}? This will deduct ${machine.tokenCostPerSession} token(s).`);
    if (!confirmPlay) return;

    try {
      const res = await apiFetch(`/api/machines/${machine.id}/play`, {
        method: 'POST'
      });

      setSelectedMachine(machine);
      setActiveSession(res);
      setSessionSecondsLeft(res.durationSec);
      setSessionLogs([]);
      setCurrentView('play');
      
      // Notify websocket server of room entry
      socketRef.current.emit('join_play_room', {
        token,
        machineId: machine.id,
        sessionId: res.sessionId
      });

      // Launch canvas game rendering loop
      setTimeout(() => initGameLoop(machine.id), 200);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuitPlay = () => {
    if (window.confirm('Are you sure you want to end your gaming session early? Tokens are non-refundable.')) {
      socketRef.current.emit('leave_play_room', { sessionId: activeSession.sessionId });
    }
  };

  // --- INTERACTIVE CANVAS GAME EMULATOR LOOP ---
  const initGameLoop = (machineId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set internal resolution
    canvas.width = 800;
    canvas.height = 450;

    // Game variables
    let player = { x: 400, y: 380, width: 35, height: 35, speed: 5, color: '#00F3FF' };
    let projectiles = [];
    let enemies = [];
    let score = 0;
    let particles = [];
    let frame = 0;
    let bgY = 0;

    // Capture keys on local play area
    const handleKeyDown = (e) => {
      let keyMapped = null;
      if (['ArrowLeft', 'KeyA', 'a'].includes(e.code)) keyMapped = 'L_Dpad';
      if (['ArrowRight', 'KeyD', 'd'].includes(e.code)) keyMapped = 'R_Dpad';
      if (['ArrowUp', 'KeyW', 'w'].includes(e.code)) keyMapped = 'U_Dpad';
      if (['ArrowDown', 'KeyS', 's'].includes(e.code)) keyMapped = 'D_Dpad';
      if (['Space', 'KeyJ', 'j'].includes(e.code)) keyMapped = 'Btn_A';
      if (['KeyK', 'k'].includes(e.code)) keyMapped = 'Btn_B';
      if (['KeyL', 'l'].includes(e.code)) keyMapped = 'Btn_X';

      if (keyMapped) {
        e.preventDefault();
        socketRef.current.emit('controller_input', { machineId, key: keyMapped, action: 'down' });
      }
    };

    const handleKeyUp = (e) => {
      let keyMapped = null;
      if (['ArrowLeft', 'KeyA', 'a'].includes(e.code)) keyMapped = 'L_Dpad';
      if (['ArrowRight', 'KeyD', 'd'].includes(e.code)) keyMapped = 'R_Dpad';
      if (['ArrowUp', 'KeyW', 'w'].includes(e.code)) keyMapped = 'U_Dpad';
      if (['ArrowDown', 'KeyS', 's'].includes(e.code)) keyMapped = 'D_Dpad';
      if (['Space', 'KeyJ', 'j'].includes(e.code)) keyMapped = 'Btn_A';
      if (['KeyK', 'k'].includes(e.code)) keyMapped = 'Btn_B';
      if (['KeyL', 'l'].includes(e.code)) keyMapped = 'Btn_X';

      if (keyMapped) {
        socketRef.current.emit('controller_input', { machineId, key: keyMapped, action: 'up' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Save listeners to clean up later
    canvas._cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };

    const updateAndDraw = () => {
      frame++;
      
      // Clear Screen
      ctx.fillStyle = '#060713';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Scrolling Retro Space Grid
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
      ctx.lineWidth = 1;
      bgY = (bgY + 2) % 40;
      for (let y = bgY; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Handle controller inputs state (activeKeys holds button feedback from sockets)
      if (activeKeys['L_Dpad']) player.x = Math.max(player.width, player.x - player.speed);
      if (activeKeys['R_Dpad']) player.x = Math.min(canvas.width - player.width, player.x + player.speed);
      if (activeKeys['U_Dpad']) player.y = Math.max(player.height, player.y - player.speed);
      if (activeKeys['D_Dpad']) player.y = Math.min(canvas.height - player.height, player.y + player.speed);
      
      // Auto-throttle weapon fires to simulate lag buffer latency
      if (activeKeys['Btn_A'] && frame % 10 === 0) {
        projectiles.push({ x: player.x, y: player.y - 20, size: 4, speed: 7, color: '#00F3FF' });
      }

      // Spawn Enemies
      if (frame % 45 === 0) {
        enemies.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          width: 30,
          height: 30,
          speed: Math.random() * 2 + 2,
          color: '#FF0055',
          hp: 1
        });
      }

      // Draw Player Space Fighter (Cyber Theme)
      ctx.fillStyle = player.color;
      ctx.shadowColor = '#00F3FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 18);
      ctx.lineTo(player.x - 15, player.y + 12);
      ctx.lineTo(player.x + 15, player.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0; // reset glow

      // Draw Engine Thruster particle flames
      if (frame % 3 === 0) {
        particles.push({
          x: player.x + (Math.random() * 10 - 5),
          y: player.y + 15,
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 2 + 1,
          life: 20,
          color: 'rgba(255, 0, 85, 0.8)'
        });
      }

      // Projectiles logic
      projectiles.forEach((proj, idx) => {
        proj.y -= proj.speed;
        
        // Render projectile with glow
        ctx.fillStyle = proj.color;
        ctx.fillRect(proj.x - 2, proj.y, 4, 10);

        if (proj.y < 0) projectiles.splice(idx, 1);
      });

      // Enemies logic
      enemies.forEach((enemy, eIdx) => {
        enemy.y += enemy.speed;

        // Render Enemy core
        ctx.fillStyle = enemy.color;
        ctx.shadowColor = '#FF0055';
        ctx.shadowBlur = 8;
        ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2, enemy.width, enemy.height);
        ctx.shadowBlur = 0;

        // Collision with projectiles
        projectiles.forEach((proj, pIdx) => {
          const dx = Math.abs(proj.x - enemy.x);
          const dy = Math.abs(proj.y - enemy.y);
          if (dx < enemy.width/2 && dy < enemy.height/2) {
            enemy.hp--;
            projectiles.splice(pIdx, 1);

            // Spawn explosion particles
            for (let i = 0; i < 8; i++) {
              particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.random() * 6 - 3,
                vy: Math.random() * 6 - 3,
                life: 30,
                color: '#FF0055'
              });
            }

            if (enemy.hp <= 0) {
              enemies.splice(eIdx, 1);
              score += 100;
            }
          }
        });

        // Collision with player
        const dx = Math.abs(player.x - enemy.x);
        const dy = Math.abs(player.y - enemy.y);
        if (dx < 25 && dy < 25) {
          enemies.splice(eIdx, 1);
          score = Math.max(0, score - 300);
          for (let i = 0; i < 15; i++) {
            particles.push({
              x: player.x,
              y: player.y,
              vx: Math.random() * 8 - 4,
              vy: Math.random() * 8 - 4,
              life: 40,
              color: '#00F3FF'
            });
          }
        }

        if (enemy.y > canvas.height + 20) enemies.splice(eIdx, 1);
      });

      // Update Particles
      particles.forEach((part, pIdx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.life--;
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, 2, 2);
        if (part.life <= 0) particles.splice(pIdx, 1);
      });

      // Virtual Console HUD overlay (premium aesthetic)
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, 35);
      
      ctx.font = "14px 'Share Tech Mono'";
      ctx.fillStyle = '#00F3FF';
      ctx.fillText(`REMOTE GAMEPLAY FEED - PS5 HOST`, 15, 22);

      ctx.fillStyle = '#fff';
      ctx.fillText(`SCORE: ${score}`, 680, 22);

      // Lag Sim Overlay overlay lines
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.height; i += 6) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();
  };

  const cleanupGameLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const canvas = canvasRef.current;
    if (canvas && canvas._cleanup) {
      canvas._cleanup();
    }
  };

  useEffect(() => {
    return () => cleanupGameLoop();
  }, []);

  // --- GAMES CATALOG ACTIONS & LAUNCH ---

  const handleSelectGame = (game) => {
    setSelectedGameId(game.id);
    setNewGameTitle(game.title);
    setNewGameCategory(game.categoryId);
    setNewGameCost(game.tokenCost);
    setNewGameGenre(game.genre);
    setNewGameCover(game.coverUrl);
    setNewGameDesc(game.description);
    setGameActionError('');
  };

  const handleClearGame = () => {
    setSelectedGameId(null);
    setNewGameTitle('');
    setNewGameCategory('ps5');
    setNewGameCost(1);
    setNewGameGenre('Action / Adventure');
    setNewGameCover('');
    setNewGameDesc('');
    setGameActionError('');
  };

  const handleSaveGame = async (e) => {
    e.preventDefault();
    setGameActionError('');
    if (!newGameTitle) {
      setGameActionError('Game title is required');
      return;
    }

    try {
      const payload = {
        title: newGameTitle,
        categoryId: newGameCategory,
        tokenCost: parseInt(newGameCost) || 1,
        genre: newGameGenre,
        coverUrl: newGameCover || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        description: newGameDesc
      };

      if (selectedGameId) {
        await apiFetch(`/api/games/${selectedGameId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert(`Game '${newGameTitle}' updated successfully.`);
      } else {
        await apiFetch('/api/games', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert(`Game '${newGameTitle}' added to ${newGameCategory.toUpperCase()} catalog.`);
      }

      handleClearGame();
      fetchGames();
    } catch (err) {
      setGameActionError(err.message);
    }
  };

  const handleToggleGameStatus = async (game) => {
    try {
      await apiFetch(`/api/games/${game.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !game.isActive })
      });
      fetchGames();
      if (selectedGameId === game.id) {
        handleClearGame();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteGame = async (id) => {
    if (window.confirm('Delete this game from the catalog?')) {
      try {
        await apiFetch(`/api/games/${id}`, { method: 'DELETE' });
        if (selectedGameId === id) handleClearGame();
        fetchGames();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleLaunchGame = async (game) => {
    setLaunchingGameId(game.id);
    try {
      const res = await apiFetch(`/api/games/${game.id}/play`, {
        method: 'POST'
      });

      setUser((prev) => prev ? ({ ...prev, tokenBalance: res.tokenBalance }) : null);

      setSelectedMachine({
        id: res.machineId,
        name: res.machineName,
        activeGame: res.gameTitle,
        type: game.categoryId
      });

      setActiveSession({
        id: res.sessionId,
        machineId: res.machineId,
        startTime: new Date()
      });

      setSessionSecondsLeft(res.durationSec);
      setSessionLogs([
        `[System] Initializing cloud game session for ${game.title}...`,
        `[System] Reserved virtual host node ${res.machineName} (${game.categoryId.toUpperCase()})...`
      ]);

      if (socketRef.current) {
        socketRef.current.emit('join_play_room', {
          token,
          machineId: res.machineId,
          sessionId: res.sessionId
        });
      }

      setCurrentView('play');
      setupVirtualGameCanvas();
    } catch (err) {
      alert(`Launch Failed: ${err.message}`);
    } finally {
      setLaunchingGameId(null);
    }
  };

  // --- ADMIN PORTAL ACTIONS ---
  const handleSelectMachine = (machine) => {
    setSelectedMachineId(machine.id);
    setNewMachineName(machine.name);
    setNewMachineType(machine.type);
    setNewMachineIp(machine.ipAddress);
    setNewMachineGame(machine.activeGame);
    setNewMachineCost(machine.tokenCostPerSession);
    setNewMachineCpu(machine.cpuSpec);
    setNewMachineGpu(machine.gpuSpec);
    setNewMachineRam(machine.ramSpec);
    setNewMachineResolution(machine.resolutionSpec);
    setNewMachineRegion(machine.regionTag);
    setAdminActionError('');
  };

  const handleClearMachine = () => {
    setSelectedMachineId(null);
    setNewMachineName('');
    setNewMachineType('ps5');
    setNewMachineIp('192.168.1.100');
    setNewMachineGame('Elden Ring');
    setNewMachineCost(1);
    setNewMachineCpu('Custom AMD Zen 2 8-Core');
    setNewMachineGpu('RDNA 2 Engine (10.28 TFLOPS)');
    setNewMachineRam('16GB GDDR6 Unified');
    setNewMachineResolution('4K @ 60 FPS');
    setNewMachineRegion('Tokyo - Asia East');
    setAdminActionError('');
  };

  const handleSaveMachine = async (e) => {
    e.preventDefault();
    setAdminActionError('');
    if (!newMachineName) {
      setAdminActionError('Machine name is required');
      return;
    }

    try {
      const payload = {
        name: newMachineName,
        type: newMachineType || (categories[0]?.type || 'ps5'),
        ipAddress: newMachineIp || '127.0.0.1',
        activeGame: newMachineGame || 'Featured Cloud Title',
        tokenCostPerSession: parseInt(newMachineCost) || 1,
        cpuSpec: newMachineCpu || 'Custom AMD Zen 2 8-Core',
        gpuSpec: newMachineGpu || 'RDNA 2 Engine (10.28 TFLOPS)',
        ramSpec: newMachineRam || '16GB GDDR6 Unified',
        resolutionSpec: newMachineResolution || '4K @ 60 FPS',
        regionTag: newMachineRegion || 'Cloud Station'
      };

      if (selectedMachineId) {
        await apiFetch(`/api/machines/${selectedMachineId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert('Node updated successfully.');
      } else {
        await apiFetch('/api/machines', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert('Node added and linked to virtual cluster.');
      }

      handleClearMachine();
      fetchAdminData();
    } catch (err) {
      setAdminActionError(err.message);
    }
  };

  const handleToggleMachineStatus = async (machine) => {
    try {
      // Toggle between available and offline. If in-use, don't allow toggling, or force it to offline.
      const newStatus = machine.status === 'offline' ? 'available' : 'offline';
      await apiFetch(`/api/machines/${machine.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchAdminData();
      if (selectedMachineId === machine.id) {
        handleClearMachine();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatType(cat.type);
    setNewCatDesc(cat.description);
    setNewCatIcon(cat.icon);
    setAdminActionError('');
  };

  const handleClearCategory = () => {
    setSelectedCatId(null);
    setNewCatName('');
    setNewCatType('');
    setNewCatDesc('');
    setNewCatIcon('Tv');
    setAdminActionError('');
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setAdminActionError('');
    if (!newCatName || !newCatType) {
      setAdminActionError('Category Name and Category Type identifier slug are required');
      return;
    }

    const typeSlug = newCatType.toLowerCase().trim().replace(/\s+/g, '_');

    try {
      const payload = {
        name: newCatName,
        type: typeSlug,
        icon: newCatIcon,
        description: newCatDesc || `${newCatName} hardware streaming category`
      };

      if (selectedCatId) {
        await apiFetch(`/api/categories/${selectedCatId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert(`Machine Category "${newCatName}" updated successfully!`);
      } else {
        await apiFetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert(`Machine Category "${newCatName}" added successfully!`);
      }

      handleClearCategory();
      fetchAdminData();
    } catch (err) {
      setAdminActionError(err.message);
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
    try {
      await apiFetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !cat.isActive })
      });
      fetchAdminData();
      if (selectedCatId === cat.id) {
        handleClearCategory();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this machine category?')) return;
    try {
      await apiFetch(`/api/categories/${catId}`, {
        method: 'DELETE'
      });
      if (selectedCatId === catId) handleClearCategory();
      fetchAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPkgId(pkg.id);
    setNewPkgTitle(pkg.title);
    setNewPkgDesc(pkg.desc);
    setNewPkgTokens(pkg.tokens);
    setNewPkgPrice(pkg.price);
    setNewPkgRecommended(pkg.recommended);
    setPackageActionError('');
  };

  const handleClearPackage = () => {
    setSelectedPkgId(null);
    setNewPkgTitle('');
    setNewPkgDesc('');
    setNewPkgTokens(10);
    setNewPkgPrice(10.00);
    setNewPkgRecommended(false);
    setPackageActionError('');
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    setPackageActionError('');
    if (!newPkgTitle || !newPkgTokens || !newPkgPrice) {
      setPackageActionError('Title, token count, and price are required');
      return;
    }

    try {
      const payload = {
        title: newPkgTitle,
        tokens: parseInt(newPkgTokens),
        price: parseFloat(newPkgPrice),
        desc: newPkgDesc,
        recommended: newPkgRecommended
      };

      if (selectedPkgId) {
        await apiFetch(`/api/packages/${selectedPkgId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert('Token package updated successfully.');
      } else {
        await apiFetch('/api/packages', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert('Token package added to Key Shop.');
      }

      handleClearPackage();
      fetchPackages();
    } catch (err) {
      setPackageActionError(err.message);
    }
  };

  const handleTogglePackageStatus = async (pkg) => {
    try {
      await apiFetch(`/api/packages/${pkg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !pkg.isActive })
      });
      fetchPackages();
      if (selectedPkgId === pkg.id) {
        handleClearPackage();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePackage = async (id) => {
    if (window.confirm('Delete this token package from the shop?')) {
      try {
        await apiFetch(`/api/packages/${id}`, {
          method: 'DELETE'
        });
        if (selectedPkgId === id) handleClearPackage();
        fetchPackages();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleUpdateSessionDuration = async (e) => {
    e.preventDefault();
    setSettingsActionError('');
    try {
      const duration = parseInt(configDurationMinutes);
      if (!duration || duration <= 0) {
        setSettingsActionError('Session duration must be a positive integer');
        return;
      }

      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionDurationMinutes: duration })
      });

      setSystemSettings(res);
      alert(`Per-Token Play Duration updated to ${duration} minutes per token.`);
    } catch (err) {
      setSettingsActionError(err.message);
    }
  };

  const handleDeleteMachine = async (id) => {
    if (window.confirm('Delete machine from server listing? This kicks any active user.')) {
      try {
        await apiFetch(`/api/machines/${id}`, {
          method: 'DELETE'
        });
        fetchAdminData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleTerminateUserSession = async (sessId) => {
    if (window.confirm('Force terminate player session?')) {
      try {
        await apiFetch(`/api/admin/sessions/${sessId}/terminate`, {
          method: 'POST'
        });
        fetchAdminData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Helper formatting for countdown
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Derived state for non-admin user views
  const activeCategories = categories.filter(c => c.isActive !== false);
  const activeCategoryTypes = activeCategories.map(c => c.type);
  const activeGames = games.filter(g => g.isActive !== false && activeCategoryTypes.includes(g.categoryId));
  const activeMachines = machines.filter(m => m.status !== 'offline' && activeCategoryTypes.includes(m.type));

  return (
    <div className="app-container">
      {/* Header / Navbar */}
      <header className="glass-panel" style={{ margin: '1rem', borderBottom: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 100, position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => { setCurrentView(token ? 'lobby' : 'landing'); setMobileMenuOpen(false); }}>
            <img 
              src="https://oeqgmzhatgjmvphxrvkc.supabase.co/storage/v1/object/public/tomaan/logo_bg.png" 
              alt="VORTEX PLAY Logo" 
              style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
              className="hover-glitch"
            />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.06em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'var(--logo-vortex)', fontWeight: 900 }}>VORTEX</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 900 }}>PLAY</span>
            </h1>
          </div>

          {/* DESKTOP NAVIGATION LINKS & USER PROFILE */}
          <div className="desktop-only" style={{ alignItems: 'center', gap: '1.5rem' }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {token && (
                <>
                  <button 
                    onClick={() => setCurrentView('lobby')} 
                    className={`btn ${currentView === 'lobby' || currentView === 'play' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Console Lobby
                  </button>
                  <button 
                    onClick={() => setCurrentView('wallet')} 
                    className={`btn ${currentView === 'wallet' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.4rem' }}
                  >
                    <Coins size={16} />
                    Token Shop
                  </button>
                  {user?.isAdmin && (
                    <button 
                      onClick={() => setCurrentView('admin')} 
                      className={`btn ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--accent-cyan)' }}
                    >
                      <Shield size={16} />
                      Admin
                    </button>
                  )}
                </>
              )}
            </nav>

            {/* Desktop Profile & Auth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Wallet Token Pill */}
                    <div 
                      onClick={() => setCurrentView('wallet')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', padding: '0.4rem 0.85rem', borderRadius: '20px', cursor: 'pointer' }}
                    >
                      <Coins size={16} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {user.tokenBalance} Keys
                      </span>
                    </div>

                    {/* Animal Avatar Button */}
                    <button 
                      onClick={() => setShowProfileMenu((prev) => !prev)} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        background: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-color)', 
                        padding: '0.3rem 0.6rem 0.3rem 0.3rem', 
                        borderRadius: '30px', 
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <div style={{ 
                        width: '34px', 
                        height: '34px', 
                        borderRadius: '50%', 
                        background: getAnimalAvatar(user.username).color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.2rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}>
                        {getAnimalAvatar(user.username).emoji}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        @{user.username}
                      </span>
                      <ChevronDown size={14} color="var(--text-muted)" />
                    </button>
                  </div>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div className="animated-fade glass-panel" style={{ 
                      position: 'absolute', 
                      top: '52px', 
                      right: 0, 
                      width: '260px', 
                      padding: '1rem', 
                      zIndex: 1000, 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.85rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '50%', 
                          background: getAnimalAvatar(user.username).color, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '1.5rem'
                        }}>
                          {getAnimalAvatar(user.username).emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>@{user.username}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
                            {getAnimalAvatar(user.username).name} • {user.isAdmin ? 'Super Admin' : 'Player Pilot'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <button 
                          onClick={() => toggleTheme()}
                          className="btn btn-secondary"
                          style={{ width: '100%', justifyContent: 'space-between', padding: '0.6rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {theme === 'light' ? <Sun size={15} color="#d97706" /> : <Moon size={15} color="var(--accent-cyan)" />}
                            Theme Mode
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                            {theme === 'light' ? 'Light ☀️' : 'Dark 🌙'}
                          </span>
                        </button>

                        <button 
                          onClick={() => { setCurrentView('wallet'); setShowProfileMenu(false); }}
                          className="btn btn-secondary"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem' }}
                        >
                          <Coins size={15} color="var(--accent-cyan)" />
                          Tokens & Key Shop
                        </button>

                        <button 
                          onClick={() => { setShowEditProfileModal(true); setShowProfileMenu(false); }}
                          className="btn btn-secondary"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem' }}
                        >
                          <Settings size={15} color="var(--accent-cyan)" />
                          Edit Profile Settings
                        </button>

                        <button 
                          onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                          className="btn btn-secondary"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.85rem', fontSize: '0.8rem', gap: '0.5rem', color: 'var(--status-danger)', borderColor: 'rgba(225, 29, 72, 0.2)' }}
                        >
                          <LogOut size={15} color="var(--status-danger)" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setCurrentView('login')} className="btn btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
                    Sign In
                  </button>
                  <button onClick={() => setCurrentView('register')} className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE HAMBURGER TOGGLE BUTTON */}
          <div className="mobile-only" style={{ alignItems: 'center', gap: '0.5rem' }}>
            {user && (
              <div 
                onClick={() => { setCurrentView('wallet'); setMobileMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '0.3rem 0.65rem', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}
              >
                <Coins size={14} /> {user.tokenBalance}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', outline: 'none' }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} color="var(--text-primary)" /> : <Menu size={22} color="var(--text-primary)" />}
            </button>
          </div>

        </div>

        {/* MOBILE DRAWER COLLAPSIBLE OVERLAY MENU */}
        {mobileMenuOpen && (
          <div className="mobile-only animated-fade glass-panel" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            padding: '1.25rem',
            borderRadius: '12px',
            flexDirection: 'column',
            gap: '0.75rem',
            zIndex: 1000,
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)'
          }}>
            {/* User Banner Header inside Mobile Menu */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '50%', 
                  background: getAnimalAvatar(user.username).color, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '1.4rem'
                }}>
                  {getAnimalAvatar(user.username).emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>@{user.username}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {user.tokenBalance} Keys Balance • {user.isAdmin ? 'Super Admin' : 'Pilot'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Navigation Lounge
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => { setCurrentView(token ? 'lobby' : 'landing'); setMobileMenuOpen(false); }}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
              >
                <Gamepad2 size={18} color="var(--accent-cyan)" />
                {token ? 'Console Lobby' : 'Home Overview'}
              </button>

              {token && (
                <>
                  <button 
                    onClick={() => { setCurrentView('wallet'); setMobileMenuOpen(false); }}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                  >
                    <Coins size={18} />
                    Vortex Key Shop
                  </button>

                  {user?.isAdmin && (
                    <button 
                      onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                      className="btn btn-cyan"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                    >
                      <Shield size={18} />
                      Admin Control Console
                    </button>
                  )}

                  <button 
                    onClick={() => { setShowEditProfileModal(true); setMobileMenuOpen(false); }}
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                  >
                    <Settings size={18} color="var(--accent-cyan)" />
                    Edit Profile Settings
                  </button>
                </>
              )}

              {/* Theme Switcher Toggle inside Mobile Drawer */}
              <button 
                onClick={() => toggleTheme()}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {theme === 'light' ? <Sun size={18} color="#d97706" /> : <Moon size={18} color="var(--accent-cyan)" />}
                  Theme Mode
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  {theme === 'light' ? 'Light ☀️' : 'Dark 🌙'}
                </span>
              </button>

              {/* Guest / Auth Actions inside Mobile Drawer */}
              {!token ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => { setCurrentView('login'); setMobileMenuOpen(false); }}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem', fontSize: '0.85rem' }}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setCurrentView('register'); setMobileMenuOpen(false); }}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem', fontSize: '0.85rem' }}
                  >
                    Register
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.85rem', gap: '0.6rem', color: 'var(--status-danger)', borderColor: 'rgba(225, 29, 72, 0.2)', marginTop: '0.5rem' }}
                >
                  <LogOut size={18} color="var(--status-danger)" />
                  Sign Out Account
                </button>
              )}
            </div>
          </div>
        )}

      </header>

      {/* Main Container View Controller */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '1rem 2rem' }}>
        
        {/* LANDING PAGE / ATTRACTIVE HOME SCREEN */}
        {currentView === 'landing' && (
          <div className="animated-fade" style={{ padding: '2rem 0 4rem 0' }}>
            
            {/* HERO BANNER SECTION */}
            <div style={{ textAlign: 'center', marginBottom: '4rem', position: 'relative' }}>
              
              {/* Badge Tag Pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 243, 255, 0.08)', border: '1px solid rgba(0, 243, 255, 0.25)', padding: '0.4rem 1.25rem', borderRadius: '30px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                <Zap size={16} />
                <span>Vortex WebRTC 4K Cloud Streaming Engine v2.4 Active</span>
              </div>
              
              {/* Animated Supabase Logo Emblem */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '50%', boxShadow: '0 0 30px var(--accent-cyan-glow)' }}>
                  <img 
                    src="https://oeqgmzhatgjmvphxrvkc.supabase.co/storage/v1/object/public/tomaan/logo_bg.png" 
                    alt="VORTEX PLAY Logo Emblem" 
                    style={{ width: '90px', height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 4px 20px var(--accent-cyan-glow))' }} 
                  />
                </div>
              </div>
              
              {/* Main Headline */}
              <h2 className="text-glow-cyan" style={{ fontSize: '3.2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '0.04em', lineHeight: 1.15, color: 'var(--text-primary)' }}>
                NEXT-GEN CONSOLE GAMING <br />
                <span style={{ color: 'var(--accent-cyan)' }}>VIRTUALIZED IN THE CLOUD</span>
              </h2>
              
              <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
                Stream top-tier PlayStation 5, Xbox Series X, and Liquid PC titles directly in your browser. Sub-millisecond latency, 4K ray tracing, and instant token-key access with zero downloads.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '3.5rem' }}>
                <button 
                  onClick={() => setCurrentView(token ? 'lobby' : 'register')} 
                  className="btn btn-primary" 
                  style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', gap: '0.6rem' }}
                >
                  <Play size={20} />
                  {token ? 'Enter Console Lobby' : 'Start Free Cloud Trial'}
                </button>

                <button 
                  onClick={() => {
                    const el = document.getElementById('popular-games-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }} 
                  className="btn btn-secondary" 
                  style={{ padding: '1rem 2rem', fontSize: '1.1rem', gap: '0.6rem' }}
                >
                  <Flame size={20} color="var(--accent-cyan)" />
                  Explore Games Catalog
                </button>

                {token && (
                  <button 
                    onClick={() => setCurrentView('wallet')} 
                    className="btn btn-cyan" 
                    style={{ padding: '1rem 2rem', fontSize: '1.1rem', gap: '0.6rem' }}
                  >
                    <Coins size={20} />
                    Buy Token Keys
                  </button>
                )}
              </div>

              {/* Live Performance Counter Ticker */}
              <div className="glass-panel" style={{ padding: '1.25rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                  <Zap size={24} color="var(--accent-cyan)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>&lt; 12 ms</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ultra-Low Latency Stream</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                  <Tv size={24} color="var(--accent-cyan)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>4K @ 60 FPS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hardware Accelerated</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                  <Shield size={24} color="var(--status-success)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>99.99% Uptime</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MongoDB Atlas Cloud Sync</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                  <Coins size={24} color="var(--accent-cyan)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>1 Token Key</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>= {systemSettings.sessionDurationMinutes || 15} Mins Streaming</div>
                  </div>
                </div>
              </div>

            </div>

            {/* DYNAMIC POPULAR GAMES SPOTLIGHT FROM DATABASE (OVERVIEW 4 TITLES ONLY) */}
            <div id="popular-games-section" style={{ marginTop: '5rem', marginBottom: '5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  <Flame size={18} /> Featured Library Overview
                </div>
                <h3 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  POPULAR GAMES OVERVIEW
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0.5rem auto 0 auto' }}>
                  Top trending titles hosted on cloud console arrays. Log in to explore full hardware category catalogs.
                </p>
              </div>

              {/* Netflix Style Category-Wise Games Display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', width: '100%', overflow: 'hidden' }}>
                {activeCategories.map((cat) => {
                  const catGames = activeGames.filter(g => g.categoryId === cat.type);
                  if (catGames.length === 0) return null;
                  
                  return (
                    <div key={cat.id} style={{ textAlign: 'left' }}>
                      <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
                        {cat.name} Trending
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        overflowX: 'auto', 
                        gap: '1.5rem', 
                        padding: '1rem 0.5rem',
                        scrollSnapType: 'x mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                      className="hide-scrollbar"
                      >
                        {catGames.map((game) => (
                          <div 
                            key={game.id} 
                            onClick={() => setGameDetailModal(game)}
                            className="glass-panel cyan-hover" 
                            style={{ 
                              flex: '0 0 auto',
                              width: '240px',
                              borderRadius: '14px', 
                              overflow: 'hidden', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              cursor: 'pointer',
                              scrollSnapAlign: 'start',
                              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            {/* Cover Image Container */}
                            <div style={{ position: 'relative', height: '230px', overflow: 'hidden', background: '#0b0c10' }}>
                              <img 
                                src={game.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'} 
                                alt={game.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              />
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 12, 16, 0.95) 0%, transparent 60%)' }} />

                              {/* Category Badge Pill */}
                              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', border: '1px solid var(--accent-cyan)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                                  {game.categoryId?.toUpperCase() || 'CONSOLE'}
                                </span>
                              </div>

                              {/* Details Hint Badge */}
                              <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.6rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#fff' }}>
                                <Info size={12} color="var(--accent-cyan)" /> Details & Play
                              </div>
                            </div>

                            {/* Game Title Bar */}
                            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {game.title}
                              </h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WHY VORTEX PLAY - 4 FEATURE PILLARS */}
            <div style={{ marginTop: '5rem', marginBottom: '5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  WHY PLAY ON VORTEX CLOUD?
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                  Enterprise cloud architecture built exclusively for console enthusiasts.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', borderRadius: '12px' }}>
                  <Laptop size={36} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 700 }}>Zero Download Storage</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Never wait hours for 120GB game updates again. Games launch instantly from remote high-speed NVMe storage clusters.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', borderRadius: '12px' }}>
                  <Tv size={36} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 700 }}>PS5 & Xbox Exclusives</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Connect to real physical PlayStation 5 and Xbox Series X console nodes directly from your web browser.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', borderRadius: '12px' }}>
                  <Shield size={36} color="var(--status-success)" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 700 }}>MongoDB Atlas Sync</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your player statistics, save progress, and token keys balance are backed up to secure MongoDB Atlas cloud database.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', borderRadius: '12px' }}>
                  <Coins size={36} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 700 }}>Pay-As-You-Play Keys</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    No expensive monthly subscriptions. Spend flexible token keys only when you are actively playing console games.
                  </p>
                </div>
              </div>
            </div>

            {/* HOW IT WORKS - 3 SIMPLE STEPS */}
            <div className="glass-panel" style={{ padding: '3rem 2rem', borderRadius: '16px', marginTop: '4rem', marginBottom: '4rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '2rem' }}>
                HOW TO START STREAMING IN 30 SECONDS
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
                <div style={{ padding: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#fff', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    1
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Create Free Pilot Account</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sign up in seconds to receive starter token keys to unlock streaming nodes.</p>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#fff', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    2
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Select Console Game</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pick your favorite title from PS5, Xbox, or PC liquid gaming catalog.</p>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--status-success)', color: '#fff', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    3
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Play & Control Live Stream</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Use keyboard (WASD) or plug in any USB gamepad controller to play instantly!</p>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem' }}>
                <button onClick={() => setCurrentView(token ? 'lobby' : 'register')} className="btn btn-primary" style={{ padding: '0.85rem 2.5rem', fontSize: '1rem' }}>
                  {token ? 'Go to Console Lobby' : 'Create Free Account Now'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* LOGIN / SIGNUP FORMS */}
        {(currentView === 'login' || currentView === 'register') && (
          <div className="animated-fade" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '420px', position: 'relative' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <img 
                  src="https://oeqgmzhatgjmvphxrvkc.supabase.co/storage/v1/object/public/tomaan/logo_bg.png" 
                  alt="VORTEX PLAY Logo" 
                  style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '1rem', filter: 'drop-shadow(0 2px 10px var(--accent-cyan-glow))' }} 
                />
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                  {currentView === 'login' ? 'Access Console Array' : 'Register Pilot Core'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {currentView === 'login' ? 'Provide security credentials to unlock nodes' : 'Create unique connection node link'}
                </p>
              </div>

              {authError && (
                <div style={{ background: 'rgba(255, 0, 85, 0.1)', border: '1px solid var(--status-danger)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--status-danger)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Player ID" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(currentView === 'register'); }}
                />
              </div>

              <button 
                onClick={() => handleAuth(currentView === 'register')} 
                disabled={authLoading}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.85rem' }}
              >
                {authLoading ? 'Initializing Connection...' : (currentView === 'login' ? 'Authenticate' : 'Sync Registration')}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <span 
                  onClick={() => {
                    setCurrentView(currentView === 'login' ? 'register' : 'login');
                    setAuthError('');
                  }} 
                  style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {currentView === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* LOBBY / CATEGORY CARDS & GAMES CATALOG */}
        {currentView === 'lobby' && (
          <div className="animated-fade">
            
            {/* STAGE 1: CATEGORY CARDS VIEW (When no category is selected yet) */}
            {selectedLobbyCategory === null ? (
              <div>
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Gamepad2 size={28} color="var(--accent-cyan)" />
                      Console Hardware Categories
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Select a console category to browse hosted titles. Spending 1 Token Key launches your high-speed cloud stream.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.6rem 1.2rem', borderRadius: '10px', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Active Stations</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
                        {activeMachines.filter(m => m.status === 'available').length} / {activeMachines.length} Ready
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.75rem', marginBottom: '3rem' }}>
                  {activeCategories.map((cat) => {
                    const catGames = activeGames.filter(g => g.categoryId === cat.type);
                    const matchingMachines = activeMachines.filter(m => m.type === cat.type || (cat.type === 'ps4' && m.type === 'ps5'));
                    const availableMachines = matchingMachines.filter(m => m.status === 'available').length;
                    
                    const themeColor = cat.type === 'ps5' ? 'var(--accent-cyan)' : cat.type === 'ps4' ? 'var(--accent-cyan)' : cat.type === 'xbox' ? '#107C10' : 'var(--accent-cyan)';
                    const CategoryIcon = cat.type === 'xbox' ? Monitor : cat.type === 'pc' ? Laptop : Tv;

                    return (
                      <div 
                        key={cat.id} 
                        onClick={() => setSelectedLobbyCategory(cat.type)}
                        className="glass-panel" 
                        style={{ 
                          padding: '1.75rem', 
                          borderRadius: '16px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          cursor: 'pointer',
                          position: 'relative',
                          border: `1px solid var(--border-color)`,
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = themeColor;
                          e.currentTarget.style.boxShadow = `0 10px 25px rgba(0, 0, 0, 0.15)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Top Category Icon & Station Pill */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '12px', border: `1px solid ${themeColor}` }}>
                            <CategoryIcon size={32} color={themeColor} />
                          </div>
                          
                          <div style={{ background: availableMachines > 0 ? 'rgba(0, 255, 170, 0.1)' : 'rgba(255, 170, 0, 0.1)', border: availableMachines > 0 ? '1px solid var(--status-success)' : '1px solid var(--status-warning)', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', color: availableMachines > 0 ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {availableMachines > 0 ? `${availableMachines} Stations Online` : 'Stations Busy'}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                          {cat.name}
                        </h4>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                          {cat.desc || `Browse hosted games for ${cat.name} hardware node cluster.`}
                        </p>

                        {/* Card Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {catGames.length} Game Title{catGames.length !== 1 ? 's' : ''}
                          </span>

                          <button 
                            className="btn btn-cyan" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', gap: '0.4rem' }}
                          >
                            Explore Games <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (

              /* STAGE 2: SELECTED CATEGORY GAMES CATALOG VIEW */
              <div>
                {/* Top Bar with Back Button & Selected Category Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      onClick={() => setSelectedLobbyCategory(null)} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
                    >
                      ← Back to Categories
                    </button>
                    <div>
                      <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {selectedLobbyCategory === 'ps5' ? <Tv size={26} color="var(--accent-cyan)" /> : selectedLobbyCategory === 'ps4' ? <Tv size={26} color="var(--accent-cyan)" /> : selectedLobbyCategory === 'xbox' ? <Monitor size={26} color="#107C10" /> : <Laptop size={26} color="var(--accent-cyan)" />}
                        {categories.find(c => c.type === selectedLobbyCategory)?.name || selectedLobbyCategory.toUpperCase()} Games
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Showing games hosted on {selectedLobbyCategory.toUpperCase()} console stations.
                      </p>
                    </div>
                  </div>

                  {/* Category Switcher Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {activeCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedLobbyCategory(c.type)}
                        className={`btn ${selectedLobbyCategory === c.type ? 'btn-cyan' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Games Grid for Selected Category */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
                  {activeGames.filter(g => g.categoryId === selectedLobbyCategory).length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No games published under {activeCategories.find(c => c.type === selectedLobbyCategory)?.name} yet.</p>
                      <button onClick={() => setSelectedLobbyCategory(null)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                        Select Another Category
                      </button>
                    </div>
                  ) : (
                    activeGames.filter(g => g.categoryId === selectedLobbyCategory).map((game) => (
                      <div 
                        key={game.id} 
                        onClick={() => setGameDetailModal(game)}
                        className="glass-panel cyan-hover" 
                        style={{ 
                          borderRadius: '14px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                        }}
                      >
                        {/* Cover Image Header */}
                        <div style={{ height: '230px', width: '100%', position: 'relative', overflow: 'hidden', background: '#0b0c10' }}>
                          <img 
                            src={game.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'} 
                            alt={game.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 12, 16, 0.95) 0%, transparent 60%)' }} />
                          
                          {/* Category Badge Pill */}
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Tv size={12} color="var(--accent-cyan)" />
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: '#fff' }}>
                              {game.categoryId.toUpperCase()}
                            </span>
                          </div>

                          {/* Details hint badge */}
                          <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.25rem 0.6rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#fff' }}>
                            <Info size={12} color="var(--accent-cyan)" /> Details & Play
                          </div>
                        </div>

                        {/* Game Title Bar */}
                        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {game.title}
                          </h4>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            )}

          </div>
        )}

        {/* VIRTUAL GAMEPLAY PLAYROOM */}
        {currentView === 'play' && selectedMachine && (
          <div className="animated-fade">
            {/* Session stats top bar */}
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', marginBottom: '1.5rem', borderRadius: '12px', borderLeft: '3px solid var(--accent-cyan)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Remote Game host</span>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tv size={18} color="var(--accent-cyan)" />
                  {selectedMachine.name}
                </h3>
              </div>

              {/* Countdown Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 0, 85, 0.08)', border: '1px solid rgba(255, 0, 85, 0.2)', padding: '0.5rem 1.25rem', borderRadius: '8px' }}>
                <Clock size={18} color="var(--status-danger)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time remaining</span>
                  <span style={{ color: 'var(--status-danger)', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {formatTime(sessionSecondsLeft)}
                  </span>
                </div>
              </div>

              {/* Release host btn */}
              <button onClick={handleQuitPlay} className="btn btn-secondary" style={{ borderColor: 'var(--status-danger)', color: 'var(--status-danger)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Disconnect Console
              </button>
            </div>

            {/* Interactive console & logs layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
              
              {/* Gameplay Screen column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Canvas Game Area */}
                <div className="glass-panel scanlines" style={{ overflow: 'hidden', padding: 0, display: 'flex', background: '#000', border: '1px solid rgba(0, 243, 255, 0.3)', borderRadius: '12px', boxShadow: '0 0 25px rgba(0, 243, 255, 0.1)' }}>
                  <canvas 
                    ref={canvasRef} 
                    style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '16/9' }}
                  />
                </div>

                {/* Simulated Telemetry Stats strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Signal size={16} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Remote latency</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sessionTelemetry.latency} ms</div>
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Video frame rate</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sessionTelemetry.fps} FPS</div>
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={16} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Stream Resolution</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>1080p WebRTC</div>
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={16} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Video Bitrate</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sessionTelemetry.bitrate} Mbps</div>
                    </div>
                  </div>
                </div>

                {/* Game Controller Map Overlay Guide */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    Virtual Gamepad Diagnostics
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    
                    {/* Direction Pad */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>D-PAD NAVIGATION (WASD / ARROWS)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gridTemplateRows: 'repeat(3, 40px)', gap: '4px', justifyItems: 'center', alignItems: 'center' }}>
                        <div></div>
                        <div style={{ width: '40px', height: '40px', background: activeKeys['U_Dpad'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>W</div>
                        <div></div>
                        <div style={{ width: '40px', height: '40px', background: activeKeys['L_Dpad'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>A</div>
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}></div>
                        <div style={{ width: '40px', height: '40px', background: activeKeys['R_Dpad'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>D</div>
                        <div></div>
                        <div style={{ width: '40px', height: '40px', background: activeKeys['D_Dpad'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>S</div>
                        <div></div>
                      </div>
                    </div>

                    {/* Controller Action buttons */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ACTION KEYBOARD CAPTURES</div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeKeys['Btn_A'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>A</div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>SPACE / J</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeKeys['Btn_B'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>B</div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>K key</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeKeys['Btn_X'] ? 'var(--accent-cyan)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>X</div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>L key</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Console log column */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Activity size={14} color="var(--accent-cyan)" />
                  Telemetry Log
                </h4>
                
                {/* Scrollable logs */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px' }}>
                  {sessionLogs.map((log, idx) => (
                    <div key={idx} style={{ 
                      color: log.includes('WARNING') 
                        ? 'var(--status-danger)' 
                        : log.includes('System') 
                          ? 'var(--accent-cyan)' 
                          : 'var(--text-secondary)'
                    }}>
                      {log}
                    </div>
                  ))}
                  <div ref={logTerminalEndRef} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TOKEN SHOP & CHECKOUT WALLET */}
        {currentView === 'wallet' && (
          <div className="animated-fade">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
              
              {/* Token packages shop */}
              <div>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Vortex Key Shop</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Top up tokens to play. Every token unlocks games streams.</p>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0, 243, 255, 0.08)', border: '1px solid rgba(0, 243, 255, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                  <Clock size={16} />
                  <span>Global Rate: <strong>1 Token Key</strong> = <strong>{systemSettings.sessionDurationMinutes || 15} Minutes</strong> Game Streaming</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {packages.map((pkg) => (
                    <div 
                      key={pkg.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.5rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        border: pkg.recommended ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                        boxShadow: pkg.recommended ? '0 0 15px var(--accent-cyan-glow)' : ''
                      }}
                    >
                      <div>
                        {pkg.recommended && (
                          <span style={{ background: 'var(--accent-cyan)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '0.5rem' }}>
                            Best Value
                          </span>
                        )}
                        <h4 style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>{pkg.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pkg.desc}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Coins size={24} color="var(--accent-cyan)" />
                          <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)' }}>
                            {pkg.tokens}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Keys</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                            ${pkg.price.toFixed(2)}
                          </span>
                          <button onClick={() => selectTokenPackage(pkg)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            Buy Tokens
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions History panel */}
              <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <History size={16} />
                  Ledger History
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {transactions.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                      No transactions recorded.
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem' }}>
                        <div>
                          <div style={{ color: tx.type === 'purchase' ? 'var(--status-success)' : 'var(--accent-cyan)', fontWeight: 600 }}>
                            {tx.type === 'purchase' ? 'Tokens Purchased' : 'Session Spend'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 600 }}>
                          <div style={{ color: 'var(--text-primary)' }}>
                            {tx.type === 'purchase' ? `+${tx.amount}` : `-${tx.amount}`} Keys
                          </div>
                          {tx.cost > 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>${tx.cost.toFixed(2)}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PAYMENT CHECKOUT MODAL */}
        {checkoutPackage && (
          <div className="animated-fade" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '480px', position: 'relative' }}>
              
              {/* Close btn */}
              <button 
                onClick={() => setCheckoutPackage(null)} 
                className="btn btn-secondary" 
                style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.25rem 0.5rem', border: 'none' }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>Secure checkout gateway</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Buying <strong>{checkoutPackage.tokens} Token Keys</strong> for <strong>${checkoutPackage.price.toFixed(2)}</strong>
                </p>
              </div>

              {/* CARD FLIP GRAPHICS */}
              <div className={`credit-card ${cardFlipped ? 'flipped' : ''}`} onClick={() => setCardFlipped(!cardFlipped)}>
                <div className="credit-card-inner">
                  {/* Front Side */}
                  <div className="credit-card-front">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="chip"></div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.1em', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>VORTEX</span>
                    </div>
                    <div className="card-number">{cardNumber || '•••• •••• •••• ••••'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="card-holder">
                        <span className="card-label">Card Holder</span>
                        <span className="card-value">{cardName || 'YOUR NAME'}</span>
                      </div>
                      <div className="card-expiry">
                        <span className="card-label">Expires</span>
                        <span className="card-value">{cardExpiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Back Side */}
                  <div className="credit-card-back">
                    <div className="card-black-stripe"></div>
                    <div className="card-signature-cvc">
                      <div className="card-sig-line"></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="card-label" style={{ color: '#fff' }}>CVC</span>
                        <div className="card-cvc-display">{cardCvc || '•••'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {paymentSuccess ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(20, 180, 90, 0.1)', border: '1px solid var(--status-success)', borderRadius: '8px', color: 'var(--status-success)' }}>
                  <Coins size={32} style={{ marginBottom: '0.5rem', animation: 'heartbeat 1s infinite' }} />
                  <h4 style={{ margin: 0 }}>Payment Complete!</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Keys added successfully to user profile.</p>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit}>
                  
                  {paymentError && (
                    <div style={{ color: 'var(--status-danger)', background: 'rgba(255,0,85,0.1)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      {paymentError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Cardholder Name</label>
                    <input 
                      type="text" 
                      className="form-input form-input-cyan" 
                      required
                      placeholder="e.g. Satvik Sharma"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      onFocus={() => setCardFlipped(false)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input 
                      type="text" 
                      className="form-input form-input-cyan" 
                      required
                      maxLength="19"
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      onFocus={() => setCardFlipped(false)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input 
                        type="text" 
                        className="form-input form-input-cyan" 
                        required
                        maxLength="5"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        onFocus={() => setCardFlipped(false)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVC Code</label>
                      <input 
                        type="password" 
                        className="form-input form-input-cyan" 
                        required
                        maxLength="4"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                        onFocus={() => setCardFlipped(true)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={paymentProcessing}
                    className="btn btn-cyan" 
                    style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
                  >
                    {paymentProcessing ? 'Authorizing Visa/Stripe...' : `Process Secure Payment $${checkoutPackage.price.toFixed(2)}`}
                  </button>

                </form>
              )}

            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD PORTAL WITH SIDEBAR MENU */}
        {currentView === 'admin' && user?.isAdmin && (
          <div className="animated-fade" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', minHeight: '75vh' }}>
            
            {/* LEFT-SIDEBAR MENU */}
            <div className="glass-panel" style={{ padding: '1.25rem', height: 'fit-content', position: 'sticky', top: '90px' }}>
              <div style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                  ADMIN CONTROL CENTER
                </div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: '0.2rem 0' }}>Vortex Host Console</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username} (Super Admin)</div>
              </div>

              {/* Sidebar Menu Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  onClick={() => setAdminTab('overview')}
                  className={`btn ${adminTab === 'overview' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <LayoutDashboard size={16} /> Overview Analytics
                </button>

                <button 
                  onClick={() => setAdminTab('games')}
                  className={`btn ${adminTab === 'games' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <Gamepad2 size={16} /> Games Catalog ({games.length})
                </button>

                <button 
                  onClick={() => setAdminTab('nodes')}
                  className={`btn ${adminTab === 'nodes' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <Layers size={16} /> Machine Categories ({categories.length})
                </button>

                <button 
                  onClick={() => setAdminTab('stations')}
                  className={`btn ${adminTab === 'stations' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <Cpu size={16} /> Hardware Stations ({machines.length})
                </button>

                <button 
                  onClick={() => setAdminTab('pricing')}
                  className={`btn ${adminTab === 'pricing' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <Coins size={16} /> Pricing & Token Rates
                </button>

                <button 
                  onClick={() => setAdminTab('sessions')}
                  className={`btn ${adminTab === 'sessions' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <Activity size={16} /> Live Streams ({adminSessions.length})
                </button>

                <button 
                  onClick={() => setAdminTab('players')}
                  className={`btn ${adminTab === 'players' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.85rem', gap: '0.6rem' }}
                >
                  <Users size={16} /> Registered Players ({adminUsersList.length})
                </button>
              </div>
            </div>

            {/* MAIN ADMIN SERVICE MODULE CONTENT AREA */}
            <div>
              {/* TAB 1: OVERVIEW ANALYTICS */}
              {adminTab === 'overview' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LayoutDashboard size={22} color="var(--accent-cyan)" /> Platform Analytics & Financial Metrics
                  </h3>

                  {/* Stats Grid Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered Players</span>
                      <h4 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>{adminStats.totalUsers}</h4>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Streams</span>
                      <h4 style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)', margin: '0.2rem 0' }}>{adminStats.totalActivePlayers}</h4>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Keys Transacted</span>
                      <h4 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>{adminStats.totalTokensSold}</h4>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Revenue</span>
                      <h4 style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)', margin: '0.2rem 0' }}>${adminStats.totalRevenue.toFixed(2)}</h4>
                    </div>
                  </div>

                  {/* Node Capacity & System Health */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      Host Capacity Breakdown
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                      {['ps5', 'xbox', 'pc'].map((catType) => {
                        const total = machines.filter(m => m.type === catType).length;
                        const avail = machines.filter(m => m.type === catType && m.status === 'available').length;
                        const label = catType === 'ps5' ? 'PlayStation 5 Cluster' : catType === 'xbox' ? 'Xbox Series X Array' : 'Liquid PC Rigs';
                        return (
                          <div key={catType} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>{label}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                              {avail} / {total} Available
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GAMES CATALOG MANAGER */}
              {adminTab === 'games' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Gamepad2 size={22} color="var(--accent-cyan)" /> Games Catalog Manager
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                    {/* Game Creation Form */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                        Add New Game to Catalog
                      </h4>

                      <form onSubmit={handleSaveGame}>
                        {gameActionError && (
                          <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                            {gameActionError}
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label">Game Title</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. GTA V, Spider-Man 2, Elden Ring"
                            value={newGameTitle}
                            onChange={(e) => setNewGameTitle(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Machine Category</label>
                            <select 
                              className="form-input" 
                              value={newGameCategory}
                              style={{ appearance: 'none', WebkitAppearance: 'none' }}
                              onChange={(e) => setNewGameCategory(e.target.value)}
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.type}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Key Cost / Session</label>
                            <input 
                              type="number" 
                              className="form-input" 
                              min="1"
                              value={newGameCost}
                              onChange={(e) => setNewGameCost(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Genre Tag</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Action RPG, Open World, Racing"
                            value={newGameGenre}
                            onChange={(e) => setNewGameGenre(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Cover Image URL / Supabase Storage Upload</span>
                            {uploadingImage && <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Uploading to Supabase...</span>}
                          </label>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="https://... or select image file below"
                              value={newGameCover}
                              style={{ flex: 1 }}
                              onChange={(e) => setNewGameCover(e.target.value)}
                            />

                            <label 
                              className="btn btn-secondary" 
                              style={{ 
                                padding: '0.6rem 0.85rem', 
                                fontSize: '0.8rem', 
                                cursor: uploadingImage ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                whiteSpace: 'nowrap'
                              }}
                              title="Upload local image file from device to Supabase Storage"
                            >
                              <Upload size={16} color="var(--accent-cyan)" />
                              {uploadingImage ? 'Uploading...' : 'Browse Device'}
                              <input 
                                type="file" 
                                accept="image/*" 
                                disabled={uploadingImage}
                                onChange={handleSupabaseFileUpload}
                                style={{ display: 'none' }}
                              />
                            </label>
                          </div>

                          {newGameCover && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <img src={newGameCover} alt="Cover Preview" style={{ width: '45px', height: '45px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>✓ Image Ready</span>
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Game Description</label>
                          <textarea 
                            className="form-input" 
                            rows="2"
                            placeholder="Brief summary of gameplay highlights..."
                            value={newGameDesc}
                            onChange={(e) => setNewGameDesc(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          {selectedGameId ? (
                            <>
                              <button type="button" onClick={handleClearGame} className="btn btn-secondary" style={{ flex: 1 }}>Insert New</button>
                              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update</button>
                              <button type="button" onClick={() => handleToggleGameStatus(games.find(g => g.id === selectedGameId))} className="btn btn-secondary" style={{ flex: 1 }}>{games.find(g => g.id === selectedGameId)?.isActive !== false ? 'Set Inactive' : 'Set Active'}</button>
                              <button type="button" onClick={() => handleDeleteGame(selectedGameId)} className="btn btn-secondary" style={{ flex: 1, backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--status-danger)' }}>Delete</button>
                            </>
                          ) : (
                            <button type="submit" className="btn btn-cyan" style={{ width: '100%', padding: '0.75rem' }}>
                              Publish Game to Catalog
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Catalog Games List */}
                    <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        Active Catalog Titles ({games.length})
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                        {games.map((g) => (
                          <div key={g.id} 
                               onClick={() => handleSelectGame(g)}
                               style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: selectedGameId === g.id ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-tertiary)', borderRadius: '6px', border: selectedGameId === g.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', opacity: g.isActive === false ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <img src={g.coverUrl} alt={g.title} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{g.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  Category: <span style={{ color: 'var(--accent-cyan)' }}>{g.categoryId.toUpperCase()}</span> | {g.tokenCost} Key(s)
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteGame(g.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', border: 'none' }}>
                              <Trash2 size={14} color="var(--status-danger)" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MACHINE CATEGORIES & TYPE VALUES CONFIGURATOR */}
              {adminTab === 'nodes' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={22} color="var(--accent-cyan)" /> Machine Categories & Type Values Configurator
                  </h3>

                  {adminActionError && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255, 77, 77, 0.1)', borderRadius: '8px', border: '1px solid var(--status-danger)' }}>
                      {adminActionError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                    {/* Add Machine Category Form */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Plus size={16} color="var(--accent-cyan)" /> Add New Machine Category Value
                      </h4>

                      <form onSubmit={handleSaveCategory}>
                        <div className="form-group">
                          <label className="form-label">Category Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. PlayStation 5 Pro, Nintendo Switch, VR Rig"
                            value={newCatName}
                            onChange={(e) => {
                              setNewCatName(e.target.value);
                              if (!newCatType) {
                                setNewCatType(e.target.value.toLowerCase().trim().replace(/\s+/g, '_'));
                              }
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Type Code / Slug</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="e.g. ps5_pro, switch, vr"
                              value={newCatType}
                              onChange={(e) => setNewCatType(e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Badge Icon</label>
                            <select 
                              className="form-input" 
                              value={newCatIcon}
                              style={{ appearance: 'none', WebkitAppearance: 'none' }}
                              onChange={(e) => setNewCatIcon(e.target.value)}
                            >
                              <option value="Tv">Tv Console</option>
                              <option value="Monitor">Monitor / Xbox</option>
                              <option value="Laptop">Laptop / PC Rig</option>
                              <option value="Gamepad2">Gamepad / Handheld</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Description / Hardware Spec Summary</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Next-Gen 4K 120Hz Ray-Tracing Hardware Nodes"
                            value={newCatDesc}
                            onChange={(e) => setNewCatDesc(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          {selectedCatId ? (
                            <>
                              <button type="button" onClick={handleClearCategory} className="btn btn-secondary" style={{ flex: 1 }}>Insert New</button>
                              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update</button>
                              <button type="button" onClick={() => handleToggleCategoryStatus(categories.find(c => c.id === selectedCatId))} className="btn btn-secondary" style={{ flex: 1 }}>{categories.find(c => c.id === selectedCatId)?.isActive !== false ? 'Set Inactive' : 'Set Active'}</button>
                              <button type="button" onClick={() => handleDeleteCategory(selectedCatId)} className="btn btn-secondary" style={{ flex: 1, backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--status-danger)' }}>Delete</button>
                            </>
                          ) : (
                            <button type="submit" className="btn btn-cyan" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
                              <Plus size={16} /> Add Machine Category Value
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Existing Machine Categories List */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Configured Machine Categories ({categories.length})</span>
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                        {categories.map((cat) => {
                          const catGamesCount = games.filter(g => g.categoryId === cat.type).length;
                          const catNodesCount = machines.filter(m => m.type === cat.type).length;
                          const CategoryBadgeIcon = cat.icon === 'Monitor' ? Monitor : cat.icon === 'Laptop' ? Laptop : cat.icon === 'Gamepad2' ? Gamepad2 : Tv;

                          return (
                            <div key={cat.id || cat.type} 
                                 onClick={() => handleSelectCategory(cat)}
                                 style={{ cursor: 'pointer', padding: '0.85rem 1rem', background: selectedCatId === cat.id ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-tertiary)', borderRadius: '8px', border: selectedCatId === cat.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: cat.isActive === false ? 0.6 : 1 }}>
                              <div style={{ flex: 1, paddingRight: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                  <CategoryBadgeIcon size={16} color="var(--accent-cyan)" />
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{cat.name}</span>
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                                    {cat.type}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                  {cat.desc || cat.description || 'Streaming Hardware Cluster'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', gap: '1rem' }}>
                                  <span>🎮 {catGamesCount} Game{catGamesCount !== 1 ? 's' : ''}</span>
                                  <span>🖥️ {catNodesCount} Station Node{catNodesCount !== 1 ? 's' : ''}</span>
                                </div>
                              </div>

                              <button 
                                onClick={() => handleDeleteCategory(cat.id)} 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.6rem' }}
                                title="Delete Machine Category"
                              >
                                <Trash2 size={14} color="var(--status-danger)" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3.5: HARDWARE STATIONS */}
              {adminTab === 'stations' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={22} color="var(--accent-cyan)" /> Hardware Station Nodes Configurator
                  </h3>
                  
                  {adminActionError && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255, 77, 77, 0.1)', borderRadius: '8px', border: '1px solid var(--status-danger)' }}>
                      {adminActionError}
                    </div>
                  )}

                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Hardware Station Nodes ({machines.length})
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                      {/* Add Node form */}
                      <form onSubmit={handleSaveMachine}>
                        <div className="form-group">
                          <label className="form-label">Station Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. PS5 Host Node 01"
                            value={newMachineName}
                            onChange={(e) => setNewMachineName(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Assigned Category</label>
                            <select 
                              className="form-input" 
                              value={newMachineType}
                              style={{ appearance: 'none', WebkitAppearance: 'none' }}
                              onChange={(e) => setNewMachineType(e.target.value)}
                            >
                              {categories.map((cat) => (
                                <option key={cat.id || cat.type} value={cat.type}>{cat.name} ({cat.type})</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">Virtual IP</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="192.168.1.100"
                              value={newMachineIp}
                              onChange={(e) => setNewMachineIp(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Active Game</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Featured Cloud Title"
                              value={newMachineGame}
                              onChange={(e) => setNewMachineGame(e.target.value)}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">Server Region</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Tokyo - Asia East"
                              value={newMachineRegion}
                              onChange={(e) => setNewMachineRegion(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Session Cost (Keys)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            min="1"
                            value={newMachineCost}
                            onChange={(e) => setNewMachineCost(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">CPU Spec</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Custom AMD Zen 2 8-Core"
                              value={newMachineCpu}
                              onChange={(e) => setNewMachineCpu(e.target.value)}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">GPU Spec</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="RDNA 2 Engine"
                              value={newMachineGpu}
                              onChange={(e) => setNewMachineGpu(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">RAM Spec</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="16GB GDDR6 Unified"
                              value={newMachineRam}
                              onChange={(e) => setNewMachineRam(e.target.value)}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">Resolution Output</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="4K @ 60 FPS"
                              value={newMachineResolution}
                              onChange={(e) => setNewMachineResolution(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          {selectedMachineId ? (
                            <>
                              <button type="button" onClick={handleClearMachine} className="btn btn-secondary" style={{ flex: 1 }}>Insert New</button>
                              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update</button>
                              <button type="button" onClick={() => handleToggleMachineStatus(machines.find(m => m.id === selectedMachineId))} className="btn btn-secondary" style={{ flex: 1 }}>{machines.find(m => m.id === selectedMachineId)?.status !== 'offline' ? 'Set Offline' : 'Set Available'}</button>
                              <button type="button" onClick={() => handleDeleteMachine(selectedMachineId)} className="btn btn-secondary" style={{ flex: 1, backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--status-danger)' }}>Delete</button>
                            </>
                          ) : (
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                              + Connect Station Node
                            </button>
                          )}
                        </div>
                      </form>

                      {/* Connected Nodes List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '260px', overflowY: 'auto' }}>
                        {machines.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem' }}>
                            No hardware station nodes linked yet.
                          </div>
                        ) : (
                          machines.map((m) => {
                            const catObj = categories.find(c => c.type === m.type);
                            return (
                              <div key={m.id} 
                                   onClick={() => handleSelectMachine(m)}
                                   style={{ cursor: 'pointer', padding: '0.6rem 0.85rem', background: selectedMachineId === m.id ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-tertiary)', borderRadius: '6px', border: selectedMachineId === m.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: m.status === 'offline' ? 0.6 : 1 }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{m.name}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginLeft: '0.75rem' }}>
                                    Category: {catObj ? catObj.name : m.type.toUpperCase()}
                                  </span>
                                </div>
                                <button onClick={() => handleDeleteMachine(m.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                                  <Trash2 size={12} color="var(--status-danger)" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: PRICING & TOKEN RATES */}
              {adminTab === 'pricing' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Coins size={22} color="var(--accent-cyan)" /> Pricing & Per-Token Session Configurator
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Session Duration Configurator */}
                    <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                        Per-Token Play Duration (Minutes)
                      </h4>

                      <form onSubmit={handleUpdateSessionDuration}>
                        <div className="form-group">
                          <label className="form-label">Minutes per Token Session</label>
                          <input 
                            type="number" 
                            className="form-input form-input-cyan" 
                            min="1"
                            max="480"
                            value={configDurationMinutes}
                            onChange={(e) => setConfigDurationMinutes(e.target.value)}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Current Rate: <strong>1 Token = {systemSettings.sessionDurationMinutes || 15} Minutes</strong> stream session
                          </span>
                        </div>
                        <button type="submit" className="btn btn-cyan" style={{ width: '100%', padding: '0.75rem' }}>
                          Save Session Rate
                        </button>
                      </form>
                    </div>

                    {/* Token Package Manager */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                        Add Shop Package
                      </h4>

                      <form onSubmit={handleSavePackage} style={{ marginBottom: '1.5rem' }}>
                        <div className="form-group">
                          <label className="form-label">Package Title</label>
                          <input type="text" className="form-input" placeholder="e.g. Pro Streamer Pack" value={newPkgTitle} onChange={(e) => setNewPkgTitle(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Keys Count</label>
                            <input type="number" className="form-input" min="1" value={newPkgTokens} onChange={(e) => setNewPkgTokens(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Price ($ USD)</label>
                            <input type="number" step="0.01" className="form-input" min="0.50" value={newPkgPrice} onChange={(e) => setNewPkgPrice(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          {selectedPkgId ? (
                            <>
                              <button type="button" onClick={handleClearPackage} className="btn btn-secondary" style={{ flex: 1 }}>Insert New</button>
                              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update</button>
                              <button type="button" onClick={() => handleTogglePackageStatus(packages.find(p => p.id === selectedPkgId))} className="btn btn-secondary" style={{ flex: 1 }}>{packages.find(p => p.id === selectedPkgId)?.isActive !== false ? 'Set Inactive' : 'Set Active'}</button>
                              <button type="button" onClick={() => handleDeletePackage(selectedPkgId)} className="btn btn-secondary" style={{ flex: 1, backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--status-danger)' }}>Delete</button>
                            </>
                          ) : (
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                              Add Package
                            </button>
                          )}
                        </div>
                      </form>

                      {/* Package Listing */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {packages.map((pkg) => (
                          <div key={pkg.id} 
                               onClick={() => handleSelectPackage(pkg)}
                               style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: selectedPkgId === pkg.id ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-tertiary)', borderRadius: '4px', border: selectedPkgId === pkg.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', alignItems: 'center', opacity: pkg.isActive === false ? 0.6 : 1 }}>
                            <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{pkg.title} ({pkg.tokens} Keys - ${pkg.price?.toFixed(2)})</div>
                            <button onClick={() => handleDeletePackage(pkg.id)} className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem' }}>
                              <Trash2 size={12} color="var(--status-danger)" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: LIVE STREAMS MONITOR */}
              {adminTab === 'sessions' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={22} color="var(--accent-cyan)" /> Live Active Sessions & Kill Switch
                  </h3>

                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {adminSessions.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No active player stream connections in progress.
                        </div>
                      ) : (
                        adminSessions.map((sess) => (
                          <div key={sess.id} className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-cyan)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>@{sess.username}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                                Station: {sess.machineName} ({sess.machineType.toUpperCase()}) | Started: {new Date(sess.startTime).toLocaleTimeString()}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleTerminateUserSession(sess.id)} 
                              className="btn btn-secondary" 
                              style={{ color: 'var(--status-danger)', borderColor: 'rgba(255,0,85,0.2)', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                            >
                              Disconnect Player
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: REGISTERED PLAYERS */}
              {adminTab === 'players' && (
                <div className="animated-fade">
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={22} color="var(--accent-cyan)" /> Registered Player Accounts ({adminUsersList.length})
                  </h3>

                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                      {adminUsersList.map((usr) => (
                        <div key={usr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              @{usr.username} {usr.isAdmin && <span style={{ background: 'var(--accent-cyan)', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#fff' }}>ADMIN</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              ID: {usr.id} | Joined: {new Date(usr.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            <Coins size={16} /> {usr.tokenBalance} Keys
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* EDIT PROFILE SETTINGS MODAL */}
      {showEditProfileModal && user && (
        <div className="animated-fade" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '440px', position: 'relative' }}>
            
            <button 
              onClick={() => setShowEditProfileModal(false)} 
              className="btn btn-secondary" 
              style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.25rem 0.5rem', border: 'none' }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '50%', 
                background: getAnimalAvatar(user.username).color, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '2rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {getAnimalAvatar(user.username).emoji}
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: 0 }}>@{user.username}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600, margin: 0 }}>
                  {getAnimalAvatar(user.username).name} Avatar Active
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Handle</label>
              <input 
                type="text" 
                className="form-input" 
                value={user.username}
                disabled
                style={{ opacity: 0.8 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bound to player record ID #{user.id}.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Token Key Balance</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <Coins size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {user.tokenBalance} Keys Available
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Theme Preference</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={() => setTheme('light')} 
                  className={`btn ${theme === 'light' ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                >
                  ☀️ Light White
                </button>
                <button 
                  type="button" 
                  onClick={() => setTheme('dark')} 
                  className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                >
                  🌙 Dark Mode
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button 
                onClick={() => setShowEditProfileModal(false)} 
                className="btn btn-primary" 
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
              >
                Save Settings
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GAME DETAILS POPUP MODAL WITH BLURRED BACKGROUND */}
      {gameDetailModal && (
        <div 
          className="animated-fade"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(12px)', 
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 2000, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '1.5rem' 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGameDetailModal(null);
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '540px', 
              borderRadius: '18px', 
              overflow: 'hidden', 
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--panel-bg)'
            }}
          >
            {/* Modal Close Button */}
            <button 
              onClick={() => setGameDetailModal(null)} 
              className="btn btn-secondary" 
              style={{ 
                position: 'absolute', 
                top: '1rem', 
                right: '1rem', 
                zIndex: 10,
                width: '36px',
                height: '36px',
                padding: 0,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
            >
              ✕
            </button>

            {/* Modal Cover Image Header */}
            <div style={{ position: 'relative', height: '220px', width: '100%', background: '#0b0c10', overflow: 'hidden' }}>
              <img 
                src={gameDetailModal.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'} 
                alt={gameDetailModal.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--panel-bg) 0%, transparent 80%)' }} />

              {/* Category Tag & Genre Pills */}
              <div style={{ position: 'absolute', bottom: '15px', left: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ background: 'rgba(2, 132, 199, 0.2)', backdropFilter: 'blur(6px)', border: '1px solid var(--accent-cyan)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {gameDetailModal.categoryId?.toUpperCase() || 'CONSOLE'}
                </div>
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {gameDetailModal.genre || gameDetailModal.genreTag || 'Action'}
                </div>
              </div>
            </div>

            {/* Modal Details Content Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 800 }}>
                {gameDetailModal.title}
              </h3>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {gameDetailModal.description || 'Stream high-definition console gameplay instantly on low-latency WebRTC cloud nodes with zero download storage.'}
              </p>

              {/* Specs & Hardware Rates Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Token Key Rate</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Coins size={16} /> {gameDetailModal.tokenCost || 1} Key / {systemSettings.sessionDurationMinutes || 15}m
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Host Nodes</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
                    {machines.filter(m => m.type === gameDetailModal.categoryId || (gameDetailModal.categoryId === 'ps4' && m.type === 'ps5')).filter(m => m.status === 'available').length} Stations Ready
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {token ? (
                <button 
                  onClick={() => {
                    const targetGame = gameDetailModal;
                    setGameDetailModal(null);
                    handleLaunchGame(targetGame);
                  }}
                  className="btn btn-cyan"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', gap: '0.5rem' }}
                >
                  <Play size={18} fill="#0b0c10" /> Launch Game Stream ({gameDetailModal.tokenCost || 1} Key)
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setGameDetailModal(null);
                    setCurrentView('register');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', gap: '0.5rem' }}
                >
                  <Key size={18} /> Register / Sign In to Play
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          © 2026 Vortex Play Virtual Gaming lounge. Connected to Admin console network cluster over secure WebSocket link.
        </p>
      </footer>
    </div>
  );
}

export default App;
