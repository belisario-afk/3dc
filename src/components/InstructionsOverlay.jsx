import React, { useEffect, useState } from 'react';

export function InstructionsOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const flag = localStorage.getItem('ecar_instructions_seen');
    if (!flag) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('ecar_instructions_seen', '1');
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="instructions-overlay ui-block" role="dialog" aria-modal="true">
      <div className="panel">
        <h2>Welcome</h2>
        <p>Click inside the scene to lock the mouse. Use <strong>W A S D</strong> to move, <strong>Shift</strong> to sprint. Select a car by clicking it. Press <strong>Esc</strong> to release pointer lock.</p>
        <button onClick={dismiss} aria-label="Dismiss instructions overlay">Got it</button>
      </div>
    </div>
  );
}