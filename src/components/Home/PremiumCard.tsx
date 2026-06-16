// components/PremiumCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface PremiumCardProps {
  onPress: () => void;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ onPress }) => {
  return (
    <LinearGradient
      colors={['#6C2BD9', '#8B5CF6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={styles.badge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.badgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>Unlock Exclusive Deals</Text>
          <Text style={styles.description}>
            Get ad-free experience &{'\n'}auto-apply coupons
          </Text>
          <TouchableOpacity style={styles.button} onPress={onPress}>
            <Text style={styles.buttonText}>Start Free Trial</Text>
            <Ionicons name="arrow-forward" size={18} color="#6C2BD9" />
          </TouchableOpacity>
        </View>
        <View style={styles.rightContent}>
          <Image 
            // source={require('../assets/images/premium-illustration.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    minHeight: 140,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: 80,
    height: 80,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#6C2BD9',
    fontWeight: '600',
    fontSize: 14,
  },
});