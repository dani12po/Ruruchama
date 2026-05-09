/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Gamepad2, 
  ExternalLink, 
  MessageSquare, 
  Heart, 
  Tv, 
  Smartphone,
  Play,
  User,
  Coffee,
  Zap,
  Music,
  Cpu,
  Monitor,
  Keyboard,
  Mouse,
  Mic2,
  Armchair,
  Layout,
  Sun,
  Volume2,
  VolumeX
} from 'lucide-react';

// --- CONFIG ---
const WORKER_URL = "https://ruruchama.qolandanii.workers.dev/"; // Ganti dengan URL Worker asli Anda

const TikTokIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.81-.74-3.94-1.69-.17-.15-.33-.31-.49-.47v5.17c-.01 1.57-.35 3.19-1.25 4.45-1.27 1.76-3.4 2.81-5.59 2.51-2.4-.24-4.52-2.19-4.83-4.58-.35-2.22.84-4.66 2.85-5.67.6-.32 1.25-.51 1.93-.57.01 1.34-.01 2.67.01 4-.28.02-.57.06-.85.15-1.12.33-1.92 1.46-1.8 2.63.09 1.16.98 2.16 2.14 2.32.96.11 1.98-.18 2.61-1 .59-.73.68-1.74.68-2.65V0h-.02z"/>
  </svg>
);
import ParticleBackground from './components/ParticleBackground';

// --- STYLIZED LOGOS ---
const LogoBox = ({ type, text }: { type: 'ML' | 'HoK' | 'TikTok' | 'YT' | 'SW' | 'SB', text?: string }) => {
  const styles = {
    ML: "bg-blue-900/50 border-neon-cyan text-neon-cyan",
    HoK: "bg-amber-900/50 border-neon-gold text-neon-gold",
    TikTok: "bg-slate-800 border-[#69c9d0] text-[#69c9d0]",
    YT: "bg-red-900/50 border-red-500 text-red-500",
    SW: "bg-emerald-900/50 border-emerald-400 text-emerald-400",
    SB: "bg-purple-900/50 border-neon-purple text-neon-purple"
  };

  return (
    <div className={`px-2 py-1 border font-orbitron font-bold text-xs rounded tracking-widest ${styles[type]}`}>
      {text || type}
    </div>
  );
};

