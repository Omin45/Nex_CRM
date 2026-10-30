import React from 'react';
import './comet-cascade.css';

export default function CometCascade() {
  return (
    <div className="comet-cascade-container" aria-hidden="true">
      <div className="comet-stream comet-1"></div>
      <div className="comet-stream comet-2"></div>
      <div className="comet-stream comet-3"></div>
      <div className="ambient-glow glow-crimson"></div>
      <div className="ambient-glow glow-blue"></div>
    </div>
  );
}