import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Animated,
  Dimensions,
  StatusBar,
  Text,
  StyleSheet,
} from 'react-native';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
  visible?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Fix: StatusBar does not have a 'height' property in react-native.
// Use 44 as a fallback default for iOS, and StatusBar.currentHeight for Android.
const STATUS_BAR_HEIGHT =
  typeof StatusBar.currentHeight === 'number' ? StatusBar.currentHeight : 44;

// Simple color configuration for toast types
const getToastColors = (type: 'success' | 'error' | 'warning' | 'info') => {
  switch (type) {
    case 'success':
      return { backgroundColor: '#10B981', borderColor: '#059669' };
    case 'error':
      return { backgroundColor: '#DFD1D1FF', borderColor: '#DC2626' };
    case 'warning':
      return { backgroundColor: '#F59E0B', borderColor: '#D97706' };
    case 'info':
    default:
      return { backgroundColor: '#3B82F6', borderColor: '#2563EB' };
  }
};

export function Toast({
  message,
  type = 'error',
  duration = 3000,
  onHide,
  visible = true,
}: ToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

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
  }, [fadeAnim, slideAnim, duration, hide]);

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }
  }, [visible, show, hide]);

  if (!visible) return null;

  const colors = getToastColors(type);

  return (
    <View
      style={[styles.container, { paddingTop: STATUS_BAR_HEIGHT + 10 }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.toast,
          colors,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        pointerEvents="auto"
      >
        <Text style={styles.text}>{message}</Text>
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

  showToast(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'error',
    duration = 3000,
  ) {
    const id = Date.now().toString();
    const toast: ToastItem = { id, message, type, duration };

    console.log('🍞 ToastManager: showToast called', {
      id,
      message,
      type,
      duration,
    });

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

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type?: 'success' | 'error' | 'warning' | 'info',
      duration?: number,
    ) => {
      console.log('🍞 useToast: showToast called with', {
        message,
        type,
        duration,
      });
      return ToastManager.getInstance().showToast(message, type, duration);
    },
    [],
  );

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

  console.log(
    '🍞 ToastContainer: Rendering with toasts:',
    toasts.length,
    toasts,
  );

  if (toasts.length === 0) {
    return null;
  }

  // Only show the most recent toast
  const latestToast = toasts[toasts.length - 1];

  return (
    <Toast
      key={latestToast.id}
      message={latestToast.message}
      type={latestToast.type}
      duration={latestToast.duration}
      onHide={() => hideToast(latestToast.id)}
      visible={true}
    />
  );
}

// Export ToastManager for direct use in utility modules
export { ToastManager };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toast: {
    maxWidth: Dimensions.get('window').width * 0.9,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
