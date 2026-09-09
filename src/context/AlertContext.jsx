import React, { createContext, useContext, useState } from 'react';
import { CustomAlert } from '../components/CustomAlert';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: null,
  });

  const showAlert = ({ title, message, type = 'info', confirmText, cancelText, onConfirm, onCancel }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      confirmText: confirmText || 'OK',
      cancelText: cancelText || 'Cancel',
      onConfirm: () => {
        if (onConfirm) onConfirm();
        hideAlert();
      },
      onCancel: onCancel ? () => {
        onCancel();
        hideAlert();
      } : null,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert {...alertConfig} />
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);