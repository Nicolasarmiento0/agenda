import { useCallback, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastOptions = {
  type: ToastType;
  message: string;
  duration?: number;
};

export type ToastState = ToastOptions & {
  visible: boolean;
  onHide: () => void;
};

export function useToast() {
  const [state, setState] = useState<ToastState>({
    type: 'info',
    message: '',
    duration: 2600,
    visible: false,
    onHide: () => {},
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback(
    ({ type, message, duration = 2600 }: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setState({ type, message, duration, visible: true, onHide: hide });

      timerRef.current = setTimeout(hide, duration);
    },
    [hide],
  );

  return { showToast, toastProps: state };
}
