// Rich structured metadata for cars.
// Each key corresponds to a car's detailsKey in config CARS.

export const CAR_DETAILS = {
  terzo: {
    title: 'Lamborghini Terzo Millennio',
    overview: `The Terzo Millennio is Lamborghini’s forward-looking electric hypercar concept, exploring advanced materials, energy storage, and self-healing composites.`,
    performance: {
      powertrain: 'Quad in-wheel electric motors',
      energyStorage: 'Supercapacitor-based experimental system',
      torqueVectoring: 'Fully independent per-wheel control',
      topSpeed: 'Estimated 350+ km/h (Concept projection)',
      accel: '0-100 km/h under 2.5s (theoretical)'
    },
    bodyTech: {
      chassis: 'Carbon fiber monocoque with nano-tube reinforcement',
      selfHealing: 'Concept self-repair micro-channel resin system',
      aerodynamics: 'Active aero body surfaces',
      materials: 'Multi-layer composite with embedded sensors'
    },
    cockpit: {
      display: 'Augmented reality HUD concept',
      steering: 'Adaptive drive-by-wire control',
      ergonomics: 'Low-slung racing posture'
    },
    quickStats: {
      drive: 'AWD (individual wheel motors)',
      energy: 'Solid-state / capacitor hybrid (conceptual)',
      generation: 'Concept class',
      rarity: '1-off experimental vision'
    }
  }
};

// Pattern for adding more details:
// CAR_DETAILS['veneno'] = { title: '...', overview: '...', performance: {...}, bodyTech: {...}, cockpit: {...}, quickStats: {...} };