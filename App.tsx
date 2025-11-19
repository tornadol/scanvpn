/**
 * ScanVPN React Native App
 * Native iOS application without Expo
 *
 * @format
 */
import './global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  StatusBar,
  StyleSheet,
  useColorScheme as useRNColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProfilesScreen from './src/screens/ProfilesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { ProfilesProvider } from './src/context/ProfilesContext';
import { useColorScheme } from './src/lib/useColorScheme';
import { ToastContainer } from './src/components/nativewindui/Toast';

// Create tab navigator
const Tab = createBottomTabNavigator();

// Wrapper component for Tab Navigator with ProfilesProvider
function TabNavigatorWithProvider() {
  const { colors } = useColorScheme();

  return (
    <ProfilesProvider>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.accent || '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialIcons
                name="home"
                size={size || 24}
                color={focused ? colors.accent || '#007AFF' : '#8E8E93'}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            title: 'Scanner',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialIcons
                name="qr-code-scanner"
                size={size || 24}
                color={focused ? colors.accent || '#007AFF' : '#8E8E93'}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Profiles"
          component={ProfilesScreen}
          options={{
            title: 'Profiles',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialIcons
                name="folder"
                size={size || 24}
                color={focused ? colors.accent || '#007AFF' : '#8E8E93'}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialIcons
                name="settings"
                size={size || 24}
                color={focused ? colors.accent || '#007AFF' : '#8E8E93'}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </ProfilesProvider>
  );
}

function App() {
  const isDarkMode = useRNColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <TabNavigatorWithProvider />
        </NavigationContainer>
        <ToastContainer />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
