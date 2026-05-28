import React, { useState, useCallback } from "react";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "rgba(120, 100, 255, 0.15)",
  style = {},
  ...props
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(({ currentTarget, clientX, clientY }) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }, [mouseX, mouseY]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        border: `0.5px solid ${isHovered ? 'var(--border3)' : 'var(--border)'}`,
        background: '#0A0A10',
        padding: '2rem',
        transition: 'border-color 0.5s, box-shadow 0.5s, transform 0.4s',
        boxShadow: isHovered
          ? '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,92,252,0.08)'
          : '0 4px 20px rgba(0,0,0,0.2)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        ...style,
      }}
      {...props}
    >
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 20, height: '100%', width: '100%' }}>
        {children}
      </div>

      {/* Spotlight gradient */}
      <motion.div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s',
          background: useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 80%)`,
        }}
      />

      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundImage:
          'linear-gradient(to right, rgba(120,100,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,100,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
        opacity: 0.5,
      }} />
    </div>
  );
};
