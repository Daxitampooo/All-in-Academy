import { dayKey } from '@pokerall/shared/client';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Today's date; moves on at midnight and when the app comes back from the background. */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const check = () =>
      setToday((prev) => {
        const now = new Date();
        return dayKey(now) === dayKey(prev) ? prev : now;
      });
    const timer = setInterval(check, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
}
