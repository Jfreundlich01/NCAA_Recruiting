import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Recruit, DevTrait } from '../types';

type RootStackParamList = {
  RecruitList: undefined;
  AddRecruit: undefined;
  RankRecruits: undefined;
  ReportDevTrait: { recruitId: string };
  BulkUpload: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const DEV_TRAIT_COLORS: Record<DevTrait, string> = {
  normal: '#666',
  impact: '#4CAF50',
  star: '#2196F3',
  elite: '#9C27B0',
};

export default function RecruitListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, isDev } = useAuth();
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecruits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recruits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recruits:', error);
    } else {
      setRecruits(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecruits();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecruits();
  };

  const getStarDisplay = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const renderRecruit = ({ item }: { item: Recruit }) => (
    <TouchableOpacity
      style={styles.recruitCard}
      onPress={() => {
        if (!item.actual_dev_trait) {
          navigation.navigate('ReportDevTrait', { recruitId: item.id });
        }
      }}
    >
      <View style={styles.recruitHeader}>
        <Text style={styles.recruitName}>{item.name}</Text>
        <Text style={styles.recruitStars}>{getStarDisplay(item.star_rating)}</Text>
      </View>

      <View style={styles.recruitDetails}>
        <Text style={styles.recruitInfo}>
          {item.position} • {item.archetype}
        </Text>
        <Text style={styles.recruitInfo}>
          {item.height_feet}'{item.height_inches}" • {item.weight_lbs} lbs
        </Text>
        <Text style={styles.recruitInfo}>
          {item.hometown}, {item.state}
        </Text>
      </View>

      <View style={styles.devTraitContainer}>
        {item.actual_dev_trait ? (
          <View
            style={[
              styles.devTraitBadge,
              { backgroundColor: DEV_TRAIT_COLORS[item.actual_dev_trait] },
            ]}
          >
            <Text style={styles.devTraitText}>
              {item.actual_dev_trait.toUpperCase()}
            </Text>
          </View>
        ) : (
          <Text style={styles.pendingText}>Tap to report dev trait</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const unreportedCount = recruits.filter((r) => !r.actual_dev_trait).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Recruits</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {isDev && (
        <TouchableOpacity
          style={styles.devBanner}
          onPress={() => navigation.navigate('BulkUpload')}
        >
          <Text style={styles.devBannerText}>DEV MODE - Tap for Bulk Upload</Text>
        </TouchableOpacity>
      )}

      {unreportedCount > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            {unreportedCount} recruit{unreportedCount > 1 ? 's' : ''} need dev trait reported
          </Text>
        </View>
      )}

      <FlatList
        data={recruits}
        renderItem={renderRecruit}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e94560"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No recruits yet. Add your first!'}
            </Text>
          </View>
        }
      />

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.rankButton}
          onPress={() => navigation.navigate('RankRecruits')}
        >
          <Text style={styles.rankButtonText}>Rank Recruits</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRecruit')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOutText: {
    color: '#e94560',
    fontSize: 14,
  },
  devBanner: {
    backgroundColor: '#9C27B0',
    padding: 12,
    alignItems: 'center',
  },
  devBannerText: {
    color: '#fff',
    fontWeight: '600',
  },
  warningBanner: {
    backgroundColor: '#ff9800',
    padding: 12,
    alignItems: 'center',
  },
  warningText: {
    color: '#000',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  recruitCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recruitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recruitName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  recruitStars: {
    fontSize: 14,
    color: '#ffd700',
  },
  recruitDetails: {
    marginBottom: 12,
  },
  recruitInfo: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  devTraitContainer: {
    alignItems: 'flex-start',
  },
  devTraitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  devTraitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  pendingText: {
    color: '#ff9800',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  rankButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rankButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
