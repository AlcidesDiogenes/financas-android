import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SwipePayDirection = 'right' | 'left';

interface SwipeActionContextType {
  swipePayDirection: SwipePayDirection;
  setSwipePayDirection: (direction: SwipePayDirection) => Promise<void>;
  toggleSwipePayDirection: () => Promise<void>;
}

const STORAGE_SWIPE_DIRECTION_KEY = '@financas:swipe_pay_direction';

const SwipeActionContext = createContext<SwipeActionContextType | undefined>(undefined);

export const SwipeActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [swipePayDirection, setSwipePayDirectionState] = useState<SwipePayDirection>('right');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_SWIPE_DIRECTION_KEY)
      .then((val) => {
        if (val === 'right' || val === 'left') {
          setSwipePayDirectionState(val);
        }
      })
      .catch(() => {});
  }, []);

  const setSwipePayDirection = async (direction: SwipePayDirection) => {
    setSwipePayDirectionState(direction);
    await AsyncStorage.setItem(STORAGE_SWIPE_DIRECTION_KEY, direction);
  };

  const toggleSwipePayDirection = async () => {
    const next: SwipePayDirection = swipePayDirection === 'right' ? 'left' : 'right';
    await setSwipePayDirection(next);
  };

  return (
    <SwipeActionContext.Provider
      value={{
        swipePayDirection,
        setSwipePayDirection,
        toggleSwipePayDirection,
      }}
    >
      {children}
    </SwipeActionContext.Provider>
  );
};

export const useSwipeAction = (): SwipeActionContextType => {
  const context = useContext(SwipeActionContext);
  if (!context) {
    throw new Error('useSwipeAction must be used within a SwipeActionProvider');
  }
  return context;
};
