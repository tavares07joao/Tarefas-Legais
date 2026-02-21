
import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
  velocity: number;
}

const CelebrationEffect: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const colors = ['#6366f1', '#a855f7', '#10b981', '#fbbf24'];

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: 50, // Center X %
      y: 50, // Center Y %
      size: Math.random() * 15 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.2,
      duration: Math.random() * 2 + 1,
      angle: Math.random() * 360,
      velocity: Math.random() * 30 + 20,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2 animate-out fade-out duration-1000 fill-current"
          style={{
            transform: `translate(-50%, -50%) rotate(${p.angle}deg)`,
            animation: `celebrate-${p.id} ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        >
          <Star 
            size={p.size} 
            style={{ color: p.color }}
            className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] opacity-0 animate-in fade-in duration-300"
          />
          <style>{`
            @keyframes celebrate-${p.id} {
              0% {
                transform: translate(-50%, -50%) rotate(${p.angle}deg) translateX(0);
                opacity: 1;
              }
              100% {
                transform: translate(-50%, -50%) rotate(${p.angle}deg) translateX(${p.velocity}vw);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
};

export default CelebrationEffect;
