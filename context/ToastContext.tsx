import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import AlertToast from '../components/calendar/AlertToast';
import { ToastOptions, ToastType } from '../hooks/useToast';

type ToastContextType = {
  showToast: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    type: ToastType;
    message: string;
    duration: number;
    visible: boolean;
  }>({ type: 'info', message: '', duration: 2600, visible: false });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback(({ type, message, duration = 2600 }: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ type, message, duration, visible: true });
    timerRef.current = setTimeout(hide, duration);
  }, [hide]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AlertToast
        type={state.type}
        message={state.message}
        duration={state.duration}
        visible={state.visible}
        onHide={hide}
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
