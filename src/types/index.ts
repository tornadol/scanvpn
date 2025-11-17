// Common types used throughout the application

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  autoSync: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ErrorType {
  code: string;
  message: string;
  details?: any;
}