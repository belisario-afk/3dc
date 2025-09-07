import React, { useEffect, useRef } from 'react';
import { CAR_DETAILS } from '../data/carDetails.js';
import { CARS } from '../config.js';

export function CarInfoPanel({ carId, onClose }) {
  const panelRef = useRef();
  const closeBtnRef = useRef();
  const car = CARS.find(c => c.id === carId);
  const detail = car?.detailsKey ? CAR_DETAILS[car.detailsKey] : null;

  // Focus trap
  useEffect(() => {
    if (!panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) {
      focusable[0].focus();
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
      if (e.key === 'Tab') {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [carId, onClose]);

  if (!car) return null;

  const fallback = (
    <div className="panel-section">
      <h3>{car.name}</h3>
      <p>No structured details available yet.</p>
      <p>This is a concept placeholder vehicle in the showcase lot.</p>
    </div>
  );

  const structured = detail && (
    <>
      <div className="panel-section">
        <h3>{detail.title}</h3>
        <p>{detail.overview}</p>
      </div>
      <div className="panel-section grid two">
        <div>
          <h4>Performance</h4>
          <ul className="spec-list">
            {Object.entries(detail.performance).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
          </ul>
        </div>
        <div>
          <h4>Body Tech</h4>
          <ul className="spec-list">
            {Object.entries(detail.bodyTech).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
          </ul>
        </div>
      </div>
      <div className="panel-section grid two">
        <div>
          <h4>Cockpit</h4>
          <ul className="spec-list">
            {Object.entries(detail.cockpit).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
          </ul>
        </div>
        <div>
          <h4>Quick Stats</h4>
          <ul className="spec-list">
            {Object.entries(detail.quickStats).map(([k,v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
          </ul>
        </div>
      </div>
    </>
  );

  return (
    <div className="car-info-panel ui-block" ref={panelRef} role="dialog" aria-modal="true" aria-label={`Details panel for ${car.name}`}>
      <button
        ref={closeBtnRef}
        className="close-btn"
        onClick={onClose}
        aria-label="Close car information panel"
      >×</button>
      <div className="inner">
        {structured || fallback}
        <BookingForm carName={car.name} />
      </div>
    </div>
  );
}

function BookingForm({ carName }) {
  const onSubmit = (e) => {
    e.preventDefault();
    alert(`(Demo) Booking request submitted for ${carName}!`);
  };
  return (
    <form className="booking-form" onSubmit={onSubmit} aria-label="Booking form (demo)">
      <h4>Book This Car (Demo)</h4>
      <label>
        Name
        <input type="text" required placeholder="Your name" />
      </label>
      <label>
        Email
        <input type="email" required placeholder="you@example.com" />
      </label>
      <label>
        Date
        <input type="date" required />
      </label>
      <label>
        Duration (hrs)
        <input type="number" min="1" max="72" defaultValue="4" required />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
}