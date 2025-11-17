import React from 'react';
import { TextInput, View, Text } from 'react-native';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'ascii-capable' | 'numbers-and-punctuation' | 'url' | 'number-pad';
  error?: string;
  className?: string;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  error,
  className = '',
}: InputProps) {
  return (
    <View className="mb-3">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white ${multiline ? 'min-h-[80px] text-base' : 'h-12'} ${className}`}
        placeholderTextColor="#9CA3AF"
        style={{
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      />
      {error && (
        <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      )}
    </View>
  );
}