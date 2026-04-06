import React, { useState, useEffect } from "react";
import { 
  Music, 
  Zap, 
  Disc, 
  Settings, 
  Volume2, 
  Cpu, 
  Activity,
  Maximize2
} from "lucide-react";

const KawaiiDjentStudio = () => {
  const [activeTab, setActiveTab] = useState("guitar");
  const [bpm, setBpm] = useState(170);
  const [glitchActive, setGlitchActive] = useState(false);
  const [masterLevel, setMasterLevel] = useState(80);

  const triggerGlitch = () => {
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-pink-100 font-sans overflow-hidden border border-pink-500/30 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#16213e] border-b border-pink-500/20">
        <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-500 rounded-lg shadow-lg shadow-pink-500/20">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
              Kawaii Djent Studio
            </h1>
            <p className="text-[10px] text-pink-300/60 uppercase tracking-widest font-bold">Production Powerhouse</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 bg-[#0f3460] px-4 py-2 rounded-full border border-pink-500/10">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-pink-300 font-bold uppercase">BPM</span>
            <input 
              type="number" 
              value={bpm} 
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="bg-transparent text-lg font-mono font-bold w-12 text-center focus:outline-none text-pink-400"
            />
          </div>
          <div className="h-8 w-px bg-pink-500/20" />
          <button 
            onClick={triggerGlitch}
            className={`px-6 py-2 rounded-lg font-black uppercase italic tracking-tighter transition-all duration-75 ${
              glitchActive 
              ? "bg-white text-pink-600 scale-95 shadow-[0_0_20px_rgba(255,255,255,0.8)]" 
              : "bg-pink-500 text-white hover:bg-pink-400 shadow-lg shadow-pink-500/20 active:scale-95"
            }`}
          >
            {glitchActive ? "GLITCHING!" : "GLITCH-ER"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-20 bg-[#16213e] border-r border-pink-500/10 flex flex-col items-center py-6 gap-8">
          <NavIcon icon={<Cpu />} label="Djent" active={activeTab === "guitar"} onClick={() => setActiveTab("guitar")} />
          <NavIcon icon={<Settings />} label="Synth" active={activeTab === "synth"} onClick={() => setActiveTab("synth")} />
          <NavIcon icon={<Disc />} label="Drums" active={activeTab === "drums"} onClick={() => setActiveTab("drums")} />
          <NavIcon icon={<Activity />} label="Mix" active={activeTab === "mix"} onClick={() => setActiveTab("mix")} />
        </div>

        {/* Panel Container */}
        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-[#1a1a2e] to-[#0f3460]">
          {activeTab === "guitar" && <GuitarPanel />}
          {activeTab === "synth" && <SynthPanel />}
          {activeTab === "drums" && <DrumPanel />}
          {activeTab === "mix" && <MixerPanel masterLevel={masterLevel} setMasterLevel={setMasterLevel} />}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-[#0f3460] border-t border-pink-500/20 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-pink-300/50">
        <div className="flex gap-4">
          <span>Buffer: Optimized</span>
          <span>Engine: Kawaii-V3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${glitchActive ? "bg-white animate-ping" : "bg-pink-500"}`} />
          <span>Ready for Production</span>
        </div>
      </div>
    </div>
  );
};

const NavIcon = ({ icon, label, active, onClick }) => (
<button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-200 group ${active ? "text-pink-400" : "text-pink-300/40 hover:text-pink-300"}`}>
    <div className={`p-3 rounded-xl transition-all duration-200 ${active ? "bg-pink-500/20 shadow-lg shadow-pink-500/10" : "group-hover:bg-pink-500/5"}`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className="text-[10px] font-black uppercase tracking-tighter italic">{label}</span>
  </button>
);

const GuitarPanel = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="grid grid-cols-2 gap-6">
      <ControlCard title="Hyper-Distortion" icon={<Zap />}>
        <div className="space-y-4 py-2">
          <input type="range" className="w-full accent-pink-500" defaultValue={85} />
          <div className="flex justify-between text-[10px] font-black uppercase">
            <span>Clean</span>
            <span className="text-pink-400">85% Drenched</span>
            <span>Crushed</span>
          </div>
        </div>
      </ControlCard>
      
      <ControlCard title="Arpeggiator Speed" icon={<Activity />}>
        <div className="flex justify-between items-center gap-2 pt-2">
          {["1x", "2x", "4x", "8x"].map(speed => (
            <button key={speed} className={`flex-1 py-2 rounded border font-black italic transition-all ${speed === "4x" ? "bg-pink-500 border-pink-400 text-white shadow-lg" : "border-pink-500/20 hover:border-pink-500/50"}`}>
              {speed}
            </button>
          ))}
        </div>
      </ControlCard>
    </div>

    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-pink-400/80">Arp Patterns</h3>
      <div className="grid grid-cols-4 gap-4">
        {["UP", "DOWN", "PALINDROME", "CHAOS"].map(pattern => (
          <button key={pattern} className="aspect-square rounded-xl bg-[#16213e] border border-pink-500/10 flex flex-col items-center justify-center gap-2 hover:border-pink-500/40 transition-all group active:scale-95">
            <div className="w-8 h-8 rounded-full border-2 border-pink-500/20 group-hover:border-pink-500/50 flex items-center justify-center text-pink-400">
              <Maximize2 size={16} />
            </div>
            <span className="text-[10px] font-black italic uppercase">{pattern}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const SynthPanel = () => (
  <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-500">
    <ControlCard title="Reese Bass Waveform" icon={<Cpu />}>
      <div className="flex gap-4 pt-2">
        {["SAW", "SQR", "TRI"].map(wave => (
          <button key={wave} className={`flex-1 py-4 rounded-xl border font-black italic text-sm ${wave === "SAW" ? "bg-purple-600 border-purple-400 text-white" : "border-purple-500/20"}`}>
            {wave}
          </button>
        ))}
      </div>
    </ControlCard>

    <ControlCard title="Filter Modulation" icon={<Settings />}>
      <div className="space-y-6 pt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-pink-300/60">
            <span>Cutoff</span>
            <span>72%</span>
          </div>
          <input type="range" className="w-full accent-purple-500" defaultValue={72} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-pink-300/60">
<span>Resonance</span>
            <span>45%</span>
          </div>
          <input type="range" className="w-full accent-purple-500" defaultValue={45} />
        </div>
      </div>
    </ControlCard>
  </div>
);

const DrumPanel = () => (
  <div className="space-y-6 animate-in zoom-in-95 duration-500">
    <div className="bg-[#16213e] p-6 rounded-2xl border border-pink-500/10 shadow-xl space-y-6">
      {[ "KICK", "SNARE", "HAT", "CRASH" ].map((drum, idx) => (
        <div key={drum} className="flex items-center gap-4">
          <div className="w-16 text-[10px] font-black uppercase text-pink-400 italic">{drum}</div>
          <div className="flex-1 grid grid-cols-16 gap-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <button 
                key={i} 
                className={`h-8 rounded transition-all ${
                  (i % 4 === 0) ? "bg-[#0f3460] border border-pink-500/20" : "bg-[#1a1a2e]"
                } hover:bg-pink-500/40 active:scale-90`} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-center gap-4">
      <button className="px-8 py-3 bg-[#16213e] rounded-full border border-pink-500/20 font-black italic uppercase text-xs hover:bg-pink-500/10 transition-all">Clear Sequence</button>
      <button className="px-8 py-3 bg-pink-500 rounded-full font-black italic uppercase text-xs text-white shadow-lg shadow-pink-500/20 transition-all active:scale-95">Load Anime Kit</button>
    </div>
  </div>
);

const MixerPanel = ({ masterLevel, setMasterLevel }) => (
  <div className="grid grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
    {[
      { label: "Guitar", color: "bg-pink-500", level: 90 },
      { label: "Synth", color: "bg-purple-500", level: 75 },
      { label: "Drums", color: "bg-blue-500", level: 85 },
      { label: "FX", color: "bg-cyan-500", level: 40 },
    ].map(track => (
      <div key={track.label} className="bg-[#16213e] p-6 rounded-2xl border border-pink-500/10 flex flex-col items-center gap-6">
        <div className="h-48 w-4 bg-[#0f3460] rounded-full relative overflow-hidden flex flex-col justify-end">
          <div className={`w-full ${track.color} rounded-full shadow-[0_0_15px_rgba(236,72,153,0.3)]`} style={{ height: `${track.level}%` }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-black uppercase italic tracking-tighter">{track.label}</span>
          <div className="p-1 rounded bg-[#0f3460] border border-white/5">
             <Volume2 size={12} className="text-pink-300" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ControlCard = ({ title, icon, children }) => (
  <div className="bg-[#16213e] p-5 rounded-2xl border border-pink-500/10 shadow-xl">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-400">
        {React.cloneElement(icon, { size: 16 })}
      </div>
      <h3 className="text-xs font-black uppercase italic tracking-widest text-pink-100">{title}</h3>
    </div>
    {children}
  </div>
);

export default KawaiiDjentStudio;
