import React from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  const modalNode = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 2000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          minWidth: '300px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
