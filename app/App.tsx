import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import RecruitListScreen from './src/screens/RecruitListScreen';
import AddRecruitScreen from './src/screens/AddRecruitScreen';
import RankRecruitsScreen from './src/screens/RankRecruitsScreen';
import ReportDevTraitScreen from './src/screens/ReportDevTraitScreen';
import BulkUploadScreen from './src/screens/BulkUploadScreen';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { initOfflinePrediction } from './src/lib/offlinePrediction';

type RootStackParamList = {
  RecruitList: undefined;
  AddRecruit: undefined;
  RankRecruits: undefined;
  ReportDevTrait: { recruitId: string };
  BulkUpload: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { session, loading, isDev } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#16213e' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: '#1a1a2e' },
          }}
        >
          <Stack.Screen
            name="RecruitList"
            component={RecruitListScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddRecruit"
            component={AddRecruitScreen}
            options={{ title: 'Add Recruit' }}
          />
          <Stack.Screen
            name="RankRecruits"
            component={RankRecruitsScreen}
            options={{ title: 'Rank Recruits' }}
          />
          <Stack.Screen
            name="ReportDevTrait"
            component={ReportDevTraitScreen}
            options={{ title: 'Report Dev Trait' }}
          />
          {isDev && (
            <Stack.Screen
              name="BulkUpload"
              component={BulkUploadScreen}
              options={{ title: 'Bulk Upload (Dev)' }}
            />
          )}
        </Stack.Navigator>
      ) : (
        <AuthScreen />
      )}
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  const [mlReady, setMlReady] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);

  // Initialize TensorFlow.js and ML models on app startup
  useEffect(() => {
    const initML = async () => {
      try {
        console.log('Initializing ML models...');
        await initOfflinePrediction();
        setMlReady(true);
        console.log('ML models ready');
      } catch (error) {
        console.error('Failed to initialize ML:', error);
        setMlError(error instanceof Error ? error.message : 'Failed to load ML models');
        // Continue anyway - predictions will show an error when attempted
        setMlReady(true);
      }
    };

    initML();
  }, []);

  // Show loading screen while ML initializes
  if (!mlReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading ML models...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
});
