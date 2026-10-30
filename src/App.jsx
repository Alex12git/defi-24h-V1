import React, { useState, useEffect } from 'react';
import { Clock, Trophy, Target, LayoutDashboard, ListTodo, Plus, Check } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// --- CONFIGURATION FIREBASE ---
// Remplace ces valeurs vides par celles de ton projet Firebase plus tard
const firebaseConfig = {
  apiKey: "AIzaSyCInJnxxOv-tCLZ0iLQ1YRsmRYdFRIeFOY",
  authDomain: "defis-24h-v1.firebaseapp.com",
  projectId: "defis-24h-v1",
  storageBucket: "defis-24h-v1.firebasestorage.app",
  messagingSenderId: "724874215588",
  appId: "1:724874215588:web:9c26137311f8aeaa3ca631",
  measurementId: "G-4T88X6SVTJ"
};

// Initialisation conditionnelle (évite de crasher si les clés sont vides pour le test visuel)
const isFirebaseConfigured = firebaseConfig.apiKey !== "";
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const db = isFirebaseConfigured ? getFirestore(app) : null;

// --- DONNÉES INITIALES DES 10 DÉFIS ---
const initialChallenges = [
  { id: 1, title: "120 tours de maison (450m)", type: "counter", max: 120, current: 0, completedAt: null },
  { id: 2, title: "3000 pompes", type: "counter", max: 3000, current: 0, completedAt: null },
  { id: 3, title: "300 coups francs (Basket)", type: "counter", max: 300, current: 0, completedAt: null },
  { id: 4, title: "400 nuggets", type: "counter", max: 400, current: 0, completedAt: null },
  { id: 5, title: "4 bacs de bières (4x24)", type: "counter", max: 96, current: 0, completedAt: null },
  { id: 6, title: "Top 1 Fortnite", type: "multicheck", subs: [{name: "Solo", done: false}, {name: "Duo", done: false}, {name: "Squad", done: false}], completedAt: null },
  { id: 7, title: "Tuer l'Ender Dragon", type: "checkbox", done: false, completedAt: null },
  { id: 8, title: "Puzzle 1000 pièces", type: "checkbox", done: false, completedAt: null },
  { id: 9, title: "2000 échanges ping-pong", type: "counter", max: 2000, current: 0, completedAt: null },
  { id: 10, title: "30 bulls aux darts", type: "counter", max: 30, current: 0, completedAt: null },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [challenges, setChallenges] = useState(initialChallenges);
  const [timeLeft, setTimeLeft] = useState({ status: 'waiting', string: '00:00:00' });
  const [isConnected, setIsConnected] = useState(false);

  // Synchronisation Firebase
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    
    const unsub = onSnapshot(doc(db, "tracker", "defis"), (doc) => {
      if (doc.exists()) {
        setChallenges(doc.data().challenges);
        setIsConnected(true);
      } else {
        setDoc(doc(db, "tracker", "defis"), { challenges: initialChallenges });
      }
    });
    return () => unsub();
  }, []);

  const updateDatabase = (newChallenges) => {
    setChallenges(newChallenges);
    if (isFirebaseConfigured) {
      setDoc(doc(db, "tracker", "defis"), { challenges: newChallenges });
    }
  };

  // Minuteur strict des 24h
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Définit le début sur le prochain minuit (31 octobre 00:00 par exemple)
      const startTime = new Date('2026-10-31T00:00:00');
      
      const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

      if (now < startTime) {
        setTimeLeft({ status: 'waiting', string: 'Démarre ce soir à 00h00' });
      } else if (now >= startTime && now < endTime) {
        const diff = endTime - now;
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        setTimeLeft({ status: 'running', string: `${h}:${m}:${s}` });
      } else {
        setTimeLeft({ status: 'finished', string: 'TERMINE' });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Actions sur les défis
  const updateCounter = (id, amount) => {
    const newChallenges = challenges.map(c => {
      if (c.id === id && c.type === 'counter') {
        const newCurrent = Math.min(c.max, c.current + amount);
        const isNowCompleted = newCurrent === c.max;
        return { 
          ...c, 
          current: newCurrent, 
          completedAt: isNowCompleted && !c.completedAt ? timeLeft.string : c.completedAt 
        };
      }
      return c;
    });
    updateDatabase(newChallenges);
  };

  const toggleCheckbox = (id) => {
    const newChallenges = challenges.map(c => {
      if (c.id === id && c.type === 'checkbox') {
        const newDone = !c.done;
        return { 
          ...c, 
          done: newDone, 
          completedAt: newDone ? timeLeft.string : null 
        };
      }
      return c;
    });
    updateDatabase(newChallenges);
  };

  const toggleMultiCheck = (challengeId, subIndex) => {
    const newChallenges = challenges.map(c => {
      if (c.id === challengeId && c.type === 'multicheck') {
        const newSubs = [...c.subs];
        newSubs[subIndex].done = !newSubs[subIndex].done;
        const allDone = newSubs.every(s => s.done);
        return { 
          ...c, 
          subs: newSubs, 
          completedAt: allDone ? timeLeft.string : null 
        };
      }
      return c;
    });
    updateDatabase(newChallenges);
  };

  // Calcul progression globale
  const getProgress = (c) => {
    if (c.type === 'counter') return (c.current / c.max) * 100;
    if (c.type === 'checkbox') return c.done ? 100 : 0;
    if (c.type === 'multicheck') return (c.subs.filter(s => s.done).length / c.subs.length) * 100;
    return 0;
  };

  const totalProgress = challenges.reduce((acc, c) => acc + getProgress(c), 0) / 10;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30 pb-24">
      {/* Header & Chrono */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-2">
          <h1 className="text-xl font-bold tracking-wider text-gray-400 uppercase">Les 24H de l'Enfer</h1>
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 px-6 py-3 rounded-2xl shadow-xl">
            <Clock className={`w-6 h-6 ${timeLeft.status === 'running' ? 'text-blue-500 animate-pulse' : 'text-gray-500'}`} />
            <span className="text-3xl font-black font-mono tracking-widest">{timeLeft.string}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <div className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            <span className="text-gray-400">{isFirebaseConfigured ? 'En ligne (Multijoueur)' : 'Mode Local (Test)'}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto p-4 flex gap-2">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
        >
          <LayoutDashboard className="w-5 h-5" /> Vue Globale
        </button>
        <button 
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'challenges' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
        >
          <ListTodo className="w-5 h-5" /> Cocher les Défis
        </button>
      </div>

      <main className="max-w-4xl mx-auto p-4">
        {/* TAB 1 : DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="text-yellow-500" /> Avancement Total</h2>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500" style={{ width: `${totalProgress}%` }}></div>
              </div>
              <p className="text-right mt-2 font-mono font-bold text-xl">{totalProgress.toFixed(1)}%</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.map(c => {
                const prog = getProgress(c);
                const isDone = prog === 100;
                return (
                  <div key={c.id} className={`p-4 rounded-xl border ${isDone ? 'bg-green-950/20 border-green-900/50' : 'bg-gray-900 border-gray-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`font-bold ${isDone ? 'text-green-400' : 'text-white'}`}>{c.title}</h3>
                      {isDone && <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-md">Fini à {c.completedAt}</span>}
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                      <div className={`h-full transition-all duration-300 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${prog}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 text-right">
                      {c.type === 'counter' && `${c.current} / ${c.max}`}
                      {c.type === 'checkbox' && (isDone ? 'Terminé' : 'À faire')}
                      {c.type === 'multicheck' && `${c.subs.filter(s=>s.done).length} / ${c.subs.length}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2 : ACTIONS */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {challenges.map(c => {
              const isDone = getProgress(c) === 100;
              return (
                <div key={c.id} className={`p-5 rounded-2xl border ${isDone ? 'bg-green-950/10 border-green-900' : 'bg-gray-900 border-gray-800'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {isDone && <Check className="text-green-500 w-5 h-5" />}
                      {c.title}
                    </h3>
                  </div>

                  {c.type === 'counter' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-end">
                        <span className="text-3xl font-black">{c.current} <span className="text-lg text-gray-500 font-normal">/ {c.max}</span></span>
                        <span className="text-sm text-gray-400">Reste : {c.max - c.current}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button disabled={isDone} onClick={() => updateCounter(c.id, 1)} className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3 rounded-xl font-bold flex justify-center items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4"/> 1</button>
                        {c.max >= 50 && <button disabled={isDone} onClick={() => updateCounter(c.id, 5)} className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3 rounded-xl font-bold flex justify-center items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4"/> 5</button>}
                        {c.max >= 100 && <button disabled={isDone} onClick={() => updateCounter(c.id, 10)} className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3 rounded-xl font-bold flex justify-center items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4"/> 10</button>}
                        {c.max >= 500 && <button disabled={isDone} onClick={() => updateCounter(c.id, 50)} className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3 rounded-xl font-bold flex justify-center items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4"/> 50</button>}
                      </div>
                    </div>
                  )}

                  {c.type === 'checkbox' && (
                    <button 
                      onClick={() => toggleCheckbox(c.id)}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isDone ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                      {isDone ? 'Marquer comme non fait' : 'Valider le défi'}
                    </button>
                  )}

                  {c.type === 'multicheck' && (
                    <div className="flex flex-col gap-3">
                      {c.subs.map((sub, idx) => (
                        <button 
                          key={idx}
                          onClick={() => toggleMultiCheck(c.id, idx)}
                          className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${sub.done ? 'bg-green-600/20 border-green-600/30 text-green-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                        >
                          <span className="font-bold">{sub.name}</span>
                          {sub.done && <Check className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}