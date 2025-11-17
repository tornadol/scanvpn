import type { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

export type NavigationProp = StackNavigationProp<RootStackParamList>;