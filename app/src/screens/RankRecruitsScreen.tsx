import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

// Tier colors and labels for ruleset tiers
type TierInfo = {
  tier: string;
  color: string;
  label: string;
};

const getTierFromRule = (mlModel: string): TierInfo | null => {
  if (!mlModel.startsWith('Rule:')) return null;

  const rule = mlModel.replace('Rule: ', '');

  // AVOID tier (negative rules)
  if (rule.includes('Red Gem') || rule.includes('Field + Slow')) {
    return { tier: 'AVOID', color: '#f44336', label: 'X' };
  }

  // TIER 1: Abilities, Athletic Sum ≥370+, Archetype+Stat rules
  if (
    rule.includes('Jammer') ||
    rule.includes('Robber') ||
    rule.includes('Athletic Sum ≥372') ||
    rule.includes('Athletic Sum ≥370') ||
    rule.includes('B&R + Elite AGI') ||
    rule.includes('Zone + Elite AGI') ||
    rule.includes('Zone + COD')
  ) {
    return { tier: 'T1', color: '#FFD700', label: '1' };
  }

  // TIER 2: Zone/B&R + Green Gem
  if (rule.includes('Zone + Green') || rule.includes('B&R + Green')) {
    return { tier: 'T2', color: '#4CAF50', label: '2' };
  }

  // TIER 3: Combo rules
  if (rule.includes('COD+Acc') || rule.includes('Acc+Agi')) {
    return { tier: 'T3', color: '#2196F3', label: '3' };
  }

  // TIER 4: Any Green Gem
  if (rule.includes('Green Gem')) {
    return { tier: 'T4', color: '#9C27B0', label: '4' };
  }

  return null;
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

  // Fetch user's recruits without dev trait when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchPendingRecruits();
      }
    }, [user?.id])
  );

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
      // Pass ALL stats (QB and CB) - the prediction engine will use what it needs
      const recruitInputs = recruits.map(recruit => ({
        name: recruit.name,
        position: recruit.position,
        archetype: recruit.archetype,
        star_rating: recruit.star_rating,
        gem_color: recruit.gem_color || null,
        abilities: recruit.abilities || [],
        stats: {
          // QB stats
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
          // CB stats
          agility: recruit.stats?.agility || 0,
          change_of_direction: recruit.stats?.change_of_direction || 0,
          man_coverage: recruit.stats?.man_coverage || 0,
          zone_coverage: recruit.stats?.zone_coverage || 0,
          press: recruit.stats?.press || 0,
          tackle: recruit.stats?.tackle || 0,
          catching: recruit.stats?.catching || 0,
          // WR stats
          catch_in_traffic: recruit.stats?.catch_in_traffic || 0,
          spectacular_catch: recruit.stats?.spectacular_catch || 0,
          short_route: recruit.stats?.short_route || 0,
          medium_route: recruit.stats?.medium_route || 0,
          deep_route: recruit.stats?.deep_route || 0,
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
      // Capitalize dev trait for consistency (e.g., 'normal' -> 'Normal')
      const capitalizedTrait = recruit.selectedDevTrait!.charAt(0).toUpperCase() + recruit.selectedDevTrait!.slice(1);

      const { error: updateError } = await supabase
        .from('recruits')
        .update({
          ocr_dev_trait: capitalizedTrait,
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
        // Capitalize dev trait for consistency (e.g., 'normal' -> 'Normal')
        const capitalizedTrait = recruit.selectedDevTrait!.charAt(0).toUpperCase() + recruit.selectedDevTrait!.slice(1);

        const { error: updateError } = await supabase
          .from('recruits')
          .update({
            ocr_dev_trait: capitalizedTrait,
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
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionChance}>
                {recruit.prediction.star_elite_percentage}% Star/Elite
              </Text>
              {/* Tier badge */}
              {(() => {
                const tierInfo = getTierFromRule(recruit.prediction.ml_model);
                if (tierInfo) {
                  return (
                    <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
                      <Text style={styles.tierBadgeText}>{tierInfo.tier}</Text>
                    </View>
                  );
                }
                return null;
              })()}
            </View>
            <Text style={styles.predictionRec}>
              {recruit.prediction.recommendation}
            </Text>
            <Text style={styles.predictionModel}>
              {recruit.prediction.ml_model}
            </Text>
            {recruit.prediction.rf_score !== undefined &&
             recruit.prediction.ml_model.startsWith('Rule:') && (
              <Text style={styles.rfScore}>
                RF: {Math.round(recruit.prediction.rf_score * 100)}%
              </Text>
            )}
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

        {/* Tier legend */}
        {hasPredictions && (
          <View style={styles.tierLegend}>
            <View style={styles.tierLegendItem}>
              <View style={[styles.tierDot, { backgroundColor: '#FFD700' }]} />
              <Text style={styles.tierLegendText}>T1 93%</Text>
            </View>
            <View style={styles.tierLegendItem}>
              <View style={[styles.tierDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.tierLegendText}>T2 79%</Text>
            </View>
            <View style={styles.tierLegendItem}>
              <View style={[styles.tierDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.tierLegendText}>T3 68%</Text>
            </View>
            <View style={styles.tierLegendItem}>
              <View style={[styles.tierDot, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.tierLegendText}>T4 61%</Text>
            </View>
            <View style={styles.tierLegendItem}>
              <View style={[styles.tierDot, { backgroundColor: '#f44336' }]} />
              <Text style={styles.tierLegendText}>AVOID</Text>
            </View>
          </View>
        )}

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
    marginBottom: 8,
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  tierLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierLegendText: {
    color: '#aaa',
    fontSize: 11,
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
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  predictionChance: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  tierBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
  rfScore: {
    color: '#888',
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
