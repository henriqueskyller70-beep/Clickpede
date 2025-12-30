"use client";

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string; // Optional title prop
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, title }) => {
  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling background
    } else {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" onClick={onClose}></div>
      <div 
        ref={modalRef} 
        className="bg-white rounded-2xl w-full max-w-md relative z-10 p-6 shadow-2xl animate-in slide-in-from-right-full duration-500"
      >
        {title && (
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <h3 className="font-bold text-xl text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
          </div>
        )}
        {!title && ( // If no title, still provide a close button
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
        )}
        {children}
      </div>
    </div>,
    modalRoot
  );
};