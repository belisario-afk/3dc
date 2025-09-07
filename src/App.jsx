import React, { useState, useMemo } from 'react';
import { ParkingLot } from './components/ParkingLot.jsx';
import { HUD } from './components/HUD.jsx';
import { CarInfoPanel } from './components/CarInfoPanel.jsx';
import { NavigationControls } from './components/NavigationControls.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { InstructionsOverlay } from './components/InstructionsOverlay.jsx';

export function App() {
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [quality, setQuality] = useState('HIGH');

  const reducedMotion = useMemo(() => {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <ErrorBoundary>
      <div className="app-root">
        <ParkingLot
          quality={quality}
          onCarSelected={setSelectedCarId}
          selectedCarId={selectedCarId}
          reducedMotion={reducedMotion}
        />
        <HUD
          selectedCar={selectedCarId}
          onDeselect={() => setSelectedCarId(null)}
          quality={quality}
          onQualityChange={setQuality}
        />
        <NavigationControls />
        {selectedCarId && (
          <CarInfoPanel
            carId={selectedCarId}
            onClose={() => setSelectedCarId(null)}
          />
        )}
        <InstructionsOverlay />
      </div>
    </ErrorBoundary>
  );
}