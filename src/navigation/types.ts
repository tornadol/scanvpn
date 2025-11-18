import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Scanner: undefined;
  Profiles: undefined;
  Settings: undefined;
};

export type NavigationProp = StackNavigationProp<RootStackParamList>;
export type TabNavigationProp = BottomTabNavigationProp<RootTabParamList>;
