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
  AlertTriangle
} from 'lucide-react';

// Production Backend API & WebSockets URL (reads from VITE_BACKEND_URL env var, defaults to localhost:5050)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

function App() {
  // Navigation & Authentication
  const [token, setToken] = useState(localStorage.getItem('vortex_token') || '');
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing'); // landing, login, register, lobby, wallet, play, admin
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
    fetchPackages();
    fetchSettings();
    const interval = setInterval(() => {
      fetchMachines();
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
      ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)';
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

  // --- ADMIN PORTAL ACTIONS ---
  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setAdminActionError('');
    if (!newMachineName) {
      setAdminActionError('Machine name is required');
      return;
    }

    try {
      await apiFetch('/api/machines', {
        method: 'POST',
        body: JSON.stringify({
          name: newMachineName,
          type: newMachineType,
          ipAddress: newMachineIp,
          activeGame: newMachineGame,
          tokenCostPerSession: newMachineCost,
          cpuSpec: newMachineCpu,
          gpuSpec: newMachineGpu,
          ramSpec: newMachineRam,
          resolutionSpec: newMachineResolution,
          regionTag: newMachineRegion
        })
      });

      setNewMachineName('');
      setNewMachineGame('');
      fetchAdminData();
      alert('Node added and linked to virtual cluster with hardware specs.');
    } catch (err) {
      setAdminActionError(err.message);
    }
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    setPackageActionError('');
    if (!newPkgTitle || !newPkgTokens || !newPkgPrice) {
      setPackageActionError('Title, token count, and price are required');
      return;
    }

    try {
      await apiFetch('/api/packages', {
        method: 'POST',
        body: JSON.stringify({
          title: newPkgTitle,
          tokens: parseInt(newPkgTokens),
          price: parseFloat(newPkgPrice),
          desc: newPkgDesc,
          recommended: newPkgRecommended
        })
      });

      setNewPkgTitle('');
      setNewPkgDesc('');
      setNewPkgTokens(10);
      setNewPkgPrice(10.00);
      setNewPkgRecommended(false);
      fetchPackages();
      alert('Token package added to Key Shop.');
    } catch (err) {
      setPackageActionError(err.message);
    }
  };

  const handleDeletePackage = async (id) => {
    if (window.confirm('Delete this token package from the shop?')) {
      try {
        await apiFetch(`/api/packages/${id}`, {
          method: 'DELETE'
        });
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

  return (
    <div className="app-container">
      {/* Header / Navbar */}
      <header className="glass-panel" style={{ margin: '1rem', borderBottom: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCurrentView(token ? 'lobby' : 'landing')}>
            <Gamepad2 size={32} color="var(--accent-cyan)" className="hover-glitch" />
            <h1 style={{ fontSize: '1.6rem', color: '#fff', background: 'linear-gradient(90deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              VORTEX <span style={{ color: 'var(--accent-cyan)' }}>PLAY</span>
            </h1>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--accent-purple)' }}
                  >
                    <Shield size={16} />
                    Admin
                  </button>
                )}
              </>
            )}
          </nav>

          {/* User Section / Auth State */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <>
                {/* Wallet Token Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 243, 255, 0.08)', border: '1px solid rgba(0, 243, 255, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                  <Coins size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {user.tokenBalance} Tokens
                  </span>
                </div>
                {/* User Info & Signout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                    @{user.username}
                  </span>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Log Out">
                    <LogOut size={16} color="var(--status-danger)" />
                  </button>
                </div>
              </>
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
      </header>

      {/* Main Container View Controller */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '1rem 2rem' }}>
        
        {/* LANDING PAGE (GUEST VIEW) */}
        {currentView === 'landing' && (
          <div className="animated-fade" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(138, 43, 226, 0.1)', border: '1px solid rgba(138, 43, 226, 0.2)', borderRadius: '50%', marginBottom: '2rem' }}>
              <Gamepad2 size={64} color="var(--accent-purple)" className="text-glow-purple" />
            </div>
            
            <h2 className="text-glow-purple" style={{ fontSize: '3rem', marginBottom: '1rem', letterSpacing: '0.1em' }}>
              PLAY CONSOLE GAMES <br />
              <span style={{ color: 'var(--accent-cyan)' }}>VIRTUALIZED ONLINE</span>
            </h2>
            
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
              Access remote PS5 and high-end gaming hardware cluster endpoints instantly from any browser. Spend token keys to rent virtual nodes in real-time.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              <button onClick={() => setCurrentView('register')} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                Create Account
              </button>
              <button onClick={() => setCurrentView('login')} className="btn btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                Join Lounge
              </button>
            </div>

            {/* Showcase Nodes */}
            <div style={{ marginTop: '5rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-muted)', marginBottom: '2rem', letterSpacing: '0.2em' }}>ACTIVE SERVER NODES</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>NODE: Tokyo_PS5_01</span>
                    <span style={{ height: '8px', width: '8px', background: 'var(--status-success)', borderRadius: '50%', boxShadow: '0 0 8px var(--status-success)' }}></span>
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>PS5 Pro Node</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>GT7, Elden Ring, Spiderman 2</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--accent-purple)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>NODE: Seattle_Xbx_01</span>
                    <span style={{ height: '8px', width: '8px', background: 'var(--status-success)', borderRadius: '50%', boxShadow: '0 0 8px var(--status-success)' }}></span>
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>Xbox Series X</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Forza Horizon 5, Halo Infinite</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>NODE: PC_RTX_4090_01</span>
                    <span style={{ height: '8px', width: '8px', background: 'var(--status-warning)', borderRadius: '50%' }}></span>
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>PC Node RTX 4090</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cyberpunk 2077 (Path Tracing)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN / SIGNUP FORMS */}
        {(currentView === 'login' || currentView === 'register') && (
          <div className="animated-fade" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '420px', position: 'relative' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Gamepad2 size={40} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', color: '#fff' }}>
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

        {/* LOBBY / MACHINE SELECTION GRID */}
        {currentView === 'lobby' && (
          <div className="animated-fade">
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.8rem', color: '#fff' }}>Console Link Array</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Select a virtual game station. Spending tokens registers session key.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Online Stations</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
                    {machines.filter(m => m.status === 'available').length} / {machines.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Array */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {machines.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No active gaming machine connections initialized by administrator server side.
                </div>
              ) : (
                machines.map((machine) => {
                  const isAvailable = machine.status === 'available';
                  const isBusy = machine.status === 'in-use';
                  const isOffline = machine.status === 'offline';
                  const isMyMachine = machine.currentUserId === user?.id;

                  return (
                    <div 
                      key={machine.id} 
                      className={`glass-panel ${isAvailable ? 'cyan-hover' : ''}`} 
                      style={{ 
                        padding: '1.5rem', 
                        borderLeft: isAvailable 
                          ? '3px solid var(--accent-cyan)' 
                          : isBusy 
                            ? '3px solid var(--accent-purple)' 
                            : '3px solid var(--text-muted)',
                        opacity: isOffline ? 0.6 : 1
                      }}
                    >
                      {/* Node Category & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {machine.type === 'ps5' ? <Tv size={14} color="var(--accent-cyan)" /> : machine.type === 'xbox' ? <Monitor size={14} color="#107C10" /> : <Laptop size={14} color="var(--accent-purple)" />}
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#fff' }}>
                            {machine.type} Station
                          </span>
                        </div>
                        {/* Status Label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ 
                            height: '6px', 
                            width: '6px', 
                            background: isAvailable ? 'var(--status-success)' : isBusy ? 'var(--status-warning)' : 'var(--text-muted)', 
                            borderRadius: '50%',
                            boxShadow: isAvailable ? '0 0 6px var(--status-success)' : ''
                          }}></span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: isAvailable ? 'var(--status-success)' : isBusy ? 'var(--status-warning)' : 'var(--text-muted)'
                          }}>
                            {isAvailable ? 'Available' : isBusy ? (isMyMachine ? 'Your Session' : 'In Use') : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {/* Device Title & Region */}
                      <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{machine.name}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
                        <span>IP: {machine.ipAddress}</span>
                        {machine.regionTag && (
                          <span style={{ color: 'var(--accent-cyan)', background: 'rgba(0, 243, 255, 0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            📍 {machine.regionTag}
                          </span>
                        )}
                      </div>

                      {/* Hardware Specs Grid Badges */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1.25rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#fff' }}>GPU:</strong> {machine.gpuSpec || 'Ray-Tracing GPU'}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#fff' }}>RAM:</strong> {machine.ramSpec || '16GB High-Speed'}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#fff' }}>CPU:</strong> {machine.cpuSpec || '8-Core Processor'}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#fff' }}>MAX:</strong> {machine.resolutionSpec || '4K @ 60 FPS'}
                        </div>
                      </div>

                      {/* Current Game */}
                      <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem' }}>Loaded game core</div>
                        <div style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Gamepad2 size={16} />
                          {machine.activeGame}
                        </div>
                      </div>

                      {/* Cost Info / Controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Key Cost</span>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Coins size={14} color="var(--accent-cyan)" />
                            {machine.tokenCostPerSession} Token(s) <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {systemSettings.sessionDurationMinutes || 15}m</span>
                          </span>
                        </div>

                        {/* Action buttons */}
                        {isMyMachine ? (
                          <button 
                            onClick={() => {
                              setSelectedMachine(machine);
                              setCurrentView('play');
                            }} 
                            className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            Resume Play
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStartPlay(machine)} 
                            disabled={!isAvailable}
                            className={`btn ${isAvailable ? 'btn-cyan' : 'btn-secondary'}`}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            <Play size={12} fill={isAvailable ? '#0b0c10' : 'none'} />
                            {isAvailable ? 'Launch play' : 'Occupied'}
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIRTUAL GAMEPLAY PLAYROOM */}
        {currentView === 'play' && selectedMachine && (
          <div className="animated-fade">
            {/* Session stats top bar */}
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', marginBottom: '1.5rem', borderRadius: '12px', borderLeft: '3px solid var(--accent-cyan)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Remote Game host</span>
                <h3 style={{ fontSize: '1.3rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
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
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeKeys['Btn_A'] ? 'var(--accent-purple)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>A</div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>SPACE / J</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeKeys['Btn_B'] ? 'var(--accent-purple)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>B</div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>K key</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeKeys['Btn_X'] ? 'var(--accent-purple)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>X</div>
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
                <h3 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>Vortex Key Shop</h3>
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
                        border: pkg.recommended ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
                        boxShadow: pkg.recommended ? '0 0 15px var(--accent-purple-glow)' : ''
                      }}
                    >
                      <div>
                        {pkg.recommended && (
                          <span style={{ background: 'var(--accent-purple)', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '0.5rem' }}>
                            Best Value
                          </span>
                        )}
                        <h4 style={{ color: '#fff', fontSize: '1.25rem' }}>{pkg.title}</h4>
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
                          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
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
                <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                          <div style={{ color: '#fff' }}>
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
          <div className="animated-fade" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
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
                <h3 style={{ fontSize: '1.4rem', color: '#fff' }}>Secure checkout gateway</h3>
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

        {/* ADMIN DASHBOARD PORTAL */}
        {currentView === 'admin' && user?.isAdmin && (
          <div className="animated-fade">
            
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1rem 1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered Players</span>
                <h4 style={{ fontSize: '1.8rem', color: '#fff', margin: '0.2rem 0' }}>{adminStats.totalUsers}</h4>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid var(--accent-cyan)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active play rooms</span>
                <h4 style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)', margin: '0.2rem 0' }}>{adminStats.totalActivePlayers}</h4>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Keys Transacted</span>
                <h4 style={{ fontSize: '1.8rem', color: '#fff', margin: '0.2rem 0' }}>{adminStats.totalTokensSold}</h4>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid var(--accent-purple)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Simulated Revenue</span>
                <h4 style={{ fontSize: '1.8rem', color: 'var(--accent-purple)', margin: '0.2rem 0' }}>${adminStats.totalRevenue.toFixed(2)}</h4>
              </div>
            </div>

            {/* Split layout: Add/Manage Devices vs Active Sessions Monitor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              
              {/* Form and listing: Machine management */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={18} />
                  Connect New Hardware Node
                </h4>

                <form onSubmit={handleCreateMachine} style={{ marginBottom: '2.5rem' }}>
                  {adminActionError && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      {adminActionError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Station Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. PS5 Pro - node_4"
                      value={newMachineName}
                      onChange={(e) => setNewMachineName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Device Type</label>
                      <select 
                        className="form-input" 
                        value={newMachineType}
                        style={{ appearance: 'none', WebkitAppearance: 'none' }}
                        onChange={(e) => setNewMachineType(e.target.value)}
                      >
                        <option value="ps5">PlayStation 5</option>
                        <option value="xbox">Xbox Series X</option>
                        <option value="pc">Gaming PC</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Session cost</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="1"
                        max="5"
                        value={newMachineCost}
                        onChange={(e) => setNewMachineCost(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Virtual IP / Address</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="192.168.1.100"
                        value={newMachineIp}
                        onChange={(e) => setNewMachineIp(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default Game Core</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Demon Souls"
                        value={newMachineGame}
                        onChange={(e) => setNewMachineGame(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Hardware Specification Configuration */}
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem', fontWeight: 600 }}>
                      Hardware Configuration Specs
                    </div>

                    <div className="form-group">
                      <label className="form-label">Server Region / Location</label>
                      <select 
                        className="form-input" 
                        value={newMachineRegion}
                        style={{ appearance: 'none', WebkitAppearance: 'none' }}
                        onChange={(e) => setNewMachineRegion(e.target.value)}
                      >
                        <option value="Tokyo - Asia East">Tokyo - Asia East</option>
                        <option value="Seattle - US West">Seattle - US West</option>
                        <option value="Frankfurt - EU Central">Frankfurt - EU Central</option>
                        <option value="London - EU West">London - EU West</option>
                        <option value="Singapore - SE Asia">Singapore - SE Asia</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">CPU / Processor</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. AMD Zen 2 8-Core"
                          value={newMachineCpu}
                          onChange={(e) => setNewMachineCpu(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">GPU / Graphics Card</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. RTX 4090 24GB"
                          value={newMachineGpu}
                          onChange={(e) => setNewMachineGpu(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">RAM / Memory</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. 16GB GDDR6"
                          value={newMachineRam}
                          onChange={(e) => setNewMachineRam(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Max Resolution / FPS</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. 4K @ 120 FPS"
                          value={newMachineResolution}
                          onChange={(e) => setNewMachineResolution(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-cyan" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
                    Link Node
                  </button>
                </form>

                {/* Listing to Delete */}
                <h4 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Connected Clusters
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {machines.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{m.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Type: <span style={{ textTransform: 'uppercase' }}>{m.type}</span> | IP: {m.ipAddress}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteMachine(m.id)} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Delete Machine Node">
                        <Trash2 size={16} color="var(--status-danger)" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active user play sessions monitor */}
              <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={18} color="var(--accent-cyan)" />
                  Live Host Controller Monitors
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {adminSessions.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No active gaming streams in progress.
                    </div>
                  ) : (
                    adminSessions.map((sess) => (
                      <div key={sess.id} className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-purple)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PLAYER CHANNEL</span>
                            <div style={{ fontWeight: 600, color: '#fff' }}>@{sess.username}</div>
                          </div>
                          <button 
                            onClick={() => handleTerminateUserSession(sess.id)} 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--status-danger)', borderColor: 'rgba(255, 0, 85, 0.2)' }}
                          >
                            Kill Connection
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Station:</span> {sess.machineName} ({sess.machineType})
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Started:</span> {new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Split layout 2: Token Package Pricing & Session Play Time Configurator */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
              
              {/* Session Duration Configurator */}
              <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={18} color="var(--accent-cyan)" />
                  Per-Token Play Duration Configurator
                </h4>

                <form onSubmit={handleUpdateSessionDuration}>
                  {settingsActionError && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      {settingsActionError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Stream Playing Duration per Token (Minutes)</label>
                    <input 
                      type="number" 
                      className="form-input form-input-cyan" 
                      min="1"
                      max="480"
                      value={configDurationMinutes}
                      onChange={(e) => setConfigDurationMinutes(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Current Rate: <strong>1 Token Key = {systemSettings.sessionDurationMinutes || 15} Minutes</strong> stream session
                    </span>
                  </div>

                  <button type="submit" className="btn btn-cyan" style={{ width: '100%', padding: '0.75rem' }}>
                    Save Play Time Rate
                  </button>
                </form>
              </div>

              {/* Token Package Manager */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Coins size={18} color="var(--accent-purple)" />
                  Key Shop Pricing & Package Manager
                </h4>

                <form onSubmit={handleCreatePackage} style={{ marginBottom: '2rem' }}>
                  {packageActionError && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      {packageActionError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Package Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Weekend Warrior Pack"
                      value={newPkgTitle}
                      onChange={(e) => setNewPkgTitle(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Token Keys Count</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="1"
                        value={newPkgTokens}
                        onChange={(e) => setNewPkgTokens(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price ($ USD)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-input" 
                        min="0.50"
                        value={newPkgPrice}
                        onChange={(e) => setNewPkgPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Package Subtitle / Description</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Best for long gaming sessions"
                      value={newPkgDesc}
                      onChange={(e) => setNewPkgDesc(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <input 
                      type="checkbox" 
                      id="pkgRecommended" 
                      checked={newPkgRecommended}
                      onChange={(e) => setNewPkgRecommended(e.target.checked)}
                    />
                    <label htmlFor="pkgRecommended" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Highlight as "Best Value / Recommended"
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                    Add Token Package
                  </button>
                </form>

                {/* Package Listing with Delete Action */}
                <h4 style={{ fontSize: '0.9rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Active Shop Packages
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {packages.map((pkg) => (
                    <div key={pkg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>
                          {pkg.title} {pkg.recommended && <span style={{ fontSize: '0.65rem', color: 'var(--accent-purple)', background: 'rgba(138,43,226,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>★ Recommended</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {pkg.tokens} Keys | ${pkg.price?.toFixed(2)}
                        </div>
                      </div>
                      <button onClick={() => handleDeletePackage(pkg.id)} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none' }} title="Delete Package">
                        <Trash2 size={16} color="var(--status-danger)" />
                      </button>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

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
