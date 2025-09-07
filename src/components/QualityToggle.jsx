import React from 'react';

export function QualityToggle({ quality, onChange }) {
  return (
    <div className="quality-toggle">
      <label className="toggle-label">
        Quality:
        <select
          value={quality}
          onChange={e => onChange(e.target.value)}
          aria-label="Select rendering quality"
        >
          <option value="HIGH">High</option>
            <option value="LOW">Low</option>
        </select>
      </label>
    </div>
  );
}