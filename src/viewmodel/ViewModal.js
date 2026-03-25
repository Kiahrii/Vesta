import PropTypes from 'prop-types';
import { createElement, useEffect } from 'react';
import { createPortal } from 'react-dom';

import 'assets/scss/apartment-page/apartment.scss';

export default function ViewModal({
  open,
  message,
  showSpinner = true,
  closeOnBackdrop = false,
  onClose = undefined,
  actions = null
}) {

useEffect(() => {
  if (open && onClose) {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [open, onClose]);

if (!open || typeof document === 'undefined') {
  return null;
}

  const handleBackdropClick = () => {
    if (closeOnBackdrop && typeof onClose === 'function') {
      onClose();
    }
  };

  const contentChildren = [];

  if (showSpinner) {
    contentChildren.push(
      createElement('span', {
        key: 'spinner',
        className: 'feedback-modal-spinner',
        'aria-hidden': 'true'
      })
    );
  }

  contentChildren.push(
    createElement(
      'p',
      {
        key: 'message',
        className: 'feedback-modal-message'
      },
      message
    )
  );

  const children = [
    createElement(
      'div',
      {
        key: 'content',
        className: 'feedback-modal-content'
      },
      ...contentChildren
    )
  ];

  if (actions) {
    children.push(
      createElement(
        'div',
        {
          key: 'actions',
          className: 'feedback-modal-actions'
        },
        actions
      )
    );
  }

  const modalNode = createElement(
    'div',
    {
      className: 'feedback-modal-backdrop',
      onClick: handleBackdropClick,
      role: 'presentation'
    },
    createElement(
      'div',
      {
        className: 'feedback-modal-card',
        onClick: (event) => event.stopPropagation(),
        role: 'status',
        'aria-live': 'polite',
        'aria-busy': showSpinner
      },
      ...children
    )
  );

  return createPortal(modalNode, document.body);
}

ViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  showSpinner: PropTypes.bool,
  closeOnBackdrop: PropTypes.bool,
  onClose: PropTypes.func,
  actions: PropTypes.node
};
