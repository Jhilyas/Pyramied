import { createContext, useContext, useState, useEffect } from 'react';

const FlowStateContext = createContext(null);

export function FlowStateProvider({ children }) {
  const [isFlowState, setIsFlowState] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    if (isFlowState) {
      document.body.classList.add('flow-state-active');
    } else {
      document.body.classList.remove('flow-state-active');
      setIsTimerActive(false); // Optionally pause timer when leaving flow state
    }
  }, [isFlowState]);

  useEffect(() => {
    let interval = null;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
      // Could trigger a sound here
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const toggleFlowState = () => setIsFlowState(!isFlowState);
  
  const toggleTimer = () => setIsTimerActive(!isTimerActive);
  
  const resetTimer = () => {
    setIsTimerActive(false);
    setTimeLeft(25 * 60);
  };

  const adjustTimer = (minutes) => {
    const newTime = timeLeft + (minutes * 60);
    if (newTime >= 0) setTimeLeft(newTime);
  };

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <FlowStateContext.Provider value={{
      isFlowState,
      toggleFlowState,
      timeLeft,
      isTimerActive,
      toggleTimer,
      resetTimer,
      adjustTimer,
      formatTime
    }}>
      {children}
    </FlowStateContext.Provider>
  );
}

export const useFlowState = () => useContext(FlowStateContext);
