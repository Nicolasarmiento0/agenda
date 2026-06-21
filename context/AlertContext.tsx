import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertOptions = {
  title: string;
  message: string;
  buttons?: AlertButton[];
};

type AlertContextType = {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
  alertConfig: AlertOptions | null;
  visible: boolean;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    // Auto-detect alert category using simple keyword matching on title and message
    const combinedText = ((options.title || '') + ' ' + (options.message || '')).toLowerCase();
    const isError = /error|falló|fallo|no se pudo|cancel|rechaz|inválido|invalido|ocupado/i.test(combinedText);
    const isSuccess = /✓|éxito|exito|gracias|aprob|guardad|confirmad|listo/i.test(combinedText);

    if (isError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (isSuccess) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    setAlertConfig(options);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alertConfig, visible }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
