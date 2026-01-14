
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Square, GameState, Theme, PrizeDistribution } from './types';
import { ICONS } from './constants';
import { createPool as savePoolToDB, updatePool } from './services/instantdb';
import { OwnerDashboard, OWNER_PIN } from './components/OwnerDashboard';

const POOL_FEE = 5;
const GUMROAD_LINK = 'https://6702043901238.gumroad.com/l/pkgoz';

const DEFAULT_PIN = "1234";

const PAYMENT_METHODS = [
  { id: 'venmo', label: 'Venmo', color: '#3d95ce', bg: 'bg-[#3d95ce]/10', border: 'border-[#3d95ce]/30', text: 'text-[#3d95ce]' },
  { id: 'cashapp', label: 'Cash App', color: '#00d632', bg: 'bg-[#00d632]/10', border: 'border-[#00d632]/30', text: 'text-[#00d632]' },
  { id: 'cash', label: 'Cash', color: '#f97316', bg: 'bg-[#f97316]/10', border: 'border-[#f97316]/30', text: 'text-[#f97316]' }
];

const Tooltip: React.FC<{ children: React.ReactNode, text: string, position?: 'top' | 'bottom' }> = ({ children, text, position = 'top' }) => (
  <div className="group relative flex items-center justify-center">
    {children}
    <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 px-2 py-1.5 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] border border-white/10 shadow-2xl`}>
      {text}
      <div className={`absolute ${position === 'top' ? 'top-full border-t-neutral-900' : 'bottom-full border-b-neutral-900'} left-1/2 -translate-x-1/2 border-4 border-transparent`}></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    const saved = localStorage.getItem('sbsquares_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        poolCode: parsed.poolCode || parsed.leagueCode || generateCode(),
        adminPin: parsed.adminPin || DEFAULT_PIN,
        isInitialized: parsed.isInitialized ?? false,
        isPaidPool: parsed.isPaidPool ?? false
      };
    }
    
    return {
      title: 'Super Bowl LIX Pool',
      homeTeam: 'AFC Champions',
      awayTeam: 'NFC Champions',
      homeNumbers: null,
      awayNumbers: null,
      squares: {},
      isLocked: false,
      isGridLocked: false,
      homeScore: '',
      awayScore: '',
      isSoundEnabled: true,
      theme: 'stadium',
      quarterWinners: {},
      paymentSettings: {
        venmo: '',
        cashApp: '',
        cash: '',
        pricePerSquare: '10'
      },
      prizeDistribution: { q1: 20, q2: 20, q3: 20, final: 40 },
      poolCode: generateCode(),
      adminPin: DEFAULT_PIN,
      isInitialized: false,
      isPaidPool: false
    };
  });

  const [sessionAuth, setSessionAuth] = useState<{ role: 'admin' | 'player' | null }>({ role: null });
  const [loginView, setLoginView] = useState<'choice' | 'join' | 'create' | 'payment'>('choice');
  const [loginInput, setLoginInput] = useState('');
  const [createData, setCreateData] = useState({ title: 'Super Bowl LIX Pool', pin: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  
  const [pastSquares, setPastSquares] = useState<Record<string, Square>[]>([]);
  const [editingSquare, setEditingSquare] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showPaymentToast, setShowPaymentToast] = useState(false);
  const [isPaidLocal, setIsPaidLocal] = useState(false);
  const [isPendingLocal, setIsPendingLocal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'venmo' | 'cashapp' | 'cash' | null>(null);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'ledger' | 'settings' | 'data'>('ledger');
  const [confirmingAction, setConfirmingAction] = useState<'reset' | 'clear' | null>(null);
  const [isOwnerDashboardOpen, setIsOwnerDashboardOpen] = useState(false);

  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'pop' | 'shuffle' | 'win' | 'error') => {
    if (!gameState.isSoundEnabled) return;
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'shuffle') {
      osc.type = 'square';
      for (let i = 0; i < 10; i++) osc.frequency.setValueAtTime(200 + Math.random() * 600, now + (i * 0.05));
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'win') {
      osc.type = 'triangle';
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => osc.frequency.setValueAtTime(freq, now + (i * 0.1)));
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }, [gameState.isSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('sbsquares_state', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#code=')) {
      const code = hash.split('#code=')[1];
      if (code) {
        setLoginInput(code.toUpperCase());
        setLoginView('join');
      }
    }
  }, []);

  // Handle Stripe payment return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const poolCode = urlParams.get('pool');

    if (paymentStatus && poolCode) {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);

      if (paymentStatus === 'success') {
        // Payment successful - activate the pool
        setGameState(prev => ({
          ...prev,
          isPaidPool: true,
          isInitialized: true
        }));
        setSessionAuth({ role: 'admin' });
        playSound('win');
      } else if (paymentStatus === 'cancelled') {
        // Payment cancelled - show payment screen again
        setLoginView('payment');
        setPaymentError('Payment was cancelled. Please try again to activate your pool.');
      }
    }
  }, []);

  // Sync pool stats to InstantDB when squares change
  useEffect(() => {
    if (!gameState.isPaidPool || !gameState.poolCode) return;

    const squares = Object.values(gameState.squares);
    const squaresClaimed = squares.filter(s => s.owner).length;
    const squaresPaid = squares.filter(s => s.isPaid).length;
    const totalPot = squaresPaid * gameState.paymentSettings.pricePerSquare;

    updatePool(gameState.poolCode, {
      squaresClaimed,
      squaresPaid,
      totalPot,
      pricePerSquare: gameState.paymentSettings.pricePerSquare,
      isLocked: gameState.isLocked,
    }).catch(err => console.error('Failed to sync pool stats:', err));
  }, [gameState.squares, gameState.isLocked, gameState.paymentSettings.pricePerSquare, gameState.isPaidPool, gameState.poolCode]);

  const handleLogin = (val: string) => {
    const input = val.trim().toUpperCase();

    // Owner dashboard access
    if (input === OWNER_PIN) {
      setIsOwnerDashboardOpen(true);
      setLoginInput('');
      return;
    }
    if (input === gameState.adminPin) {
      setSessionAuth({ role: 'admin' });
      setGameState(p => ({ ...p, isInitialized: true }));
      playSound('win');
    } else if (input === gameState.poolCode.toUpperCase()) {
      setSessionAuth({ role: 'player' });
      playSound('pop');
    } else {
      playSound('error');
      alert("Invalid Pool Code or Admin PIN.");
    }
    setLoginInput('');
  };

  const handleCreatePool = () => {
    if (createData.pin.length !== 4) return alert("Admin PIN must be exactly 4 digits.");
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    const newPoolCode = generateCode();

    // Save pool data but don't activate yet - need payment first
    setGameState(p => ({
      ...p,
      title: createData.title,
      adminPin: createData.pin,
      poolCode: newPoolCode,
      isInitialized: false,
      isPaidPool: false
    }));

    // Show payment screen
    setLoginView('payment');
    playSound('pop');
  };

  const handlePayment = () => {
    window.open(GUMROAD_LINK, '_blank');
  };

  const handleActivatePool = async () => {
    // Validate Gumroad license key format (XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX)
    const keyPattern = /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/i;
    if (!keyPattern.test(licenseKey.trim())) {
      setPaymentError('Please enter a valid license key from your Gumroad receipt.');
      playSound('error');
      return;
    }
    setPaymentError(null);

    // Save pool to InstantDB
    try {
      await savePoolToDB({
        poolCode: gameState.poolCode,
        title: gameState.title,
        licenseKey: licenseKey.trim(),
        pricePerSquare: gameState.paymentSettings.pricePerSquare,
      });
    } catch (err) {
      console.error('Failed to save pool to DB:', err);
    }

    setGameState(p => ({ ...p, isPaidPool: true, isInitialized: true }));
    setSessionAuth({ role: 'admin' });
    playSound('win');
    setLoginView('choice');
  };

  const handleSquareClick = (row: number, col: number) => {
    const isAdmin = sessionAuth.role === 'admin';
    if (gameState.isLocked || (gameState.isGridLocked && !isAdmin)) return;
    const id = `${row}-${col}`;
    const square = gameState.squares[id];
    if (!isAdmin && (square?.isPaid || square?.isPending)) return;

    setEditingSquare(id);
    setIsPaidLocal(square?.isPaid || false);
    setIsPendingLocal(square?.isPending || false);
    setSelectedPaymentMethod(square?.paymentMethod || null);
  };

  const updateSquareOwner = (owner: string, forceStatus?: { isPaid?: boolean, isPending?: boolean }) => {
    if (!editingSquare) return;
    const isAdmin = sessionAuth.role === 'admin';
    if (!owner.trim()) return alert("Please enter a name.");
    if (!selectedPaymentMethod && !isAdmin) return alert("Please select a payment method.");
    
    const [row, col] = editingSquare.split('-').map(Number);
    const isPaid = forceStatus?.isPaid ?? isPaidLocal;
    const isPending = forceStatus?.isPending ?? isPendingLocal;

    if (isPaid) {
        setShowPaymentToast(true);
        setTimeout(() => setShowPaymentToast(false), 2500);
        playSound('win');
    } else {
        playSound('pop');
    }

    setPastSquares([...pastSquares, gameState.squares]);
    setGameState(prev => ({
      ...prev,
      squares: {
        ...prev.squares,
        [editingSquare!]: { 
            id: editingSquare!, 
            owner: owner.toUpperCase(), 
            row, 
            col, 
            isPaid,
            isPending,
            paymentMethod: selectedPaymentMethod || undefined
        }
      }
    }));
    setEditingSquare(null);
    setSelectedPaymentMethod(null);
  };

  const lockGridEntries = () => {
    if (sessionAuth.role !== 'admin') return;
    setGameState(prev => ({ ...prev, isGridLocked: !prev.isGridLocked }));
    playSound('pop');
  };

  const randomizeNumbers = () => {
    if (sessionAuth.role !== 'admin') return;
    
    const shuffle = (array: number[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const baseArr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    setGameState(prev => ({
      ...prev,
      homeNumbers: shuffle(baseArr),
      awayNumbers: shuffle(baseArr),
      isLocked: true,
      isGridLocked: true
    }));
    playSound('shuffle');
  };

  const confirmDangerAction = () => {
    if (!confirmingAction) return;
    if (confirmingAction === 'reset') {
      setGameState(prev => ({
        ...prev,
        homeNumbers: null,
        awayNumbers: null,
        squares: {},
        isLocked: false,
        isGridLocked: false,
        homeScore: '',
        awayScore: '',
        quarterWinners: {},
        isInitialized: false
      }));
      setPastSquares([]);
      setSessionAuth({ role: null });
      setLoginView('choice');
    } else if (confirmingAction === 'clear') {
      setGameState(p => ({ ...p, squares: {} }));
    }
    setConfirmingAction(null);
    playSound('pop');
  };

  const shareGrid = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#code=${gameState.poolCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const winningInfo = useMemo(() => {
    if (!gameState.homeNumbers || !gameState.awayNumbers || gameState.homeScore === '' || gameState.awayScore === '') {
      return { coords: null, homeIdx: -1, awayIdx: -1 };
    }
    const homeLastDigit = Number(gameState.homeScore.slice(-1));
    const awayLastDigit = Number(gameState.awayScore.slice(-1));
    const colIndex = gameState.homeNumbers.indexOf(homeLastDigit);
    const rowIndex = gameState.awayNumbers.indexOf(awayLastDigit);
    return { coords: `${rowIndex}-${colIndex}`, homeIdx: colIndex, awayIdx: rowIndex };
  }, [gameState]);

  const activeWinner = winningInfo.coords ? gameState.squares[winningInfo.coords] : null;

  const saveQuarterWinner = (quarter: 'q1' | 'q2' | 'q3') => {
    if (!activeWinner) return;
    setGameState(prev => ({
      ...prev,
      quarterWinners: { ...prev.quarterWinners, [quarter]: activeWinner.owner }
    }));
    playSound('win');
  };

  const toggleSound = () => setGameState(prev => ({ ...prev, isSoundEnabled: !prev.isSoundEnabled }));
  const setTheme = (theme: Theme) => { setGameState(prev => ({ ...prev, theme })); playSound('pop'); };
  
  const updatePaymentSettings = (key: keyof NonNullable<GameState['paymentSettings']>, value: string) => {
    setGameState(prev => ({ ...prev, paymentSettings: { ...prev.paymentSettings, [key]: value } }));
  };

  const updatePrizeDist = (key: keyof PrizeDistribution, value: string) => {
    const num = parseInt(value) || 0;
    setGameState(prev => ({ ...prev, prizeDistribution: { ...prev.prizeDistribution!, [key]: num } }));
  };

  const exportState = () => {
    const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `squares-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const openPaymentLink = (method: 'venmo' | 'cashapp') => {
    const handle = method === 'venmo' ? gameState.paymentSettings?.venmo : gameState.paymentSettings?.cashApp;
    if (!handle) return alert(`No ${method} handle configured by admin.`);
    let url = '';
    const price = gameState.paymentSettings?.pricePerSquare || '10';
    if (method === 'venmo') {
        const cleanHandle = handle.replace('@', '');
        url = `https://venmo.com/${cleanHandle}?txn=pay&amount=${price}&note=Super%20Bowl%20Square`;
    } else {
        const cleanHandle = handle.replace('$', '');
        url = `https://cash.app/$${cleanHandle}/${price}`;
    }
    window.open(url, '_blank');
  };

  const stats = useMemo(() => {
    const squares = Object.values(gameState.squares) as Square[];
    const totalClaimed = squares.length;
    const totalPaid = squares.filter(s => s.isPaid).length;
    const totalPending = squares.filter(s => s.isPending && !s.isPaid).length;
    const price = parseInt(gameState.paymentSettings?.pricePerSquare || '10');
    return { totalClaimed, totalPaid, totalPending, totalPot: totalClaimed * price, collected: totalPaid * price, price };
  }, [gameState.squares, gameState.paymentSettings]);

  const prizeSum = useMemo(() => {
    const dist = gameState.prizeDistribution;
    return dist ? dist.q1 + dist.q2 + dist.q3 + dist.final : 0;
  }, [gameState.prizeDistribution]);

  const getThemeStyles = () => {
    switch (gameState.theme) {
      case 'classic': return { bg: 'bg-emerald-900', sidebarBg: 'bg-emerald-950', headerBg: 'bg-emerald-800', gridBg: 'bg-emerald-800/50', squareBg: 'bg-emerald-700/20', border: 'border-white/20', textPrimary: 'text-white', homeColor: 'text-red-400', awayColor: 'text-blue-400', accent: 'emerald', isRetro: true };
      case 'neon': return { bg: 'bg-[#050505]', sidebarBg: 'bg-black', headerBg: 'bg-[#0f0f0f]', gridBg: 'bg-black', squareBg: 'bg-purple-900/5', border: 'border-purple-500/20', textPrimary: 'text-fuchsia-100', homeColor: 'text-pink-500', awayColor: 'text-cyan-400', accent: 'fuchsia', isRetro: false };
      default: return { bg: 'bg-[#0a0a0b]', sidebarBg: 'bg-neutral-950', headerBg: 'bg-white/[0.02]', gridBg: 'bg-neutral-950', squareBg: 'bg-white/[0.04]', border: 'border-white/5', textPrimary: 'text-white', homeColor: 'text-red-500', awayColor: 'text-blue-500', accent: 'emerald', isRetro: false };
    }
  };

  const styles = getThemeStyles();
  const isAdmin = sessionAuth.role === 'admin';

  if (!sessionAuth.role) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center p-4 relative overflow-y-auto font-sans`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent)] pointer-events-none"></div>

        {isOwnerDashboardOpen && (
          <OwnerDashboard onClose={() => setIsOwnerDashboardOpen(false)} />
        )}

        <div className="w-full max-w-3xl animate-in fade-in zoom-in duration-500 py-6">
          <div className="text-center mb-6">
            <div className="relative w-40 h-40 mx-auto mb-4">
              <img src="/logo.png" alt="Sunday Squares" className="w-40 h-40 object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 italic leading-tight uppercase">Sunday Squares</h1>
            <p className="text-lime-400 font-bold uppercase tracking-[0.4em] text-[9px] mb-4 drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]">Pick. Watch. Win.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`group relative bg-neutral-900/40 backdrop-blur-2xl border-2 ${loginView === 'join' ? 'border-indigo-500 shadow-[0_0_80px_rgba(99,102,241,0.1)]' : 'border-white/5 hover:border-white/10'} rounded-2xl p-6 transition-all duration-700 flex flex-col items-center text-center cursor-pointer overflow-hidden`} onClick={() => setLoginView('join')}>
              <div className={`w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner`}>
                <ICONS.Share className="w-6 h-6 rotate-180" />
              </div>
              <h2 className="text-xl font-black text-white mb-1 tracking-tighter italic uppercase">Enter Pool</h2>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Join your existing game</p>

              {loginView === 'join' ? (
                <div className="w-full space-y-4 animate-in slide-in-from-bottom-8 duration-500 ease-out">
                  <input
                    autoFocus
                    type="text"
                    maxLength={6}
                    className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-2xl font-black text-white text-center tracking-[0.3em] outline-none focus:border-indigo-500 uppercase placeholder-neutral-800 transition-all shadow-inner"
                    placeholder="CODE"
                    value={loginInput}
                    onChange={e => setLoginInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin(loginInput)}
                  />
                  <button onClick={() => handleLogin(loginInput)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-2xl uppercase tracking-[0.2em] text-xs">Join</button>
                  <button onClick={(e) => { e.stopPropagation(); setLoginView('choice'); }} className="text-neutral-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Go Back</button>
                </div>
              ) : (
                <div className="mt-auto pt-4 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">Join Grid</div>
              )}
            </div>

            <div className={`group relative bg-neutral-900/40 backdrop-blur-2xl border-2 ${loginView === 'create' ? `border-${styles.accent}-500 shadow-[0_0_80px_rgba(16,185,129,0.1)]` : 'border-white/5 hover:border-white/10'} rounded-2xl p-6 transition-all duration-700 flex flex-col items-center text-center cursor-pointer overflow-hidden`} onClick={() => setLoginView('create')}>
              <div className={`w-12 h-12 rounded-xl bg-${styles.accent}-500/10 flex items-center justify-center mb-4 text-${styles.accent}-500 group-hover:scale-110 group-hover:bg-${styles.accent}-600 group-hover:text-white transition-all duration-500 shadow-inner`}>
                <ICONS.Plus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white mb-1 tracking-tighter italic uppercase">New Pool</h2>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Host a fresh grid</p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 mb-3">
                <span className="text-emerald-400 text-xs font-black">${POOL_FEE}</span>
                <span className="text-emerald-400/60 text-[10px] font-bold ml-1">one-time</span>
              </div>

              {loginView !== 'create' && (
                <ul className="text-center space-y-2 mb-2 w-full">
                  <li className="text-neutral-400 text-xs flex items-center justify-center gap-2">
                    <span className="text-emerald-500">✓</span> Shareable invite link
                  </li>
                  <li className="text-neutral-400 text-xs flex items-center justify-center gap-2">
                    <span className="text-emerald-500">✓</span> Auto-randomize numbers
                  </li>
                  <li className="text-neutral-400 text-xs flex items-center justify-center gap-2">
                    <span className="text-emerald-500">✓</span> Built-in payment tracking
                  </li>
                  <li className="text-neutral-400 text-xs flex items-center justify-center gap-2">
                    <span className="text-emerald-500">✓</span> Live score & winners
                  </li>
                </ul>
              )}

              {loginView === 'create' ? (
                <div className="w-full space-y-3 animate-in slide-in-from-bottom-8 duration-500 ease-out">
                  <input
                    type="text"
                    className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500 placeholder-neutral-700 transition-all shadow-inner"
                    placeholder="Pool Title (e.g. Vegas Squares)"
                    value={createData.title}
                    onChange={e => setCreateData({...createData, title: e.target.value})}
                  />
                  <div className="relative">
                      <input
                        type="password"
                        maxLength={4}
                        className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-xl font-black text-white text-center tracking-[0.8em] outline-none focus:border-emerald-500 placeholder-neutral-700 transition-all shadow-inner"
                        placeholder="PIN"
                        value={createData.pin}
                        onChange={e => setCreateData({...createData, pin: e.target.value})}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] text-neutral-600 font-black uppercase tracking-widest pointer-events-none">PIN</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleCreatePool(); }} className={`w-full py-3 bg-${styles.accent}-600 hover:bg-${styles.accent}-500 text-white font-black rounded-xl transition-all shadow-2xl uppercase tracking-[0.2em] text-xs`}>Create Pool · ${POOL_FEE}</button>
                  <button onClick={(e) => { e.stopPropagation(); setLoginView('choice'); }} className="text-neutral-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Go Back</button>
                </div>
              ) : (
                <div className="mt-auto pt-4 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">Start Game</div>
              )}
            </div>
          </div>

          {loginView === 'choice' && (
            <div className="mt-8 text-center opacity-30 hover:opacity-100 transition-all duration-500">
                <button onClick={() => setLoginView('join')} className="text-neutral-500 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center mx-auto space-x-3 group">
                    <ICONS.Lock className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                    <span>Host Login</span>
                </button>
            </div>
          )}

          {/* Payment Gate Screen */}
          {loginView === 'payment' && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <ICONS.Trophy className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic mb-2">Unlock Your Squares</h2>
                  <p className="text-neutral-500 text-sm">One-time fee to host your squares pool</p>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-neutral-400 text-sm font-bold uppercase tracking-widest">Pool Name</span>
                    <span className="text-white font-bold">{gameState.title}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-neutral-400 text-sm font-bold uppercase tracking-widest">Pool Code</span>
                    <span className="text-neutral-600 font-black tracking-wider">Revealed after payment</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-sm font-bold uppercase tracking-widest">Host Fee</span>
                      <span className="text-3xl font-black text-white italic">${POOL_FEE}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handlePayment}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-sm flex items-center justify-center space-x-3"
                  >
                    <span>Step 1: Pay ${POOL_FEE}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </button>

                  <div className="pt-2">
                    <label className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">Step 2: Enter License Key from Receipt</label>
                    <input
                      type="text"
                      placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                      value={licenseKey}
                      onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                      className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white text-center tracking-wider outline-none focus:border-emerald-500 placeholder-neutral-700 transition-all"
                    />
                  </div>

                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                      <p className="text-red-400 text-xs font-bold">{paymentError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleActivatePool}
                    disabled={!licenseKey.trim()}
                    className={`w-full py-4 bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-emerald-500/50 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center space-x-3 ${!licenseKey.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>Activate Pool</span>
                  </button>
                </div>

                <p className="text-center text-neutral-600 text-[10px] font-bold uppercase tracking-widest mt-4">
                  Secure payment via Gumroad
                </p>

                <button
                  onClick={() => setLoginView('choice')}
                  className="w-full mt-4 py-3 text-neutral-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.textPrimary} flex flex-col font-sans overflow-hidden relative transition-colors duration-500`}>
      {isCopied && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <ICONS.Check className="w-5 h-5" />
          <span>Invite link copied!</span>
        </div>
      )}

      {showPaymentToast && (
        <div className={`fixed top-36 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-full font-black shadow-2xl flex items-center space-x-4 animate-in fade-in slide-in-from-top-6 duration-500 shine-effect border-2 border-white/20`}>
          <ICONS.Check className="w-6 h-6" />
          <span className="text-lg uppercase tracking-wider">PAYMENT RECORDED</span>
        </div>
      )}

      <header className={`px-4 py-4 md:px-6 border-b border-white/5 ${styles.headerBg} backdrop-blur-md flex items-center justify-between z-40`}>
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className={`w-10 h-10 md:w-12 md:h-12 bg-${styles.accent}-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
            <ICONS.Trophy className="text-white w-6 h-6" />
          </div>
          <div className="min-w-0">
            <input className="bg-transparent text-lg md:text-xl font-bold focus:outline-none border-b border-transparent hover:border-white/20 w-full truncate" value={gameState.title} onChange={e => isAdmin && setGameState(p => ({ ...p, title: e.target.value }))} readOnly={!isAdmin} />
            <div className="flex items-center space-x-3 mt-0.5">
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Code: <span className="text-white ml-1">{gameState.poolCode}</span></p>
                {isAdmin && <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-black uppercase border border-red-500/20">Host Mode</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {isAdmin && (
            <button onClick={() => setIsAdminDashboardOpen(true)} className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-all border border-white/10">
              <ICONS.Code className="w-4 h-4" />
              <span className="hidden sm:inline uppercase tracking-widest">Dashboard</span>
            </button>
          )}
          <Tooltip text="Copy invite link" position="bottom">
            <button onClick={shareGrid} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg font-bold text-xs shadow-lg">
              <ICONS.Share className="w-4 h-4" />
              <span className="hidden sm:inline">Invite Players</span>
            </button>
          </Tooltip>
          <button onClick={() => setSessionAuth({ role: null })} className="p-2 bg-neutral-800 text-neutral-400 rounded-lg border border-white/5 hover:bg-neutral-700 hover:text-white transition-all">
            <ICONS.Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <aside className={`fixed inset-y-0 left-0 w-80 ${styles.sidebarBg} border-r border-white/5 p-6 space-y-6 z-50 transition-all transform md:relative md:translate-x-0 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Settings</h3>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Sound</span>
              <button onClick={toggleSound} className={`p-2 rounded-lg transition-colors ${gameState.isSoundEnabled ? `bg-${styles.accent}-500/10 text-${styles.accent}-500` : 'bg-neutral-800 text-neutral-500'}`}>
                {gameState.isSoundEnabled ? <ICONS.Volume className="w-4 h-4" /> : <ICONS.Mute className="w-4 h-4" />}
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {(['stadium', 'classic', 'neon'] as Theme[]).map((t) => (
                  <button key={t} onClick={() => setTheme(t)} className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase transition-all ${gameState.theme === t ? `bg-${styles.accent}-500 text-white` : 'bg-black/20 text-neutral-400 border border-white/5'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Admin Controls</h3>
              <div className="space-y-2">
                <button onClick={lockGridEntries} className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all ${gameState.isGridLocked ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                  {gameState.isGridLocked ? <ICONS.Lock className="w-3.5 h-3.5" /> : <ICONS.Unlock className="w-3.5 h-3.5" />}
                  <span>{gameState.isGridLocked ? 'Grid Locked' : 'Lock Grid'}</span>
                </button>
                <button onClick={randomizeNumbers} disabled={!gameState.isGridLocked} className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${!gameState.isGridLocked ? 'bg-neutral-800 text-neutral-600' : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'}`}>
                  <ICONS.Dice className="w-3.5 h-3.5" /> 
                  <span>{gameState.isLocked ? 'Re-Roll Numbers' : 'Roll Numbers'}</span>
                </button>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Quarter Winners</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((num) => (
                <div key={num} className="bg-black/20 border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">Q{num}</p>
                    <p className="text-sm font-bold text-white truncate">{gameState.quarterWinners[`q${num}` as keyof typeof gameState.quarterWinners] || '---'}</p>
                  </div>
                  {isAdmin && activeWinner && !gameState.quarterWinners[`q${num}` as keyof typeof gameState.quarterWinners] && (
                    <button onClick={() => saveQuarterWinner(`q${num}` as any)} className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded transition-colors opacity-0 group-hover:opacity-100">
                      <ICONS.Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className={`flex-1 p-4 md:p-8 flex flex-col items-center justify-center ${styles.bg} overflow-auto relative transition-colors duration-500`}>
          {activeWinner && (
            <div className="absolute top-8 z-30 bg-yellow-500 text-neutral-950 px-8 py-3 rounded-full font-black text-lg md:text-2xl flex items-center space-x-4 shadow-[0_0_50px_rgba(234,179,8,0.6)] animate-bounce border-4 border-white/20">
              <ICONS.Trophy className="w-6 h-6 md:w-8 md:h-8" />
              <span>WINNER: {activeWinner.owner}</span>
            </div>
          )}

          <div className={`relative flex flex-col items-center transition-all duration-500 ${activeWinner ? 'scale-105 mb-24' : 'scale-100 mb-0'}`}>
            <div className={`mb-4 text-center ${styles.homeColor} font-black uppercase tracking-[0.3em] text-sm md:text-xl drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] ${gameState.theme === 'neon' ? 'neon-text-red' : ''}`}>
              {gameState.homeTeam}
            </div>

            <div className="flex">
              <div className={`flex items-center justify-center ${styles.awayColor} font-black uppercase tracking-[0.3em] text-sm md:text-xl mr-4 md:mr-6 vertical-text drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] ${gameState.theme === 'neon' ? 'neon-text-blue' : ''}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                {gameState.awayTeam}
              </div>

              <div className={`relative shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden ${styles.gridBg} border border-white/10 max-w-full transition-all duration-700 ${activeWinner ? 'grid-winner-glow' : ''}`}>
                <div className="grid grid-cols-[30px_repeat(10,minmax(30px,1fr))] md:grid-cols-[50px_repeat(10,minmax(50px,80px))]">
                  <div className="aspect-square bg-black/40 flex items-center justify-center border-b border-r border-white/10">
                    <ICONS.Lock className={`w-3 h-3 md:w-4 md:h-4 ${gameState.isLocked ? `text-${styles.accent}-500` : 'text-neutral-700'}`} />
                  </div>
                  
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`h-${i}`} className={`aspect-square bg-black/20 flex items-center justify-center text-sm md:text-xl font-black text-white border-b border-r border-white/10 transition-all duration-300 ${winningInfo.homeIdx === i ? 'axis-active' : ''}`}>
                      {gameState.homeNumbers ? gameState.homeNumbers[i] : '?'}
                    </div>
                  ))}

                  {Array.from({ length: 10 }).map((_, rowIndex) => (
                    <React.Fragment key={`row-${rowIndex}`}>
                      <div className={`aspect-square bg-black/20 flex items-center justify-center text-sm md:text-xl font-black text-white border-r border-b border-white/10 transition-all duration-300 ${winningInfo.awayIdx === rowIndex ? 'axis-active' : ''}`}>
                        {gameState.awayNumbers ? gameState.awayNumbers[rowIndex] : '?'}
                      </div>
                      
                      {Array.from({ length: 10 }).map((_, colIndex) => {
                        const id = `${rowIndex}-${colIndex}`;
                        const square = gameState.squares[id];
                        const isWinner = winningInfo.coords === id;
                        const isTracked = winningInfo.awayIdx === rowIndex || winningInfo.homeIdx === colIndex;
                        
                        let cellStatusClass = styles.squareBg;
                        let methodIndicator = null;
                        
                        if (square?.owner) {
                            if (square.isPaid) cellStatusClass = 'bg-emerald-500/20 border-emerald-500/40';
                            else if (square.isPending) cellStatusClass = 'bg-yellow-500/10 border-yellow-500/40 animate-pulse';
                            else cellStatusClass = 'bg-red-500/10 border-red-500/40';
                            
                            const method = PAYMENT_METHODS.find(m => m.id === square.paymentMethod);
                            if (method) methodIndicator = `border-l-[${method.color}] border-l-4`;
                        }
                        
                        return (
                          <div key={id} onClick={() => handleSquareClick(rowIndex, colIndex)} className={`aspect-square border-r border-b ${styles.border} cursor-pointer relative transition-all duration-200 group ${cellStatusClass} ${methodIndicator || ''} ${isWinner ? 'winner-active shadow-2xl' : isTracked ? 'cell-track' : 'hover:bg-white/[0.08]'} ${gameState.isLocked || (gameState.isGridLocked && !isAdmin) ? 'cursor-default' : ''}`}>
                            <div className={`w-full h-full flex items-center justify-center p-1 md:p-2 text-[8px] md:text-xs font-bold text-center break-all leading-tight overflow-hidden transition-colors ${isWinner ? 'text-neutral-100 scale-110 drop-shadow-sm font-black' : isTracked ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
                              <span className="line-clamp-2 uppercase tracking-tighter">{square?.owner || ''}</span>
                            </div>
                            {square?.owner && (
                              <div className="absolute top-0.5 right-0.5">
                                {square.isPaid ? (
                                  <div className="bg-emerald-500 rounded-full p-0.5 shadow-sm border border-white/20"><ICONS.Check className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" /></div>
                                ) : square.isPending ? (
                                  <div className="bg-yellow-500 rounded-full p-0.5 shadow-sm border border-white/20"><ICONS.AlertCircle className="w-1.5 h-1.5 md:w-2 md:h-2 text-neutral-900" /></div>
                                ) : (
                                  <div className="bg-red-500 rounded-full p-0.5 shadow-sm border border-white/20"><ICONS.AlertCircle className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" /></div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6 bg-black/40 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl">
             <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Status Legend</p>
                <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Paid & Verified</span>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Sent (Pending)</span>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Unpaid</span>
                </div>
             </div>
             
             <div className="space-y-3 lg:border-l lg:border-white/10 lg:pl-6 col-span-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Payments</p>
                {PAYMENT_METHODS.map(m => (
                    <div key={m.id} className="flex items-center space-x-3">
                        <div className="w-1 h-3 rounded-full" style={{ backgroundColor: m.color }}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">{m.label}</span>
                    </div>
                ))}
             </div>

             <div className="hidden lg:block lg:border-l lg:border-white/10 lg:pl-6 col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Pool Stats</p>
                <div className="flex items-center justify-between bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <div className="text-center">
                        <p className="text-[10px] text-neutral-500 uppercase font-black">Pot</p>
                        <p className="text-xl font-black italic text-white">${stats.totalPot}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10 mx-4"></div>
                    <div className="text-center">
                        <p className="text-[10px] text-neutral-500 uppercase font-black">Verified</p>
                        <p className="text-xl font-black italic text-emerald-400">${stats.collected}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10 mx-4"></div>
                    <div className="text-center">
                        <p className="text-[10px] text-neutral-500 uppercase font-black">Sent</p>
                        <p className="text-xl font-black italic text-yellow-400">${stats.totalPending * stats.price}</p>
                    </div>
                </div>
             </div>
          </div>

          {gameState.isLocked && (
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 ${styles.sidebarBg}/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-6 md:space-x-12 animate-in slide-in-from-bottom-8 duration-500`}>
              <div className="text-center group">
                <label className={`text-[10px] ${styles.homeColor} uppercase font-black mb-1 block tracking-widest`}>{gameState.homeTeam}</label>
                <input type="number" placeholder="0" className={`w-16 md:w-24 bg-black/40 border-2 ${styles.isRetro ? 'border-red-500/80 rounded-none' : 'border-red-500/30 rounded-2xl'} px-2 py-3 text-2xl md:text-4xl font-black text-center text-white outline-none`} value={gameState.homeScore} onChange={e => isAdmin && setGameState(p => ({ ...p, homeScore: e.target.value }))} readOnly={!isAdmin} />
              </div>
              <div className="text-center group">
                <label className={`text-[10px] ${styles.awayColor} uppercase font-black mb-1 block tracking-widest`}>{gameState.awayTeam}</label>
                <input type="number" placeholder="0" className={`w-16 md:w-24 bg-black/40 border-2 ${styles.isRetro ? 'border-blue-500/80 rounded-none' : 'border-blue-500/30 rounded-2xl'} px-2 py-3 text-2xl md:text-4xl font-black text-center text-white outline-none`} value={gameState.awayScore} onChange={e => isAdmin && setGameState(p => ({ ...p, awayScore: e.target.value }))} readOnly={!isAdmin} />
              </div>
            </div>
          )}
        </section>
      </main>

      {editingSquare && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className={`${styles.sidebarBg} border border-white/10 rounded-3xl w-full max-sm p-8 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-y-auto max-h-[90vh]`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black flex items-center text-white italic tracking-tighter uppercase">
                {isAdmin ? 'Host Entry' : 'Claim Square'}
              </h2>
              {gameState.squares[editingSquare] && (
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isPaidLocal ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : isPendingLocal ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                  {isPaidLocal ? 'Paid' : isPendingLocal ? 'Sent' : 'Unpaid'}
                </div>
              )}
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em]">Name</label>
                    {isAdmin && (
                        <button 
                            onClick={() => {
                                const input = document.getElementById('owner-input') as HTMLInputElement;
                                if (input) input.value = "HOST";
                            }}
                            className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 font-black uppercase hover:bg-indigo-500 hover:text-white transition-all"
                        >
                            Quick Host
                        </button>
                    )}
                </div>
                <input autoFocus className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-5 py-5 text-xl font-bold text-white outline-none focus:border-indigo-500 uppercase placeholder-neutral-700" placeholder="e.g. MIKE D." defaultValue={gameState.squares[editingSquare]?.owner || ''} id="owner-input" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-neutral-500 uppercase font-black block tracking-[0.2em]">Pay with</label>
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map(method => (
                    <button 
                      key={method.id} 
                      onClick={() => setSelectedPaymentMethod(method.id as any)}
                      className={`py-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${selectedPaymentMethod === method.id ? `bg-white/5 border-[${method.color}] text-white shadow-lg` : 'bg-black/20 border-white/5 text-neutral-600'}`}
                      style={{ borderColor: selectedPaymentMethod === method.id ? method.color : undefined }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedPaymentMethod === method.id ? 'text-white' : ''}`}>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPaymentMethod && !isAdmin && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-5 animate-in slide-in-from-top-4 shadow-xl">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Square Price: <span className="text-white text-xl ml-2 font-black italic">${gameState.paymentSettings?.pricePerSquare || '10'}</span></p>
                    </div>
                    {selectedPaymentMethod === 'cash' ? (
                        <button 
                            onClick={() => updateSquareOwner((document.getElementById('owner-input') as HTMLInputElement).value, { isPaid: false, isPending: true })}
                            className="w-full py-5 bg-[#f97316] text-white font-black rounded-2xl transition-all uppercase tracking-widest shadow-xl shadow-orange-600/20"
                        >
                            Mark Sent
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <button 
                                onClick={() => openPaymentLink(selectedPaymentMethod as any)}
                                className={`w-full py-5 ${selectedPaymentMethod === 'venmo' ? 'bg-[#3d95ce]' : 'bg-[#00d632]'} text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm`}
                            >
                                Pay with {selectedPaymentMethod === 'venmo' ? 'Venmo' : 'Cash App'}
                            </button>
                            <button 
                                onClick={() => updateSquareOwner((document.getElementById('owner-input') as HTMLInputElement).value, { isPaid: false, isPending: true })}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all uppercase tracking-[0.2em] text-xs"
                            >
                                I Sent Payment
                            </button>
                        </div>
                    )}
                </div>
              )}

              {isAdmin && (
                <div className="space-y-6 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setIsPaidLocal(true); setIsPendingLocal(false); }} className={`p-5 rounded-2xl flex flex-col items-center border-2 transition-all ${isPaidLocal ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-black/20 border-white/5 text-neutral-600'}`}>
                        <ICONS.Check className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Verify Paid</span>
                    </button>
                    <button onClick={() => { setIsPendingLocal(true); setIsPaidLocal(false); }} className={`p-5 rounded-2xl flex flex-col items-center border-2 transition-all ${isPendingLocal ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-black/20 border-white/5 text-neutral-600'}`}>
                        <ICONS.AlertCircle className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Mark Sent</span>
                    </button>
                  </div>
                  <button onClick={() => updateSquareOwner((document.getElementById('owner-input') as HTMLInputElement).value)} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl shadow-2xl uppercase tracking-widest text-sm">Save Changes</button>
                  <button onClick={() => {
                        const newSquares = { ...gameState.squares };
                        delete newSquares[editingSquare!];
                        setGameState(prev => ({ ...prev, squares: newSquares }));
                        setEditingSquare(null);
                  }} className="w-full py-4 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl transition-all text-[10px] uppercase tracking-widest">Delete Square</button>
                </div>
              )}

              <button onClick={() => setEditingSquare(null)} className="w-full py-4 text-neutral-600 hover:text-white font-black transition-all uppercase tracking-widest text-[10px]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isAdminDashboardOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[80] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-[3rem] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center">
                  <ICONS.Code className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Pool Dashboard</h2>
                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] mt-1">Grid Code: <span className="text-white ml-2">{gameState.poolCode}</span></p>
                </div>
              </div>
              <button onClick={() => setIsAdminDashboardOpen(false)} className="p-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all">
                <ICONS.Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <nav className="w-72 border-r border-white/5 p-6 space-y-3 bg-black/20">
                {[
                    { id: 'ledger', label: 'Financials', icon: <ICONS.Trophy className="w-5 h-5" /> },
                    { id: 'settings', label: 'Pool Rules', icon: <ICONS.Dice className="w-5 h-5" /> },
                    { id: 'data', label: 'Settings', icon: <ICONS.Lock className="w-5 h-5" /> }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setDashboardTab(tab.id as any)} className={`w-full p-5 rounded-2xl flex items-center space-x-4 transition-all ${dashboardTab === tab.id ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/20' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                    {tab.icon} <span className="uppercase tracking-widest text-[11px]">{tab.label}</span>
                  </button>
                ))}
              </nav>

              <div className="flex-1 overflow-y-auto p-12 bg-[#0c0c0d]">
                {dashboardTab === 'ledger' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-neutral-800/50 border border-white/5 p-6 rounded-3xl text-center">
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3">Total Pot</p>
                        <p className="text-4xl font-black text-white italic">${stats.totalPot}</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
                        <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest mb-3">Verified</p>
                        <p className="text-4xl font-black text-emerald-500 italic">${stats.collected}</p>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-3xl text-center">
                        <p className="text-[10px] text-yellow-500/60 font-black uppercase tracking-widest mb-3">Pending</p>
                        <p className="text-4xl font-black text-yellow-500 italic">{stats.totalPending}</p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center">
                        <p className="text-[10px] text-red-500/60 font-black uppercase tracking-widest mb-3">Unpaid</p>
                        <p className="text-4xl font-black text-red-500 italic">{stats.totalClaimed - stats.totalPaid - stats.totalPending}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center">
                                <ICONS.Trophy className="w-5 h-5 mr-4 text-yellow-500" /> Payouts
                            </h3>
                            <div className="space-y-4">
                                {[
                                { id: 'q1', label: 'Q1 Winner', val: gameState.prizeDistribution?.q1 },
                                { id: 'q2', label: 'Q2 Winner', val: gameState.prizeDistribution?.q2 },
                                { id: 'q3', label: 'Q3 Winner', val: gameState.prizeDistribution?.q3 },
                                { id: 'final', label: 'Final Winner', val: gameState.prizeDistribution?.final },
                                ].map((q) => (
                                <div key={q.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                    <span className="text-sm font-bold text-neutral-400">{q.label}</span>
                                    <span className="text-2xl font-black text-emerald-400 italic">${(stats.totalPot * (q.val || 0) / 100).toFixed(2)}</span>
                                </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 h-full flex flex-col">
                            <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-8 flex items-center">
                                <ICONS.AlertCircle className="w-5 h-5 mr-4 text-yellow-500" /> Pending Payments
                            </h3>
                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scroll max-h-[400px]">
                                {(Object.values(gameState.squares) as Square[]).filter(s => s.isPending && !s.isPaid).length === 0 ? (
                                    <div className="text-center py-16 text-neutral-700 italic text-sm">No pending payments.</div>
                                ) : (
                                    (Object.values(gameState.squares) as Square[]).filter(s => s.isPending && !s.isPaid).map(square => {
                                        const method = PAYMENT_METHODS.find(m => m.id === square.paymentMethod);
                                        return (
                                            <div key={square.id} className={`bg-black/60 border ${method ? method.border : 'border-white/10'} p-5 rounded-2xl flex items-center justify-between animate-in slide-in-from-right-2 duration-300 shadow-xl`}>
                                                <div className="flex items-center space-x-4">
                                                    <div className={`w-1 h-10 rounded-full`} style={{ backgroundColor: method?.color || '#333' }}></div>
                                                    <div>
                                                        <p className="text-sm font-black text-white italic uppercase tracking-tighter">{square.owner}</p>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${method?.bg || 'bg-neutral-800'} ${method?.text || 'text-neutral-500'}`}>{method?.label || 'Cash'}</span>
                                                            <span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest">Square {square.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setGameState(prev => ({
                                                            ...prev,
                                                            squares: { ...prev.squares, [square.id]: { ...square, isPaid: true, isPending: false } }
                                                        }));
                                                        playSound('win');
                                                    }}
                                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                                                >
                                                    Verify
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

                {dashboardTab === 'settings' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 space-y-8">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Payment Accounts</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 block">Price per Square ($)</label>
                          <input className="w-full bg-black/60 border-2 border-white/5 rounded-2xl px-6 py-4 text-2xl font-black text-white italic outline-none focus:border-indigo-500" value={gameState.paymentSettings?.pricePerSquare} onChange={e => updatePaymentSettings('pricePerSquare', e.target.value)} />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] text-[#3d95ce] font-black uppercase tracking-widest mb-3 block">Venmo @Handle</label>
                          <input className="w-full bg-black/60 border-2 border-[#3d95ce]/20 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#3d95ce]" placeholder="@handle" value={gameState.paymentSettings?.venmo} onChange={e => updatePaymentSettings('venmo', e.target.value)} />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] text-[#00d632] font-black uppercase tracking-widest mb-3 block">Cash App $Handle</label>
                          <input className="w-full bg-black/60 border-2 border-[#00d632]/20 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#00d632]" placeholder="$handle" value={gameState.paymentSettings?.cashApp} onChange={e => updatePaymentSettings('cashApp', e.target.value)} />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] text-[#f97316] font-black uppercase tracking-widest mb-3 block">Cash Instructions</label>
                          <input className="w-full bg-black/60 border-2 border-[#f97316]/20 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#f97316]" placeholder="e.g. Find host at bar" value={gameState.paymentSettings?.cash} onChange={e => updatePaymentSettings('cash', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Payout Allocation (%)</h3>
                        <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${prizeSum === 100 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                           Total: {prizeSum}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                          { id: 'q1', label: 'Q1' },
                          { id: 'q2', label: 'Q2' },
                          { id: 'q3', label: 'Q3' },
                          { id: 'final', label: 'Final' },
                        ].map(q => (
                          <div key={q.id}>
                            <label className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-4 block text-center italic">{q.label}</label>
                            <input 
                              type="number"
                              className="w-full bg-black/60 border-2 border-white/5 rounded-3xl px-4 py-5 text-3xl font-black text-white italic text-center outline-none focus:border-indigo-500 transition-all"
                              value={gameState.prizeDistribution?.[q.id as keyof PrizeDistribution]}
                              onChange={(e) => updatePrizeDist(q.id as any, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {dashboardTab === 'data' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 space-y-8">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Access</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                          <label className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-4 block">Invite Code</label>
                          <div className="flex items-center space-x-4">
                            <input readOnly className="flex-1 bg-black/60 border-2 border-white/5 rounded-2xl px-6 py-4 text-2xl font-black text-white italic tracking-[0.3em] uppercase" value={gameState.poolCode} />
                            <button onClick={() => setGameState(p => ({ ...p, poolCode: Math.random().toString(36).substring(2, 8).toUpperCase() }))} className="p-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl transition-all active:scale-95">
                              <ICONS.Refresh className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-4 block">Admin PIN</label>
                          <input 
                            maxLength={4} 
                            className="w-full bg-black/60 border-2 border-white/5 rounded-2xl px-6 py-4 text-2xl font-black text-white italic tracking-[1.5em] text-center" 
                            value={gameState.adminPin} 
                            onChange={e => setGameState(p => ({ ...p, adminPin: e.target.value }))} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between hover:border-white/20 transition-all">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">Save Backup</h3>
                                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Download current pool state.</p>
                            </div>
                            <button onClick={exportState} className="mt-10 px-10 py-6 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl border border-white/10 flex items-center justify-center space-x-4 transition-all">
                                <ICONS.Share className="w-6 h-6" /> <span className="uppercase tracking-[0.2em] text-xs">Download JSON</span>
                            </button>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-10 flex flex-col justify-between hover:bg-red-500/10 transition-all">
                            <div>
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-3">Reset Pool</h3>
                                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Wipe all entries permanently.</p>
                            </div>
                            <button onClick={() => setConfirmingAction('reset')} className="mt-10 px-10 py-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-3xl shadow-2xl flex items-center justify-center space-x-4 transition-all">
                                <ICONS.Trash className="w-6 h-6" /> <span className="uppercase tracking-[0.2em] text-xs">Full Wipe</span>
                            </button>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmingAction && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl">
          <div className="bg-neutral-900 border-2 border-red-500/30 rounded-[3rem] w-full max-sm p-12 text-center shadow-2xl">
            <ICONS.AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-8 animate-pulse" />
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest italic">Are you sure?</h2>
            <p className="text-[10px] text-neutral-500 font-black mb-10 uppercase tracking-widest leading-loose">This will delete all players and reset the grid completely.</p>
            <div className="space-y-4">
              <button onClick={confirmDangerAction} className="w-full py-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-2xl uppercase tracking-[0.3em] text-xs">Delete Everything</button>
              <button onClick={() => setConfirmingAction(null)} className="w-full py-4 text-neutral-600 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">Abort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
