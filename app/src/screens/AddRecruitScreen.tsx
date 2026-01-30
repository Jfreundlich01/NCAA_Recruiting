import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  US_STATES,
  GameVersion,
  Position,
  PositionStats,
  getStatConfigForPosition,
  getArchetypesForPosition,
} from '../types';

// Positions we currently support for manual entry
const SUPPORTED_POSITIONS: Position[] = ['QB', 'CB'];
const STAR_RATINGS = [1, 2, 3, 4, 5];

// Initialize empty stats object based on position
const initializeStats = (position: Position): Record<string, string> => {
  const statConfig = getStatConfigForPosition(position);
  return statConfig.reduce((acc, stat) => ({ ...acc, [stat.key]: '' }), {} as Record<string, string>);
};

export default function AddRecruitScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('QB');
  const [archetype, setArchetype] = useState<string>('Dual Threat');
  const [starRating, setStarRating] = useState(3);
  const [heightFeet, setHeightFeet] = useState('6');
  const [heightInches, setHeightInches] = useState('2');
  const [weight, setWeight] = useState('210');
  const [hometown, setHometown] = useState('');
  const [state, setState] = useState('TX');
  const [gameYear, setGameYear] = useState('2026');
  const [stats, setStats] = useState<Record<string, string>>(initializeStats('QB'));
  const [gemColor, setGemColor] = useState<'green' | 'red' | null>(null);
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Get current position's config
  const currentStatConfig = getStatConfigForPosition(position);
  const currentArchetypes = getArchetypesForPosition(position);

  // Handle position change - reset stats and archetype
  const handlePositionChange = (newPosition: Position) => {
    setPosition(newPosition);
    setStats(initializeStats(newPosition));
    const archetypes = getArchetypesForPosition(newPosition);
    setArchetype(archetypes[0]); // Default to first archetype
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshot(result.assets[0].uri);
      // TODO: Send to OCR API and populate fields
      Alert.alert('OCR Coming Soon', 'Screenshot captured. OCR integration pending.');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter recruit name');
      return;
    }

    const feet = parseInt(heightFeet);
    const inches = parseInt(heightInches);
    const weightLbs = parseInt(weight);

    if (isNaN(feet) || isNaN(inches) || isNaN(weightLbs)) {
      Alert.alert('Error', 'Please enter valid height and weight');
      return;
    }

    if (inches < 0 || inches > 11) {
      Alert.alert('Error', 'Inches must be between 0 and 11');
      return;
    }

    // Build stats object and validate all are filled
    const statsObject: Partial<PositionStats> = {};
    for (const statConfig of currentStatConfig) {
      const value = parseInt(stats[statConfig.key]);
      if (isNaN(value) || value < 0) {
        Alert.alert('Error', `Please enter a valid value for ${statConfig.label}`);
        return;
      }
      (statsObject as Record<string, number>)[statConfig.key] = value;
    }

    setLoading(true);

    const { error } = await supabase.from('recruits').insert({
      user_id: user?.id,
      game_version: 'ncaa_26' as GameVersion,
      game_year: parseInt(gameYear),
      name: name.trim(),
      position,
      archetype,
      star_rating: starRating,
      height_feet: feet,
      height_inches: inches,
      weight_lbs: weightLbs,
      hometown: hometown.trim(),
      state,
      stats: statsObject as PositionStats,
      gem_color: gemColor,
      screenshot_url: screenshot,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Basic Info</Text>

        <TextInput
          style={styles.input}
          placeholder="Recruit Name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Position</Text>
        <View style={styles.buttonGroup}>
          {SUPPORTED_POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[
                styles.optionButton,
                position === pos && styles.optionButtonActive,
              ]}
              onPress={() => handlePositionChange(pos)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  position === pos && styles.optionButtonTextActive,
                ]}
              >
                {pos}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Archetype</Text>
        <View style={styles.buttonGroup}>
          {currentArchetypes.map((arch) => (
            <TouchableOpacity
              key={arch}
              style={[
                styles.optionButton,
                archetype === arch && styles.optionButtonActive,
              ]}
              onPress={() => setArchetype(arch)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  archetype === arch && styles.optionButtonTextActive,
                ]}
              >
                {arch}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Star Rating</Text>
        <View style={styles.buttonGroup}>
          {STAR_RATINGS.map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.starButton,
                starRating === rating && styles.starButtonActive,
              ]}
              onPress={() => setStarRating(rating)}
            >
              <Text style={styles.starButtonText}>{'★'.repeat(rating)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Gem Color</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.gemButton,
              gemColor === 'green' && styles.gemButtonGreen,
            ]}
            onPress={() => setGemColor(gemColor === 'green' ? null : 'green')}
          >
            <Text style={[styles.gemButtonText, gemColor === 'green' && styles.gemButtonTextActive]}>
              Green
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.gemButton,
              gemColor === 'red' && styles.gemButtonRed,
            ]}
            onPress={() => setGemColor(gemColor === 'red' ? null : 'red')}
          >
            <Text style={[styles.gemButtonText, gemColor === 'red' && styles.gemButtonTextActive]}>
              Red
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.gemButton,
              gemColor === null && styles.gemButtonNone,
            ]}
            onPress={() => setGemColor(null)}
          >
            <Text style={[styles.gemButtonText, gemColor === null && styles.gemButtonTextActive]}>
              None
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Physical</Text>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Height (ft)</Text>
            <TextInput
              style={styles.input}
              placeholder="6"
              placeholderTextColor="#666"
              value={heightFeet}
              onChangeText={setHeightFeet}
              keyboardType="number-pad"
              maxLength={1}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Height (in)</Text>
            <TextInput
              style={styles.input}
              placeholder="2"
              placeholderTextColor="#666"
              value={heightInches}
              onChangeText={setHeightInches}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <Text style={styles.label}>Weight (lbs)</Text>
        <TextInput
          style={styles.input}
          placeholder="210"
          placeholderTextColor="#666"
          value={weight}
          onChangeText={setWeight}
          keyboardType="number-pad"
        />

        <Text style={styles.sectionTitle}>Location</Text>

        <TextInput
          style={styles.input}
          placeholder="Hometown"
          placeholderTextColor="#666"
          value={hometown}
          onChangeText={setHometown}
        />

        <Text style={styles.label}>State</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.stateRow}>
            {US_STATES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.stateButton,
                  state === st && styles.stateButtonActive,
                ]}
                onPress={() => setState(st)}
              >
                <Text
                  style={[
                    styles.stateButtonText,
                    state === st && styles.stateButtonTextActive,
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Game Year</Text>
        <TextInput
          style={styles.input}
          placeholder="2026"
          placeholderTextColor="#666"
          value={gameYear}
          onChangeText={setGameYear}
          keyboardType="number-pad"
        />

        <Text style={styles.sectionTitle}>{position} Scouted Stats (10)</Text>

        {currentStatConfig.map((statConfig) => (
          <View key={statConfig.key} style={styles.statRow}>
            <Text style={styles.statLabel}>{statConfig.label}</Text>
            <TextInput
              style={styles.statInput}
              placeholder="0-99"
              placeholderTextColor="#666"
              value={stats[statConfig.key] || ''}
              onChangeText={(value) => setStats({ ...stats, [statConfig.key]: value })}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.screenshotButton} onPress={pickImage}>
          <Text style={styles.screenshotButtonText}>
            {screenshot ? 'Screenshot Added' : 'Upload Screenshot (OCR)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : 'Save Recruit'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16213e',
  },
  optionButtonActive: {
    borderColor: '#e94560',
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
  },
  optionButtonText: {
    color: '#888',
    fontSize: 14,
  },
  optionButtonTextActive: {
    color: '#e94560',
  },
  starButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16213e',
  },
  starButtonActive: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  starButtonText: {
    color: '#ffd700',
    fontSize: 12,
  },
  gemButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16213e',
  },
  gemButtonGreen: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  gemButtonRed: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  gemButtonNone: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  gemButtonText: {
    color: '#888',
    fontSize: 14,
  },
  gemButtonTextActive: {
    color: '#fff',
  },
  stateRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  stateButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  stateButtonActive: {
    backgroundColor: '#e94560',
  },
  stateButtonText: {
    color: '#888',
    fontSize: 12,
  },
  stateButtonTextActive: {
    color: '#fff',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  statInput: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  screenshotButton: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  screenshotButtonText: {
    color: '#888',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
