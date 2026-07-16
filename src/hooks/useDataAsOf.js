import { useEffect, useState } from 'react';

export function useDataAsOf() {
  const [label, setLabel] = useState('Data as of —');

  useEffect(() => {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
    setLabel(`Data as of ${datePart} · ${timePart} UTC`);
  }, []);

  return label;
}