export default function App() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ruruLoading, setRuruLoading] = useState(true);
  const [plicaLoading, setPlicaLoading] = useState(true);
  const [isRuruOffline, setIsRuruOffline] = useState(false);
  const [isPlicaOffline, setIsPlicaOffline] = useState(false);
  const [isRuruMuted, setIsRuruMuted] = useState(true);
  const [isPlicaMuted, setIsPlicaMuted] = useState(true);

  const ruruVideoRef = useRef<HTMLVideoElement>(null);
  const plicaVideoRef = useRef<HTMLVideoElement>(null);
  const hlsPlayerRuruRef = useRef<Hls | null>(null);
  const hlsPlayerPlicaRef = useRef<Hls | null>(null);
  const ruruCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const plicaCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  useEffect(() => {
    // --- SMART LIVE MONITOR (Hls.js + Cloudflare Worker Proxy) ---
    const setupStreamPlayer = (
      type: 'ruru' | 'plica',
      videoElement: HTMLVideoElement | null,
      playerRef: { current: Hls | null },
      intervalRef: { current: NodeJS.Timeout | null },
      setLoading: (val: boolean) => void,
      setOffline: (val: boolean) => void
    ) => {
      if (!videoElement) return;

      const username = type === 'plica' ? 'plicachuu' : 'rururu22gaming';
      
      const stopStreaming = () => {
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
        videoElement.src = "";
      };

      const startStreaming = async () => {
        stopStreaming();
        setLoading(true);
        setOffline(false);

        try {
          const response = await fetch(`${WORKER_URL}?user=${username}`);
          const data = await response.json();

          if (data.live && data.stream) {
            console.log(`${type} detected LIVE. URL:`, data.stream);
            
            if (Hls.isSupported()) {
              const hls = new Hls({ lowLatencyMode: true });
              hls.loadSource(data.stream);
              hls.attachMedia(videoElement);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play().catch(() => {
                  console.log("Autoplay blocked, needs user interaction");
                });
              });
              hls.on(Hls.Events.ERROR, (_, errorData) => {
                if (errorData.fatal) handleOffline();
              });
              playerRef.current = hls;
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
              videoElement.src = data.stream;
              videoElement.play();
            }

            setOffline(false);
            setLoading(false);
            stopRetryCycle();
            startRetryCycle(30000); // Check every 30s when live
          } else {
            console.log(`${type} is offline according to API.`);
            handleOffline();
          }
        } catch (error) {
          console.error(`Error checking ${type} status:`, error);
          handleOffline();
        }
      };

      const handleOffline = () => {
        setOffline(true);
        setLoading(false);
        stopStreaming();
        stopRetryCycle();
        startRetryCycle(5 * 60 * 1000); // Check every 5 minutes when offline
      };

      const startRetryCycle = (delay: number) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          console.log(`Auto-checking ${type} status (${delay}ms)...`);
          startStreaming();
        }, delay);
      };

      const stopRetryCycle = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      videoElement.onplaying = () => {
        setOffline(false);
        setLoading(false);
      };

      videoElement.onerror = () => {
        // Only trigger offline if we don't have a stream source (prevent noise)
        if (videoElement.src) handleOffline();
      };

      startStreaming();
    };

    const timer = setTimeout(() => {
      setupStreamPlayer('ruru', ruruVideoRef.current, hlsPlayerRuruRef, ruruCheckIntervalRef, setRuruLoading, setIsRuruOffline);
      setupStreamPlayer('plica', plicaVideoRef.current, hlsPlayerPlicaRef, plicaCheckIntervalRef, setPlicaLoading, setIsPlicaOffline);
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (hlsPlayerRuruRef.current) hlsPlayerRuruRef.current.destroy();
      if (hlsPlayerPlicaRef.current) hlsPlayerPlicaRef.current.destroy();
      if (ruruCheckIntervalRef.current) clearInterval(ruruCheckIntervalRef.current);
      if (plicaCheckIntervalRef.current) clearInterval(plicaCheckIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    // Load TikTok embed script
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen selection:bg-neon-cyan selection:text-cyber-dark">
      {/* Scanlines Overlay */}
      <div className="fixed inset-0 scanlines pointer-events-none" />
      
      <ParticleBackground />

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-cyber-dark/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-neon-cyan to-neon-purple rounded-sm rotate-45 flex items-center justify-center">
            <span className="text-[10px] font-orbitron font-black text-cyber-dark -rotate-45">RP</span>
          </div>
          <span className="font-orbitron font-black text-sm sm:text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-purple uppercase">
            RuruChama <span className="text-white/20">×</span> Plicachu
          </span>
        </div>
        <div className="hidden md:flex gap-8 font-orbitron text-[10px] tracking-[0.2em] font-medium uppercase text-white/60">
          <a href="#streamer" className="hover:text-neon-cyan transition-colors">Streamer</a>
          <a href="#live" className="hover:text-neon-pink transition-colors">Live</a>
          <a href="#games" className="hover:text-neon-gold transition-colors">Games</a>
          <a href="#video" className="hover:text-neon-cyan transition-colors">Video</a>
          <a href="#donasi" className="hover:text-neon-purple transition-colors">Donasi</a>
        </div>
        <div className="flex gap-4">
          <a href="https://saweria.co/rururu22" target="_blank" rel="noopener noreferrer" className="p-2 border border-neon-purple/30 rounded hover:bg-neon-purple/20 transition-all text-neon-purple">
            <Coffee size={18} />
          </a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 overflow-hidden">
        {/* Background Grid */}
        <div 
          className="absolute inset-0 -z-10 opacity-20"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(0, 245, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg) translateY(-100px)',
            maskImage: 'linear-gradient(to bottom, black, transparent)'
          }}
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8">
            <span className="w-2 h-2 bg-neon-pink rounded-full blink" />
            <span className="font-mono text-[10px] tracking-widest text-white/50 uppercase">🔴 GAMING CONTENT CREATORS</span>
          </div>
          
          <h1 className="font-orbitron font-black text-4xl sm:text-6xl md:text-8xl lg:text-9xl tracking-tighter mb-4 uppercase">
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">RuruChama</span>
          </h1>

          <p className="font-orbitron text-neon-cyan tracking-widest md:tracking-[0.4em] text-[10px] sm:text-xs md:text-sm uppercase mb-12">
            Mobile Legends <span className="text-white/20">·</span> Honor of Kings <span className="text-white/20">·</span> TikTok Live
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="https://www.tiktok.com/@rururu22gaming/live"
              target="_blank"
              className="group relative px-6 md:px-8 py-3 md:py-4 bg-transparent overflow-hidden border border-neon-cyan/50 rounded-sm"
            >
              <div className="absolute inset-0 bg-neon-cyan/10 group-hover:bg-neon-cyan/20 transition-all" />
              <div className="relative flex items-center gap-3 font-orbitron text-[10px] md:text-xs font-bold tracking-[0.2em] text-neon-cyan uppercase">
                <Play size={10} fill="currentColor" className="md:w-[14px] md:h-[14px]" /> TONTON LIVE RURU
              </div>
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-neon-cyan group-hover:w-full transition-all duration-300" />
            </motion.a>

            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="https://www.tiktok.com/@plicachuu/live"
              target="_blank"
              className="group relative px-6 md:px-8 py-3 md:py-4 bg-transparent overflow-hidden border border-neon-purple/50 rounded-sm"
            >
              <div className="absolute inset-0 bg-neon-purple/10 group-hover:bg-neon-purple/20 transition-all" />
              <div className="relative flex items-center gap-3 font-orbitron text-[10px] md:text-xs font-bold tracking-[0.2em] text-neon-purple uppercase">
                <Play size={10} fill="currentColor" className="md:w-[14px] md:h-[14px]" /> TONTON LIVE PLICA
              </div>
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-neon-purple group-hover:w-full transition-all duration-300" />
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* PROFIL STREAMER */}
      <section id="streamer" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <h2 className="font-orbitron text-3xl font-black uppercase mb-2 tracking-tighter">THE SQUAD</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-neon-cyan to-neon-purple mx-auto" />
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* RuruChama Card */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group"
          >
            <div className="absolute -inset-4 bg-neon-cyan/5 blur-3xl group-hover:bg-neon-cyan/10 transition-all rounded-full" />
            <div className="relative bg-cyber-dark border border-white/10 overflow-hidden hover:border-neon-cyan/50 transition-all duration-500 rounded-lg">
              <div className="h-32 relative overflow-hidden">
                <div 
                  className="w-full h-full relative"
                  style={{ 
                    background: 'linear-gradient(135deg, #001a3e 0%, #003888 50%, #001a3e 100%)'
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ 
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,245,255,0.05) 10px, rgba(0,245,255,0.05) 20px)`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none px-4 text-center">
                    <span className="font-orbitron font-black text-xl md:text-2xl text-neon-cyan/20 tracking-tighter leading-tight">
                      MOBILE LEGENDS<br/>BANG BANG
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark to-transparent" />
              </div>
              <div className="px-8 pb-8 -mt-12">
                <div className="w-24 h-24 bg-cyber-dark border-4 border-neon-cyan rounded-sm flex items-center justify-center font-orbitron font-black text-3xl text-neon-cyan neon-glow-cyan mb-6 relative z-10">
                  RC
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-orbitron text-3xl font-black uppercase mb-1">RuruChama</h3>
                    <div className="flex items-center gap-3">
                      <svg width="40" height="40" viewBox="0 0 48 48" className="drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                        <rect width="48" height="48" rx="10" fill="#001a3e" stroke="#00f5ff" strokeWidth="1.5"/>
                        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#00f5ff" style={{ fontFamily: 'Orbitron, monospace', fontSize: '11px', fontWeight: '900' }}>ML</text>
                      </svg>
                      <span className="px-2 py-1 bg-white/5 text-neon-cyan text-[10px] font-mono tracking-widest uppercase rounded border border-neon-cyan/20">EX-PRO</span>
                    </div>
                  </div>
                  <Gamepad2 className="text-white/20 group-hover:text-neon-cyan transition-all" size={32} />
                </div>
                
                <div className="space-y-3 font-mono text-sm text-white/60 mb-8 p-4 bg-white/5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span>NICKNAME</span>
                    <span className="text-white">RuruChama</span>
                  </div>
                  <div className="flex justify-between items-center group/id cursor-pointer" onClick={() => copyToClipboard('497505540')}>
                    <span>GAME ID</span>
                    <span className="text-white flex items-center gap-2 group-hover/id:text-neon-cyan transition-colors">
                      {copiedId === '497505540' ? 'COPIED!' : '497505540'}
                      <Zap size={10} className={copiedId === '497505540' ? 'text-neon-cyan' : 'opacity-0 group-hover/id:opacity-100'} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAIN ROLE</span>
                    <span className="text-white">Mage / Support</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-[10px] text-neon-cyan/60 font-medium uppercase tracking-[0.2em] text-center">
                    klik ID game untuk mencopy
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <a href="https://www.tiktok.com/@rururu22gaming" target="_blank" className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-neon-cyan hover:text-cyber-dark transition-all font-orbitron font-bold text-[10px] tracking-widest uppercase rounded">
                    TIKTOK <ExternalLink size={12} />
                  </a>
                  <a href="https://youtube.com/@rururu22gaming" target="_blank" className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-red-600 transition-all font-orbitron font-bold text-[10px] tracking-widest uppercase rounded">
                    YOUTUBE <Youtube size={12} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group"
          >
            <div className="absolute -inset-4 bg-[#ff4d4d]/5 blur-3xl group-hover:bg-[#ff4d4d]/10 transition-all rounded-full" />
            <div className="relative bg-cyber-dark border border-white/10 overflow-hidden hover:border-[#ff4d4d]/50 transition-all duration-500 rounded-lg">
              <div className="h-32 relative overflow-hidden">
                <div 
                  className="w-full h-full relative"
                  style={{ 
                    background: 'linear-gradient(135deg, #1a0a00 0%, #5a2200 50%, #1a0a00 100%)'
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ 
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,215,0,0.05) 10px, rgba(255,215,0,0.05) 20px)`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none px-4 text-center">
                    <span className="font-orbitron font-black text-xl md:text-2xl text-neon-gold/20 tracking-tighter leading-tight">
                      HONOR OF KINGS
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark to-transparent" />
              </div>
              <div className="px-8 pb-8 -mt-12">
                <div className="w-24 h-24 bg-cyber-dark border-4 border-[#ff4d4d] rounded-sm flex items-center justify-center font-orbitron font-black text-3xl text-[#ff4d4d] shadow-[0_0_15px_rgba(255,77,77,0.3)] mb-6 relative z-10">
                  PC
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-orbitron text-3xl font-black uppercase mb-1">Plicachu</h3>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-1 rounded-sm border border-[#ff4d4d]/30 group-hover:border-[#ff4d4d] transition-all shadow-[0_0_15px_rgba(255,77,77,0.1)] overflow-hidden">
                        <svg width="32" height="32" viewBox="0 0 48 48">
                          <rect width="48" height="48" rx="10" fill="#2a1000" stroke="#ffd700" strokeWidth="1.5"/>
                          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#ffd700" style={{ fontFamily: 'Orbitron, monospace', fontSize: '10px', fontWeight: '900' }}>HoK</text>
                        </svg>
                      </div>
                      <span className="px-2 py-1 bg-white/5 text-[#ff4d4d] text-[10px] font-mono tracking-widest uppercase rounded border border-[#ff4d4d]/20">LIVE HOST</span>
                    </div>
                  </div>
                  <Gamepad2 className="text-white/20 group-hover:text-[#ff4d4d] transition-all" size={32} />
                </div>
                
                <div className="space-y-3 font-mono text-sm text-white/60 mb-8 p-4 bg-white/5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span>NICKNAME</span>
                    <span className="text-white">Plicachu</span>
                  </div>
                  <div className="flex justify-between items-center group/id cursor-pointer" onClick={() => copyToClipboard('KOB3584')}>
                    <span>GAME ID</span>
                    <span className="text-white flex items-center gap-2 group-hover/id:text-[#ff4d4d] transition-colors">
                      {copiedId === 'KOB3584' ? 'COPIED!' : 'KOB3584'}
                      <Zap size={10} className={copiedId === 'KOB3584' ? 'text-[#ff4d4d]' : 'opacity-0 group-hover/id:opacity-100'} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAIN ROLE</span>
                    <span className="text-white">Mage / Support</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-[10px] text-[#ff4d4d]/60 font-medium uppercase tracking-[0.2em] text-center">
                    klik ID game untuk mencopy
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <a href="https://www.tiktok.com/@plicachuu" target="_blank" className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-[#ff4d4d] hover:text-cyber-dark transition-all font-orbitron font-bold text-[10px] tracking-widest uppercase rounded">
                    TIKTOK PAGE <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LIVE STREAM SECTION */}
      <section id="live" className="py-24 px-6 bg-gradient-to-b from-transparent via-white/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="font-orbitron text-3xl font-black uppercase mb-2 tracking-tighter">LIVE BROADCAST</h2>
            <p className="text-white/40 font-mono text-[10px] tracking-[0.2em] uppercase">Connect directly to the arena</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Ruru Panel */}
            <div className="space-y-6">
              <div className="relative aspect-video bg-black rounded border border-neon-cyan/30 overflow-hidden group">
                <AnimatePresence>
                  {(ruruLoading || isRuruOffline) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cyber-dark/95"
                    >
                      {isRuruOffline ? (
                        <div className="text-center px-4">
                          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mx-auto mb-4">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                          </div>
                          <p className="font-orbitron text-[10px] text-red-500 tracking-[0.2em] uppercase mb-1">Stream Sedang Offline</p>
                          <p className="font-orbitron text-[8px] text-white/40 tracking-[0.1em] uppercase">Mengecek kembali setiap 5 menit</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-10 h-10 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
                          <p className="font-orbitron text-[10px] text-neon-cyan tracking-[0.2em] animate-pulse uppercase">Memuat live stream...</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* VIDEO PLAYER */}
                <video 
                  ref={ruruVideoRef}
                  className={`w-full h-full object-cover bg-black ${isRuruOffline ? 'hidden' : 'block'}`}
                  autoPlay
                  playsInline
                  muted={isRuruMuted}
                />

                {/* OVERLAYS */}
                {!isRuruOffline && !ruruLoading && (
                  <>
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1 bg-red-600 rounded-sm z-10">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="font-orbitron font-bold text-[8px] tracking-widest text-white uppercase">● LIVE</span>
                    </div>
                    <button 
                      onClick={() => setIsRuruMuted(!isRuruMuted)}
                      className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all z-10 border border-white/10"
                    >
                      {isRuruMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded sm z-10">
                      <span className="font-orbitron font-bold text-[8px] tracking-widest text-neon-cyan uppercase">RURURU22GAMING</span>
                    </div>
                  </>
                )}
              </div>
              <a href="https://www.tiktok.com/@rururu22gaming/live" target="_blank" rel="noreferrer" className="block text-center font-orbitron text-[10px] text-neon-cyan hover:underline tracking-widest uppercase py-3 bg-neon-cyan/5 rounded border border-neon-cyan/20">
                BUKA DI TIKTOK <ExternalLink size={10} className="inline ml-1" />
              </a>
            </div>

            {/* Plica Panel */}
            <div className="space-y-6">
              <div className="relative aspect-video bg-black rounded border border-[#ff4d4d]/30 overflow-hidden group">
                <AnimatePresence>
                  {(plicaLoading || isPlicaOffline) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cyber-dark/95"
                    >
                      {isPlicaOffline ? (
                        <div className="text-center px-4">
                          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mx-auto mb-4">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                          </div>
                          <p className="font-orbitron text-[10px] text-red-500 tracking-[0.2em] uppercase mb-1">Stream Sedang Offline</p>
                          <p className="font-orbitron text-[8px] text-white/40 tracking-[0.1em] uppercase">Mengecek kembali setiap 5 menit</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-10 h-10 border-2 border-[#ff4d4d]/30 border-t-[#ff4d4d] rounded-full animate-spin mx-auto mb-4" />
                          <p className="font-orbitron text-[10px] text-[#ff4d4d] tracking-[0.2em] animate-pulse uppercase">Memuat live stream...</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* VIDEO PLAYER */}
                <video 
                  ref={plicaVideoRef}
                  className={`w-full h-full object-cover bg-black ${isPlicaOffline ? 'hidden' : 'block'}`}
                  autoPlay
                  playsInline
                  muted={isPlicaMuted}
                />

                {/* OVERLAYS */}
                {!isPlicaOffline && !plicaLoading && (
                  <>
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1 bg-red-600 rounded-sm z-10">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="font-orbitron font-bold text-[8px] tracking-widest text-white uppercase">● LIVE</span>
                    </div>
                    <button 
                      onClick={() => setIsPlicaMuted(!isPlicaMuted)}
                      className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all z-10 border border-white/10"
                    >
                      {isPlicaMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded sm z-10">
                      <span className="font-orbitron font-bold text-[8px] tracking-widest text-[#ff4d4d] uppercase">PLICACHUU</span>
                    </div>
                  </>
                )}
              </div>
              <a href="https://www.tiktok.com/@plicachuu/live" target="_blank" rel="noreferrer" className="block text-center font-orbitron text-[10px] text-[#ff4d4d] hover:underline tracking-widest uppercase py-3 bg-[#ff4d4d]/5 rounded border border-[#ff4d4d]/20">
                BUKA DI TIKTOK <ExternalLink size={10} className="inline ml-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* GAMES & PLATFORMS */}
      <section id="games" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { logo: 'ML', title: 'MLBB', desc: 'Main Game', color: 'cyan' },
            { logo: 'HoK', title: 'HOK', desc: 'Honor of Kings', color: 'gold' },
            { logo: 'TikTok', title: 'TikTok', desc: '@rururu22gaming', color: 'cyan' },
            { logo: 'TikTok', title: 'TikTok', desc: '@plicachuu', color: 'purple' },
            { logo: 'YT', title: 'YouTube', desc: '@rururu22gaming', color: 'red' },
            { logo: 'SW', title: 'Saweria', desc: 'Support Channel', color: 'emerald' },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-6 bg-white/5 border border-white/10 rounded group hover:border-white/20 transition-all text-center"
            >
              <div className="mb-4 flex justify-center">
                <LogoBox type={item.logo as any} />
              </div>
              <h4 className="font-orbitron text-xs font-bold mb-1 uppercase text-white/80">{item.title}</h4>
              <p className="font-mono text-[9px] text-white/40 uppercase leading-tight">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIDEO SECTION */}
      <section id="video" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-16 flex justify-between items-end">
          <div>
            <h2 className="font-orbitron text-3xl font-black uppercase mb-2 tracking-tighter">CLIPS & VODS</h2>
            <p className="text-white/40 font-mono text-[10px] tracking-[0.2em] uppercase">Catch up on the best moments</p>
          </div>
          <a href="https://youtube.com/@rururu22gaming" target="_blank" className="font-orbitron text-[10px] text-white/40 hover:text-white transition-colors tracking-widest uppercase flex items-center gap-2">
            VIEW ALL <ExternalLink size={12} />
          </a>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* TikTok Plicachuu */}
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <TikTokIcon size={14} className="text-neon-purple" /> PLICACHUU FEED
            </h3>
            <div className="bg-white/5 rounded-lg p-2 min-h-[400px] border border-white/5">
              <blockquote className="tiktok-embed" cite="https://www.tiktok.com/@plicachuu" data-unique-id="plicachuu" data-embed-type="creator" style={{ maxWidth: '780px', minWidth: '288px' }}>
                <section>
                  <a target="_blank" href="https://www.tiktok.com/@plicachuu?refer=creator_embed">@plicachuu</a>
                </section>
              </blockquote>
            </div>
          </div>

          {/* TikTok Ruru */}
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <TikTokIcon size={14} className="text-neon-cyan" /> RURU FEED
            </h3>
            <div className="bg-white/5 rounded-lg p-2 min-h-[400px] border border-white/5">
              <blockquote className="tiktok-embed" cite="https://www.tiktok.com/@rururu22gaming" data-unique-id="rururu22gaming" data-embed-type="creator" style={{ maxWidth: '780px', minWidth: '288px' }}>
                <section>
                  <a target="_blank" href="https://www.tiktok.com/@rururu22gaming?refer=creator_embed">@rururu22gaming</a>
                </section>
              </blockquote>
            </div>
          </div>

          {/* Youtube Channel */}
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <Youtube size={14} className="text-red-600" /> YOUTUBE CHANNEL
            </h3>
            <div className="bg-white/5 rounded-lg p-4 border border-white/5 h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mb-6 neon-glow-red border border-red-600/50">
                <Youtube size={40} className="text-red-600" />
              </div>
              <p className="font-rajdhani text-center text-white/60 mb-6">Nikmati konten eksklusif, highlights, dan konten gaming seru lainnya di channel YouTube rururu22gaming.</p>
              <a href="https://youtube.com/@rururu22gaming" target="_blank" className="w-full py-4 bg-red-600 hover:bg-red-700 transition-all font-orbitron font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2">
                SUBSCRIBE NOW <Play size={12} fill="currentColor" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DONASI / SUPPORT SECTION */}
      <section id="donasi" className="py-24 px-6 max-w-4xl mx-auto">
        <div className="relative p-12 bg-cyber-dark border border-white/10 rounded-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-cyan/10 blur-[100px] -z-10" />
          
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-4xl font-black uppercase mb-4 tracking-tighter">SUPPORT THE JOURNEY</h2>
            <p className="text-white/60 max-w-lg mx-auto">Bantu kami untuk terus berkembang dan menghadirkan konten streaming berkualitas untuk kalian semua!</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.a 
              whileHover={{ y: -5 }}
              href="https://saweria.co/rururu22" target="_blank" 
              className="p-8 bg-emerald-950/20 border border-emerald-400/30 rounded-xl hover:border-emerald-400 transition-all flex flex-col items-center text-center group"
            >
              <div className="mb-6">
                <LogoBox type="SW" text="SAWERIA" />
              </div>
              <p className="font-rajdhani text-sm text-white/60 mb-8">Support via Saweria (Gopay, OVO, Dana, LinkAja, QRIS)</p>
              <div className="mt-auto px-6 py-2 bg-emerald-400 text-black font-orbitron font-bold text-[10px] tracking-widest uppercase rounded">DONASI SEKARANG</div>
            </motion.a>

            <motion.a 
              whileHover={{ y: -5 }}
              href="https://sociabuzz.com/rururu22/tribe" target="_blank" 
              className="p-8 bg-purple-950/20 border border-neon-purple/30 rounded-xl hover:border-neon-purple transition-all flex flex-col items-center text-center group"
            >
              <div className="mb-6">
                <LogoBox type="SB" text="SOCIABUZZ" />
              </div>
              <p className="font-rajdhani text-sm text-white/60 mb-8">Join the Tribe via Sociabuzz and support the creators</p>
              <div className="mt-auto px-6 py-2 bg-neon-purple text-black font-orbitron font-bold text-[10px] tracking-widest uppercase rounded">GABUNG TRIBE</div>
            </motion.a>
          </div>
        </div>
      </section>

      {/* GEAR SETUP SECTION */}
      <section id="gear" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="mb-16">
          <h2 className="font-orbitron text-3xl font-black uppercase mb-2 tracking-tighter">Streaming Equipment</h2>
          <p className="text-white/40 font-mono text-[10px] tracking-[0.2em] uppercase">Powered by high-performance hardware</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* PC SPECS */}
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                <Cpu size={80} />
              </div>
              <h3 className="font-orbitron text-sm font-bold text-neon-cyan tracking-widest uppercase mb-6 flex items-center gap-2">
                <Cpu size={16} /> CORE SYSTEM
              </h3>
              <ul className="space-y-4 font-mono text-[11px] text-white/60">
                <li className="flex flex-col border-l-2 border-neon-cyan/30 pl-3">
                  <span className="text-white/30 text-[9px]">PROCESSOR</span>
                  <span className="text-white">AMD Ryzen 5 7600</span>
                </li>
                <li className="flex flex-col border-l-2 border-neon-cyan/30 pl-3">
                  <span className="text-white/30 text-[9px]">GRAPHICS CARD</span>
                  <span className="text-white">ZOTAC GAMING RTX 4060 8GB White Edition</span>
                </li>
                <li className="flex flex-col border-l-2 border-neon-cyan/30 pl-3">
                  <span className="text-white/30 text-[9px]">MEMORY (RAM)</span>
                  <span className="text-white">Klevv Cras XR5 RGB 32GB DDR5 White</span>
                </li>
                <li className="flex flex-col border-l-2 border-neon-cyan/30 pl-3">
                  <span className="text-white/30 text-[9px]">MOTHERBOARD</span>
                  <span className="text-white">Asrock B650M Pro RS</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-lg relative overflow-hidden group">
              <h3 className="font-orbitron text-sm font-bold text-neon-purple tracking-widest uppercase mb-6 flex items-center gap-2">
                <Zap size={16} /> COMPONENTS
              </h3>
              <ul className="space-y-4 font-mono text-[11px] text-white/60">
                <li className="flex flex-col border-l-2 border-neon-purple/30 pl-3">
                  <span className="text-white/30 text-[9px]">STORAGE</span>
                  <span className="text-white">Klev Cras C910 1TB SSD</span>
                </li>
                <li className="flex flex-col border-l-2 border-neon-purple/30 pl-3">
                  <span className="text-white/30 text-[9px]">POWER SUPPLY</span>
                  <span className="text-white">Super Flower Leadex III Gold 850W White</span>
                </li>
                <li className="flex flex-col border-l-2 border-neon-purple/30 pl-3">
                  <span className="text-white/30 text-[9px]">COOLING</span>
                  <span className="text-white">Deepcool LS720 SE White Liquid Cooling</span>
                </li>
                <li className="flex flex-col border-l-2 border-neon-purple/30 pl-3">
                  <span className="text-white/30 text-[9px]">CASE</span>
                  <span className="text-white">Antec CX500M ARGB White M-ATX</span>
                </li>
              </ul>
            </div>
          </div>

          {/* PERIPHERALS */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-lg relative group">
            <h3 className="font-orbitron text-sm font-bold text-neon-gold tracking-widest uppercase mb-6 flex items-center gap-2">
              <Monitor size={16} /> PERIPHERALS
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <Monitor className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Visual Output</p>
                  <p className="text-white leading-tight">Xiaomi 27" 2K 165Hz</p>
                  <p className="text-white/60 leading-tight mt-1">Lenovo R27QE 27" 2K 180Hz</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Keyboard className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Mechanical Keyboard</p>
                  <p className="text-white leading-tight">Ajazz AK820 MAX 75% Purple Fog Sea</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Mouse className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Precision Mouse</p>
                  <p className="text-white leading-tight">Ajazz AJ159</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Mic2 className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Audio Input</p>
                  <p className="text-white leading-tight">Soundtech Lite 2.0</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Armchair className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Professional Chair</p>
                  <p className="text-white leading-tight">oxihom Y5 foam</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Layout className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Setup Surface</p>
                  <p className="text-white leading-tight">Xpanse Adjustable Electric Desk</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Sun className="text-neon-gold shrink-0" size={20} />
                <div className="font-mono text-[11px]">
                  <p className="text-white/30 text-[9px] mb-1 uppercase">Studio Lighting</p>
                  <p className="text-white leading-tight">inbex ip80</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6 border-t border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-neon-cyan to-neon-purple rounded-sm rotate-45 flex items-center justify-center">
                <span className="text-[10px] font-orbitron font-black text-cyber-dark -rotate-45">RP</span>
              </div>
              <span className="font-orbitron font-black text-lg tracking-tighter text-white uppercase">
                RuruChama <span className="text-white/20">×</span> Plicachu
              </span>
            </div>
            <p className="text-white/30 font-mono text-[8px] tracking-[0.2em] uppercase">CONTENT CREATOR DUO</p>
          </div>

          <div className="flex gap-4">
            <a href="https://www.tiktok.com/@rururu22gaming" target="_blank" className="p-2 bg-white/5 rounded-full text-white/40 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all"><TikTokIcon size={18} /></a>
            <a href="https://youtube.com/@rururu22gaming" target="_blank" className="p-2 bg-white/5 rounded-full text-white/40 hover:text-red-600 hover:bg-red-600/10 transition-all"><Youtube size={18} /></a>
            <a href="https://www.tiktok.com/@plicachuu" target="_blank" className="p-2 bg-white/5 rounded-full text-white/40 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"><TikTokIcon size={18} /></a>
          </div>

          <div className="text-center md:text-right">
            <p className="text-white/40 font-mono text-[7px] tracking-[0.3em] uppercase">© 2024 ALL RIGHTS RESERVED</p>
            <p className="text-white/10 font-mono text-[7px] tracking-[0.2em] uppercase mt-1">BUILD v2.0.4 • STABLE</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-white/5 text-center">
          <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-white/15">
            di buat oleh{' '}
            <a href="https://www.tiktok.com/@iq_dani26_" target="_blank" rel="noopener noreferrer" className="text-neon-cyan/60 hover:text-neon-cyan transition-colors">MAMAS KUN</a>
            <span className="mx-3 opacity-20">/</span>
            <a href="https://dashboard-xi-teal-65.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-neon-purple/60 hover:text-neon-purple transition-colors">Danixyz</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
