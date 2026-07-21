// components/BrandHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../context/NotificationContext';
// import logo from "../../assets/logo.png";

interface BrandHeaderProps {
  compact?: boolean;
  showNotification?: boolean; // কোনো পেইজে বেল লুকাতে চাইলে false দাও
}

// ✅ সব পেইজে consistent branding + notification bell — Navigator header হিসেবে ব্যবহার হবে
export const BrandHeader: React.FC<BrandHeaderProps> = ({
  compact = false,
  showNotification = true,
}) => {
  const navigation = useNavigation();
  const { unreadCount } = useNotification();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.container, compact && styles.containerCompact]}>
        {/* ✅ Logo + Wordmark — tapping the logo returns to Home */}
        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => (navigation.navigate as any)('MainTabs', { screen: 'HomeTab' })}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={[styles.logo, compact && styles.logoCompact]}
            resizeMode="contain"
          />
          {/* <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>
            Deal<Text style={styles.wordmarkAccent}>Nux</Text>
          </Text> */}
        </TouchableOpacity>

        {/* ✅ Notification Bell */}
        {showNotification && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notification' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={compact ? 20 : 22} color="#1F2937" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F9F9FB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    // paddingBottom: 10,
  },
  containerCompact: {
    paddingTop: 8,
    // paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
  },
  logoCompact: {
    width: 50,
    height: 50,
  },
  wordmark: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  wordmarkCompact: {
    fontSize: 15,
  },
  wordmarkAccent: {
    color: '#2355B6',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});