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
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ScreenshotBatch {
  id: string;
  status: string;
  total_screenshots: number;
  processed_screenshots: number;
  created_at: string;
}

interface SelectedImage {
  uri: string;
  base64: string;
}

export default function BulkUploadScreen() {
  const { user } = useAuth();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batches, setBatches] = useState<ScreenshotBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  // Prevent operations while busy
  const isBusy = uploading || processing;

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('screenshot_batches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching batches:', error);
    } else {
      setBatches(data || []);
    }
    setLoadingBatches(false);
  };

  const pickImages = async () => {
    if (isBusy) {
      Alert.alert('Please Wait', 'Please wait for current operation to complete.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const images = result.assets
        .filter((asset) => asset.base64)
        .map((asset) => ({
          uri: asset.uri,
          base64: asset.base64!,
        }));
      setSelectedImages(images);
      console.log(`Selected ${images.length} images with base64`);
    }
  };

  const uploadBatch = async () => {
    if (!user || selectedImages.length === 0 || isBusy) return;

    setUploading(true);
    setCurrentBatchId(null);

    try {
      // Create batch record
      const { data: batch, error: batchError } = await supabase
        .from('screenshot_batches')
        .insert({
          user_id: user.id,
          total_screenshots: selectedImages.length,
          status: 'pending',
        })
        .select()
        .single();

      if (batchError) throw batchError;

      setCurrentBatchId(batch.id);

      // Upload each image
      for (let i = 0; i < selectedImages.length; i++) {
        const { base64 } = selectedImages[i];
        const filename = `${Date.now()}_${i}.png`;
        const storagePath = `${user.id}/${batch.id}/${filename}`;

        try {
          console.log(`Image ${i} base64 length:`, base64.length);

          // Convert base64 to ArrayBuffer for Supabase upload
          const arrayBuffer = decode(base64);

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('screenshots')
            .upload(storagePath, arrayBuffer, {
              contentType: 'image/png',
            });

          if (uploadError) {
            console.error(`Error uploading image ${i}:`, uploadError);
            continue;
          }

          console.log(`Successfully uploaded image ${i} to ${storagePath}`);

          // Create screenshot record
          await supabase.from('screenshots').insert({
            batch_id: batch.id,
            user_id: user.id,
            storage_path: storagePath,
            status: 'pending',
          });
        } catch (err) {
          console.error(`Error processing image ${i}:`, err);
        }
      }

      // Clear selected images BEFORE starting processing
      const imagesToProcess = selectedImages.length;
      setSelectedImages([]);
      setUploading(false);

      Alert.alert('Success', `Uploaded ${imagesToProcess} screenshots. Starting processing...`);
      fetchBatches();

      // Trigger processing (uploading is done, now processing starts)
      await processBatch(batch.id);

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload screenshots');
      setUploading(false);
      setCurrentBatchId(null);
    }
  };

  const processBatch = async (batchId: string) => {
    if (processing) {
      console.log('Already processing, skipping...');
      return;
    }

    setProcessing(true);
    setCurrentBatchId(batchId);

    try {
      // Get the current session for debugging
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session exists:', !!session);
      console.log('Token preview:', session?.access_token?.substring(0, 50) + '...');
      console.log('Token length:', session?.access_token?.length);

      if (!session?.access_token) {
        Alert.alert('Error', 'Not authenticated. Please log out and log back in.');
        return;
      }

      // Use supabase.functions.invoke which should handle auth automatically
      const { data, error } = await supabase.functions.invoke('process-screenshots', {
        body: { batch_id: batchId },
      });

      console.log('Process response:', JSON.stringify(data, null, 2));

      if (error) throw error;

      if (data.message) {
        // No pending screenshots or other message
        Alert.alert('Info', data.message + (data.debug ? `\n\nDebug: ${JSON.stringify(data.debug)}` : ''));
      } else {
        const successCount = data.results?.filter((r: any) => r.status === 'success').length || 0;
        const failCount = data.results?.filter((r: any) => r.status === 'failed').length || 0;
        Alert.alert(
          'Processing Complete',
          `Success: ${successCount}, Failed: ${failCount}${failCount > 0 ? `\n\nErrors: ${data.results?.filter((r: any) => r.error).map((r: any) => r.error).join(', ')}` : ''}`
        );
      }
      fetchBatches();

    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Error', 'Failed to process screenshots: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProcessing(false);
      setCurrentBatchId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'processing': return '#ff9800';
      case 'failed': return '#f44336';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bulk Screenshot Upload</Text>
      <Text style={styles.subtitle}>Dev Mode - Upload multiple recruit screenshots for OCR processing</Text>

      <TouchableOpacity
        style={[styles.pickButton, isBusy && styles.pickButtonDisabled]}
        onPress={pickImages}
        disabled={isBusy}
      >
        <Text style={[styles.pickButtonText, isBusy && styles.pickButtonTextDisabled]}>
          {selectedImages.length > 0
            ? `${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} selected`
            : isBusy
            ? 'Please wait...'
            : 'Select Screenshots'}
        </Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && !processing && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.buttonDisabled]}
          onPress={uploadBatch}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload & Process</Text>
          )}
        </TouchableOpacity>
      )}

      {processing && (
        <View style={styles.processingBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.processingText}>Processing screenshots with Claude Vision...</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Batches</Text>

      {loadingBatches ? (
        <ActivityIndicator color="#e94560" />
      ) : batches.length === 0 ? (
        <Text style={styles.emptyText}>No batches yet</Text>
      ) : (
        batches.map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={styles.batchHeader}>
              <Text style={styles.batchDate}>
                {new Date(batch.created_at).toLocaleDateString()}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(batch.status) }]}>
                <Text style={styles.statusText}>{batch.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.batchProgress}>
              {batch.processed_screenshots} / {batch.total_screenshots} processed
            </Text>
            {batch.status === 'pending' && (
              <TouchableOpacity
                style={[styles.retryButton, isBusy && styles.buttonDisabled]}
                onPress={() => processBatch(batch.id)}
                disabled={isBusy}
              >
                <Text style={styles.retryButtonText}>
                  {currentBatchId === batch.id ? 'Processing...' : 'Process Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
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
    marginBottom: 24,
  },
  pickButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  pickButtonText: {
    color: '#888',
    fontSize: 16,
  },
  pickButtonDisabled: {
    opacity: 0.5,
    borderColor: '#222',
  },
  pickButtonTextDisabled: {
    color: '#555',
  },
  uploadButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 12,
  },
  processingText: {
    color: '#fff',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 32,
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  batchCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  batchProgress: {
    color: '#888',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});
