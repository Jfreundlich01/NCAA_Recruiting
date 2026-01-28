import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Recruit, DevTrait } from '../types';

type RootStackParamList = {
  ReportDevTrait: { recruitId: string };
};

type ReportDevTraitRouteProp = RouteProp<RootStackParamList, 'ReportDevTrait'>;

const DEV_TRAITS: { value: DevTrait; label: string; color: string; description: string }[] = [
  { value: 'normal', label: 'Normal', color: '#666', description: 'Standard progression' },
  { value: 'impact', label: 'Impact', color: '#4CAF50', description: 'Above average growth' },
  { value: 'star', label: 'Star', color: '#2196F3', description: 'High potential' },
  { value: 'elite', label: 'Elite', color: '#9C27B0', description: 'Exceptional ceiling' },
];

export default function ReportDevTraitScreen() {
  const navigation = useNavigation();
  const route = useRoute<ReportDevTraitRouteProp>();
  const { recruitId } = route.params;

  const [recruit, setRecruit] = useState<Recruit | null>(null);
  const [selectedTrait, setSelectedTrait] = useState<DevTrait | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecruit();
  }, [recruitId]);

  const fetchRecruit = async () => {
    const { data, error } = await supabase
      .from('recruits')
      .select('*')
      .eq('id', recruitId)
      .single();

    if (error) {
      Alert.alert('Error', 'Could not load recruit');
      navigation.goBack();
    } else {
      setRecruit(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedTrait) {
      Alert.alert('Error', 'Please select a dev trait');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('recruits')
      .update({
        actual_dev_trait: selectedTrait,
        dev_trait_reported_at: new Date().toISOString(),
      })
      .eq('id', recruitId);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.goBack();
    }
  };

  const handleDidntSign = async () => {
    Alert.alert(
      'Remove Recruit',
      'Did you lose this recruit to another school?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('recruits')
              .delete()
              .eq('id', recruitId);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  if (loading || !recruit) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.recruitInfo}>
        <Text style={styles.recruitName}>{recruit.name}</Text>
        <Text style={styles.recruitDetails}>
          {recruit.position} • {recruit.archetype} • {'★'.repeat(recruit.star_rating)}
        </Text>
      </View>

      <Text style={styles.title}>What was the dev trait?</Text>
      <Text style={styles.subtitle}>
        Select the actual dev trait after signing this recruit
      </Text>

      <View style={styles.traitGrid}>
        {DEV_TRAITS.map((trait) => (
          <TouchableOpacity
            key={trait.value}
            style={[
              styles.traitCard,
              selectedTrait === trait.value && {
                borderColor: trait.color,
                backgroundColor: `${trait.color}20`,
              },
            ]}
            onPress={() => setSelectedTrait(trait.value)}
          >
            <View style={[styles.traitBadge, { backgroundColor: trait.color }]}>
              <Text style={styles.traitBadgeText}>{trait.label}</Text>
            </View>
            <Text style={styles.traitDescription}>{trait.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, !selectedTrait && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!selectedTrait || saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Dev Trait'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.didntSignButton} onPress={handleDidntSign}>
        <Text style={styles.didntSignText}>Didn't sign this recruit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 48,
  },
  recruitInfo: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recruitName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  recruitDetails: {
    fontSize: 14,
    color: '#888',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  traitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  traitCard: {
    width: '47%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  traitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  traitBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  traitDescription: {
    color: '#888',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  didntSignButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
  },
  didntSignText: {
    color: '#888',
    fontSize: 14,
  },
});
