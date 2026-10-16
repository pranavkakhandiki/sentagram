import { useCallback, useEffect, useReducer, useState } from 'react';
import { activeGame, gameReducer } from '../game/state';
import type { GameAction } from '../game/state';
import { dayKey, millisecondsToMidnight } from '../game/daily';
import { localProgressRepository, STORAGE_KEY } from '../game/storage';
import type { ProgressRepository } from '../game/storage';

export function useGame(repository: ProgressRepository = localProgressRepository) {
  const [state, reduce] = useReducer(gameReducer, undefined, () => repository.load());
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => { setSaveFailed(!repository.save(state)); }, [repository, state]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refreshDay() {
      reduce({ type: 'rollover', day: dayKey() });
      clearTimeout(timer);
      timer = setTimeout(refreshDay, millisecondsToMidnight() + 25);
    }
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) reduce({ type: 'restore', state: repository.load() });
    }
    refreshDay();
    window.addEventListener('focus', refreshDay);
    window.addEventListener('pageshow', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    window.addEventListener('storage', onStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refreshDay);
      window.removeEventListener('pageshow', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
      window.removeEventListener('storage', onStorage);
    };
  }, [repository]);

  const dispatch = useCallback((action: GameAction) => {
    const today = dayKey();
    // A suspended tab must not submit yesterday's tiles to today's game.
    if (state.day !== today) { reduce({ type: 'rollover', day: today }); return; }
    reduce(action);
  }, [state.day]);
  return { state, dispatch, ...activeGame(state), saveFailed };
}
