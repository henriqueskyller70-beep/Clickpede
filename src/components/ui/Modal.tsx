"use client";

import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string; // Título opcional para o modal
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, title }) => {
  if (!open) return null;

  // Certifica-se de que o elemento 'modal-root' existe no DOM
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error("Element with id 'modal-root' not found. Please add <div id='modal-root'></div> to your index.html.");
    return null;
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay de fundo */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Conteúdo do Modal */}
      <div className="bg-white rounded-2xl w-full max-w-md relative z-10 p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal com título e botão de fechar */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 flex-shrink-0">
          {title && <h3 className="font-bold text-xl text-gray-900">{title}</h3>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
        </div>
        
        {/* Área de conteúdo do Modal com rolagem */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2"> {/* pr-2 -mr-2 para scrollbar customizada */}
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};