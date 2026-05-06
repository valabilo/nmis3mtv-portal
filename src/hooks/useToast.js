/**
 * hooks/useToast.js
 * Custom hook for toast notifications
 */

"use client";

import { useState, useCallback } from "react";

export function useToast() {
  const [toastState, setToastState] = useState({
    visible: false,
    message: "",
    isError: false,
  });

  const showToast = useCallback((message, isError = false) => {
    setToastState({
      visible: true,
      message,
      isError,
    });

    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastState((prev) => ({
        ...prev,
        visible: false,
      }));
    }, 4000);
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    toastState,
    showToast,
    hideToast,
  };
}
