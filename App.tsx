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
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size || 24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            title: 'Scanner',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons
                name="qr-code-scanner"
                size={size || 24}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Profiles"
          component={ProfilesScreen}
          options={{
            title: 'Profiles',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="folder" size={size || 24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size || 24} color={color} />
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
