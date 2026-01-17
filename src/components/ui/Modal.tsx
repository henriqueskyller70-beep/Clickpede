"use client";

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  contentClassName?: string; // NOVO: Para classes CSS personalizadas no conteúdo
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, title, contentClassName }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div 
        ref={modalRef}
        className={`bg-white rounded-2xl w-full max-w-md relative z-10 p-6 shadow-2xl animate-in zoom-in-95 fade-in-0 flex flex-col max-h-[90vh] ${contentClassName || ''}`}
      >
        {title && (
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};