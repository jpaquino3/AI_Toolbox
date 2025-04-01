import React, { useState } from 'react';

// Add state for energy saver
const [energySaver, setEnergySaver] = useState(() => {
  const saved = localStorage.getItem('energySaver');
  return saved === null ? false : saved === 'true';
}); 