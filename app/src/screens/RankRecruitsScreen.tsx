import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Recruit, DevTrait } from '../types';
import { PredictionResult } from '../lib/predictionApi';
import { predictRecruitsBatch, isOfflinePredictionReady } from '../lib/offlinePrediction';

const DEV_TRAITS: DevTrait[] = ['normal', 'impact', 'star', 'elite'];

const DEV_TRAIT_COLORS: Record<DevTrait, string> = {
  normal: '#666',
  impact: '#4CAF50',
  star: '#2196F3',
  elite: '#9C27B0',
};

interface RankedRecruit extends Recruit {
  prediction?: PredictionResult;
  selectedDevTrait?: DevTrait;
}

export default function RankRecruitsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recruits, setRecruits] = useState<RankedRecruit[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's recruits without dev trait on mount
  useEffect(() => {
    if (user?.id) {
      fetchPendingRecruits();
    }
  }, [user?.id]);

  const fetchPendingRecruits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('recruits')
        .select('*')
        .eq('user_id', user.id)
        .is('ocr_dev_trait', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRecruits(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recruits');
    } finally {
      setLoading(false);
    }
  };

  const runPredictions = async () => {
    if (recruits.length === 0) {
      Alert.alert('No Recruits', 'Add some recruits first to rank them.');
      return;
    }

    setPredicting(true);
    setError(null);

    try {
      // Check if prediction service is ready
      if (!isOfflinePredictionReady()) {
        throw new Error('Prediction model is still loading. Please wait a moment.');
      }

      // Convert recruits to prediction format
      const recruitInputs = recruits.map(recruit => ({
        name: recruit.name,
        position: recruit.position,
        archetype: recruit.archetype,
        star_rating: recruit.star_rating,
        gem_color: recruit.gem_color || null,
        stats: {
          awareness: recruit.stats?.awareness || 0,
          throw_power: recruit.stats?.throw_power || 0,
          short_accuracy: recruit.stats?.short_accuracy || 0,
          medium_accuracy: recruit.stats?.medium_accuracy || 0,
          deep_accuracy: recruit.stats?.deep_accuracy || 0,
          throw_on_run: recruit.stats?.throw_on_run || 0,
          under_pressure: recruit.stats?.under_pressure || 0,
          break_sack: recruit.stats?.break_sack || 0,
          speed: recruit.stats?.speed || 0,
          acceleration: recruit.stats?.acceleration || 0,
        },
      }));

      // Get predictions (runs locally - no network needed!)
      const predictions = await predictRecruitsBatch(recruitInputs);

      // Match predictions to recruits and sort
      const rankedRecruits = recruits.map(recruit => {
        const prediction = predictions.find(p => p.name === recruit.name);
        return { ...recruit, prediction };
      });

      // Sort by probability (highest first)
      rankedRecruits.sort((a, b) =>
        (b.prediction?.star_elite_probability || 0) - (a.prediction?.star_elite_probability || 0)
      );

      setRecruits(rankedRecruits);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get predictions';
      setError(message);
      Alert.alert('Prediction Error', message);
    } finally {
      setPredicting(false);
    }
  };

  const setDevTrait = (recruitId: string, trait: DevTrait) => {
    setRecruits(prev => prev.map(r =>
      r.id === recruitId ? { ...r, selectedDevTrait: trait } : r
    ));
  };

  const saveDevTrait = async (recruit: RankedRecruit) => {
    if (!recruit.selectedDevTrait) {
      Alert.alert('Select Dev Trait', 'Please select the actual dev trait first.');
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('recruits')
        .update({
          ocr_dev_trait: recruit.selectedDevTrait,
          predicted_dev_trait: recruit.prediction?.star_elite_percentage && recruit.prediction.star_elite_percentage >= 50 ? 'star' : 'impact',
          prediction_confidence: recruit.prediction ? {
            star_elite_probability: recruit.prediction.star_elite_probability,
            ml_model: recruit.prediction.ml_model,
          } : null,
        })
        .eq('id', recruit.id);

      if (updateError) throw updateError;

      // Remove from list after saving
      setRecruits(prev => prev.filter(r => r.id !== recruit.id));

      Alert.alert('Saved', `${recruit.name}'s dev trait saved as ${recruit.selectedDevTrait.toUpperCase()}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveAllDevTraits = async () => {
    const recruitsWithTraits = recruits.filter(r => r.selectedDevTrait);

    if (recruitsWithTraits.length === 0) {
      Alert.alert('No Dev Traits Selected', 'Select the actual dev trait for at least one recruit.');
      return;
    }

    setSaving(true);

    try {
      for (const recruit of recruitsWithTraits) {
        const { error: updateError } = await supabase
          .from('recruits')
          .update({
            ocr_dev_trait: recruit.selectedDevTrait,
            predicted_dev_trait: recruit.prediction?.star_elite_percentage && recruit.prediction.star_elite_percentage >= 50 ? 'star' : 'impact',
            prediction_confidence: recruit.prediction ? {
              star_elite_probability: recruit.prediction.star_elite_probability,
              ml_model: recruit.prediction.ml_model,
            } : null,
          })
          .eq('id', recruit.id);

        if (updateError) throw updateError;
      }

      // Remove saved recruits from list
      const savedIds = recruitsWithTraits.map(r => r.id);
      setRecruits(prev => prev.filter(r => !savedIds.includes(r.id)));

      Alert.alert('Saved', `${recruitsWithTraits.length} recruit(s) updated successfully.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasPredictions = recruits.some(r => r.prediction);
  const hasSelectedTraits = recruits.some(r => r.selectedDevTrait);

  // Render recruit card
  const renderRecruitCard = (recruit: RankedRecruit, index: number) => (
    <View
      key={recruit.id}
      style={[
        styles.recruitCard,
        recruit.prediction?.star_elite_percentage && recruit.prediction.star_elite_percentage >= 70 && styles.cardHot,
        recruit.prediction?.star_elite_percentage && recruit.prediction.star_elite_percentage < 30 && styles.cardCold,
      ]}
    >
      {/* Rank badge (only show if predictions exist) */}
      {recruit.prediction && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
        </View>
      )}

      <View style={styles.recruitInfo}>
        <Text style={styles.recruitName}>{recruit.name}</Text>
        <Text style={styles.recruitMeta}>
          {recruit.position} • {recruit.archetype} • {'★'.repeat(recruit.star_rating)}
        </Text>
        {recruit.gem_color && (
          <Text style={[
            styles.gemBadge,
            recruit.gem_color === 'green' ? styles.gemGreen : styles.gemRed
          ]}>
            {recruit.gem_color.toUpperCase()} GEM
          </Text>
        )}

        {/* Stats summary */}
        <Text style={styles.statsText}>
          TP: {recruit.stats?.throw_power || '?'} | SPD: {recruit.stats?.speed || '?'} | SA: {recruit.stats?.short_accuracy || '?'}
        </Text>

        {/* Prediction result */}
        {recruit.prediction && (
          <View style={styles.predictionBox}>
            <Text style={styles.predictionChance}>
              {recruit.prediction.star_elite_percentage}% Star/Elite
            </Text>
            <Text style={styles.predictionRec}>
              {recruit.prediction.recommendation}
            </Text>
            <Text style={styles.predictionModel}>
              {recruit.prediction.ml_model}
            </Text>
          </View>
        )}
      </View>

      {/* Dev trait selector */}
      <View style={styles.devTraitSection}>
        <Text style={styles.devTraitLabel}>Actual:</Text>
        <View style={styles.devTraitButtons}>
          {DEV_TRAITS.map(trait => (
            <TouchableOpacity
              key={trait}
              style={[
                styles.devTraitButton,
                recruit.selectedDevTrait === trait && { backgroundColor: DEV_TRAIT_COLORS[trait] },
              ]}
              onPress={() => setDevTrait(recruit.id, trait)}
            >
              <Text style={[
                styles.devTraitButtonText,
                recruit.selectedDevTrait === trait && styles.devTraitButtonTextActive,
              ]}>
                {trait.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {recruit.selectedDevTrait && (
          <TouchableOpacity
            style={styles.saveOneButton}
            onPress={() => saveDevTrait(recruit)}
            disabled={saving}
          >
            <Text style={styles.saveOneButtonText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading recruits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rank Recruits</Text>
        <Text style={styles.subtitle}>
          {recruits.length === 0
            ? 'No pending recruits. Add recruits first!'
            : `${recruits.length} recruit(s) pending dev trait`}
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Recruits list */}
        {recruits.map((recruit, index) => renderRecruitCard(recruit, index))}

        {recruits.length === 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.addButtonText}>← Go Add Recruits</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom action buttons */}
      {recruits.length > 0 && (
        <View style={styles.bottomBar}>
          {!hasPredictions ? (
            <TouchableOpacity
              style={[styles.rankButton, predicting && styles.buttonDisabled]}
              onPress={runPredictions}
              disabled={predicting}
            >
              <Text style={styles.rankButtonText}>
                {predicting ? 'Running Model...' : 'Run Predictions'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.saveAllButton, (!hasSelectedTraits || saving) && styles.buttonDisabled]}
              onPress={saveAllDevTraits}
              disabled={!hasSelectedTraits || saving}
            >
              <Text style={styles.saveAllButtonText}>
                {saving ? 'Saving...' : 'Save All Selected'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
  },
  recruitCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#333',
  },
  cardHot: {
    borderLeftColor: '#4CAF50',
  },
  cardCold: {
    borderLeftColor: '#f44336',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  recruitInfo: {
    flex: 1,
  },
  recruitName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recruitMeta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  gemBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gemGreen: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  gemRed: {
    backgroundColor: '#f44336',
    color: '#fff',
  },
  statsText: {
    color: '#666',
    fontSize: 11,
    marginTop: 6,
  },
  predictionBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  predictionChance: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  predictionRec: {
    color: '#ffd700',
    fontSize: 11,
    marginTop: 2,
  },
  predictionModel: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  devTraitSection: {
    alignItems: 'center',
    marginLeft: 8,
  },
  devTraitLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 4,
  },
  devTraitButtons: {
    flexDirection: 'column',
    gap: 4,
  },
  devTraitButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devTraitButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  devTraitButtonTextActive: {
    color: '#fff',
  },
  saveOneButton: {
    marginTop: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  saveOneButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#888',
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  rankButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rankButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveAllButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveAllButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
