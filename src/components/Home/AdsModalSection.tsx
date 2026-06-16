// components/AdsModalSection.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface AdsItem {
  id: number;
  image: string;
  title: string;
  description?: string;
  target_url: string;
}

interface AdsModalSectionProps {
  ads: AdsItem[];
  buildImageUrl: (path: string) => string;
  onPressAd: (id: number, url: string) => void;
}

export const AdsModalSection: React.FC<AdsModalSectionProps> = ({
  ads,
  buildImageUrl,
  onPressAd,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAd, setSelectedAd] = useState<AdsItem | null>(null);

  const handleAdPress = (ad: AdsItem) => {
    setSelectedAd(ad);
    setModalVisible(true);
  };

  const handleAdAction = () => {
    if (selectedAd) {
      onPressAd(selectedAd.id, selectedAd.target_url);
      setModalVisible(false);
    }
  };

  if (!ads || ads.length === 0) return null;

  return (
    <>
      {/* Compact Ads Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <View style={styles.previewTitleContainer}>
            <MaterialIcons name="campaign" size={20} color="#2563EB" />
            <Text style={styles.previewTitle}>Sponsored</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={ads.slice(0, 3)}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.previewItem}
              onPress={() => handleAdPress(item)}
            >
              <Image 
                source={{ uri: buildImageUrl(item.image) }} 
                style={styles.previewImage}
              />
              <View style={styles.previewOverlay}>
                <Text style={styles.previewItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <TouchableOpacity 
                  style={styles.learnMoreButton}
                  onPress={() => handleAdPress(item)}
                >
                  <Text style={styles.learnMoreText}>Learn More</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Full Ads Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sponsored Deals</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ads}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalAdItem}
                  onPress={() => {
                    setSelectedAd(item);
                    handleAdAction();
                  }}
                >
                  <Image 
                    source={{ uri: buildImageUrl(item.image) }} 
                    style={styles.modalAdImage}
                  />
                  <View style={styles.modalAdContent}>
                    <Text style={styles.modalAdTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.modalAdDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.modalAdFooter}>
                      <View style={styles.sponsoredBadge}>
                        <Ionicons name="radio" size={8} color="#2563EB" />
                        <Text style={styles.sponsoredText}>Sponsored</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.claimButton}
                        onPress={() => {
                          setSelectedAd(item);
                          handleAdAction();
                        }}
                      >
                        <Text style={styles.claimButtonText}>View Deal</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  previewList: {
    gap: 12,
  },
  previewItem: {
    width: width * 0.5,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewItemTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
  },
  learnMoreText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    padding: 16,
  },
  modalAdItem: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  modalAdImage: {
    width: 100,
    height: 100,
  },
  modalAdContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  modalAdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalAdDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  modalAdFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sponsoredText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  claimButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
});