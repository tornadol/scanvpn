import React, { useEffect, useState, useCallback } from 'react';
import { View, Animated, Dimensions, StatusBar } from 'react-native';
import { VariantProps, cva } from 'class-variance-authority';
import { Text } from './Text';
import { cn } from '@/lib/cn';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
  visible?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.height || 44;

const toastVariants = cva(
  'rounded-lg p-4 shadow-lg border mx-4 max-w-sm',
  {
    variants: {
      type: {
        success: 'bg-green-500 border-green-600',
        error: 'bg-red-500 border-red-600',
        warning: 'bg-orange-500 border-orange-600',
        info: 'bg-blue-500 border-blue-600',
      },
    },
    defaultVariants: {
      type: 'info',
    },
  }
);

export function Toast({
  message,
  type = 'error',
  duration = 3000,
  onHide,
  visible = true
}: ToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  const show = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      setTimeout(() => {
        hide();
      }, duration);
    }
  }, [fadeAnim, slideAnim, duration]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  }, [fadeAnim, slideAnim, onHide]);

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }
  }, [visible, show, hide]);

  if (!visible) return null;

  return (
    <View
      className="absolute top-0 left-0 right-0 z-50 flex items-center"
      style={{ paddingTop: STATUS_BAR_HEIGHT + 10 }}
    >
      <Animated.View
        className={cn(toastVariants({ type }))}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text
          variant="body"
          className="text-white font-medium text-center"
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

// Toast manager for handling multiple toasts
interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

class ToastManager {
  private static instance: ToastManager;
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set();
  private toasts: ToastItem[] = [];

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error', duration = 3000) {
    const id = Date.now().toString();
    const toast: ToastItem = { id, message, type, duration };

    console.log('🍞 ToastManager: showToast called', { id, message, type, duration });

    this.toasts.push(toast);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.hideToast(id);
      }, duration);
    }

    return id;
  }

  hideToast(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  hideAllToasts() {
    this.toasts = [];
    this.notify();
  }
}

// Hook for using toast in components
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const manager = ToastManager.getInstance();
    const unsubscribe = manager.subscribe(setToasts);

    return unsubscribe;
  }, []);

  const showToast = useCallback((message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => {
    console.log('🍞 useToast: showToast called with', { message, type, duration });
    return ToastManager.getInstance().showToast(message, type, duration);
  }, []);

  const hideToast = useCallback((id: string) => {
    console.log('🍞 useToast: hideToast called with', { id });
    ToastManager.getInstance().hideToast(id);
  }, []);

  const hideAllToasts = useCallback(() => {
    console.log('🍞 useToast: hideAllToasts called');
    ToastManager.getInstance().hideAllToasts();
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    hideAllToasts,
  };
}

// Toast container component to be placed in the app root
export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  console.log('🍞 ToastContainer: Rendering with toasts:', toasts.length, toasts);

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onHide={() => hideToast(toast.id)}
          visible={true}
        />
      ))}
    </>
  );
}

// Export ToastManager for direct use in utility modules
export { ToastManager };