import React from 'react';
import { QualityToggle } from './QualityToggle.jsx';

export function HUD({ selectedCar, onDeselect, quality, onQualityChange }) {
  return (
    <div className="hud ui-block" role="navigation">
      <div className="hud-left">
        <h1 className="brand">LUXE DRIVE</h1>
        <span className="tagline">Immersive Exotic Lot</span>
      </div>
      <div className="hud-right">
        <QualityToggle quality={quality} onChange={onQualityChange} />
        {selectedCar && (
          <button
            className="btn deselect"
            onClick={onDeselect}
            aria-label="Deselect currently selected car"
          >
            Deselect
          </button>
        )}
        {/* Dev test for Error Boundary (uncomment to test)
        <button onClick={() => { throw new Error('Simulated crash'); }}>Crash</button>
        */}
      </div>
    </div>
  );
}