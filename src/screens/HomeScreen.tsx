import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { testModuleReplacement } from '@/lib/wireguard/connection';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    testModuleReplacement();
  }, []);
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Your App</Text>
        <Text style={styles.subtitle}>React Native iOS Application</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Getting Started</Text>
          <Text style={styles.cardText}>
            This is a basic React Native app set up with TypeScript and Xcode.
            You can now start building your native iOS application.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Features</Text>
          <Text style={styles.cardText}>
            • TypeScript support{'\n'}• React Navigation{'\n'}• Native iOS build
            {'\n'}• Xcode integration
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Steps</Text>
          <Text style={styles.cardText}>
            1. Configure Xcode project settings{'\n'}
            2. Set up bundle identifier{'\n'}
            3. Configure Apple Developer account{'\n'}
            4. Build and test on iOS simulator
          </Text>
        </View>

        <Button
          title="Go to Settings"
          onPress={() => navigation.navigate('Settings')}
          color="#f4511e"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f4511e',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});

export default HomeScreen;
