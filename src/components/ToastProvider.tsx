"use client";

import React from 'react';
import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 6000,
        style: {
          background: '#111',
          color: '#fff',
          fontSize: '14px',
        },
      }}
    />
  );
};

export default ToastProvider;