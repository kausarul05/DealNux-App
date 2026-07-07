// screens/Notification.tsx - আপডেটেড
import React, { useState, useEffect, useCallback } from 'react'
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'
import { Ionicons } from '@expo/vector-icons'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'

type NotificationItem = {
  id: number
  title: string
  body: string
  channel: string
  recipient_type: string
  image_url: string | null
  cta_text: string | null
  cta_link: string | null
  is_read: boolean
  created_at: string
}

const Notification = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // ─── Register Device Token (Expo Go Support) ──────────────────────────────
  const registerDeviceToken = async () => {
    try {
      // console.log('🔄 Starting device token registration...')
      
      const token = await AsyncStorage.getItem('vToken')
      if (!token) {
        // console.log('❌ No auth token found, skipping device registration')
        return
      }

      // ✅ Expo Go তেও কাজ করবে
      const isExpoGo = Constants.appOwnership === 'expo'
      // console.log(`📱 App ownership: ${Constants.appOwnership}`)
      
      // ✅ Expo Go তেও permission নিন
      // console.log('📱 Requesting notification permissions...')
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      // console.log(`📱 Existing permission status: ${existingStatus}`)
      
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
        // console.log(`📱 New permission status: ${finalStatus}`)
      }

      if (finalStatus !== 'granted') {
        // console.log('❌ Push notification permission denied')
        return
      }

      // ✅ Expo Go তে projectId ছাড়া কাজ করে
      let fcmToken
      
      if (isExpoGo) {
        // ✅ Expo Go তে সরাসরি token নিন
        // console.log('📱 Getting Expo push token (Expo Go)...')
        fcmToken = await Notifications.getExpoPushTokenAsync()
        // console.log('📱 Expo Token received:', fcmToken.data)
      } else {
        // ✅ Standalone build এর জন্য projectId সহ
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                          Constants.manifest?.extra?.eas?.projectId ||
                          ''
        // console.log(`📱 Project ID: ${projectId}`)

        if (!projectId) {
          // console.warn('⚠️ No projectId found for push notifications')
          return
        }

        // console.log('📱 Getting FCM token...')
        fcmToken = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })
        // console.log('📱 FCM Token received:', fcmToken.data)
      }

      // ✅ Token টি ব্যাকএন্ডে পাঠান
      // console.log('📤 Sending device token to backend...')
      const response = await axios.post(
        `${IPA_BASE}notifications/device-token/`,
        {
          fcm_token: fcmToken.data,
          device_type: Platform.OS === 'ios' ? 'ios' : 'android',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      // console.log('✅ Device token registered successfully:', response.data)
    } catch (error: any) {
      // console.error('❌ Error registering device token:', error?.response?.data || error.message)
    }
  }

  // ─── Fetch Notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('vToken')

      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get(
        `${IPA_BASE}notifications/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      console.log('📬 Notifications Response:', response.data)

      if (response.data?.success && response.data?.data) {
        setNotifications(response.data.data.notifications || [])
        setUnreadCount(response.data.data.unread_count || 0)
      }
    } catch (error: any) {
      console.error('❌ Error fetching notifications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // ✅ 2 সেকেন্ড delay করে registerDeviceToken চালান
    setTimeout(() => {
      registerDeviceToken()
    }, 2000)
  }, [fetchNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  // ─── Mark All as Read ──────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('vToken')
      if (!token) return

      const response = await axios.post(
        `${IPA_BASE}notifications/notifications/read-all/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      if (response.data?.success) {
        setNotifications(prev =>
          prev.map(item => ({ ...item, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error: any) {
      console.error('❌ Error marking all as read:', error)
      Alert.alert('Error', 'Failed to mark all as read. Please try again.')
    }
  }

  // ─── Format Date ───────────────────────────────────────────────────────────
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  // ─── Get Icon Based on Channel ───────────────────────────────────────────
  const getNotificationIcon = (channel: string) => {
    switch (channel?.toUpperCase()) {
      case 'SYSTEM':
        return 'information-circle'
      case 'PROMOTION':
        return 'megaphone'
      case 'ORDER':
        return 'cube'
      case 'PRICE_ALERT':
        return 'pricetag'
      case 'REFERRAL':
        return 'gift'
      default:
        return 'notifications'
    }
  }

  // ─── Get Color Based on Channel ───────────────────────────────────────────
  const getNotificationColor = (channel: string) => {
    switch (channel?.toUpperCase()) {
      case 'SYSTEM':
        return '#2563EB'
      case 'PROMOTION':
        return '#F59E0B'
      case 'ORDER':
        return '#10B981'
      case 'PRICE_ALERT':
        return '#EF4444'
      case 'REFERRAL':
        return '#8B5CF6'
      default:
        return '#6B7280'
    }
  }

  // ─── Render Single Notification ───────────────────────────────────────────
  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const iconName = getNotificationIcon(item.channel)
    const color = getNotificationColor(item.channel)

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: item.is_read ? '#FFFFFF' : '#EFF6FF',
          borderWidth: 1,
          borderColor: item.is_read ? '#F3F4F6' : '#BFDBFE',
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}15`,
          }}
        >
          <Ionicons name={iconName as any} size={24} color={color} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: item.is_read ? '#6B7280' : '#1F2937' }}>
              {item.title}
            </Text>
            {!item.is_read && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />
            )}
          </View>
          <Text
            style={{ fontSize: 14, marginTop: 4, color: item.is_read ? '#9CA3AF' : '#4B5563' }}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
              {formatDate(item.created_at)}
            </Text>
            {item.cta_text && (
              <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>
                {item.cta_text} →
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // ─── Render Empty State ────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 }}>No Notifications</Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
        You're all caught up!{'\n'}
        We'll notify you when something arrives.
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9FB' }}>
      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 }}>
          <AppHeader
            left={() => <BackButton />}
            middle={() => <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937' }}>Notifications</Text>}
          />
        </View>

        {/* Header Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>All</Text>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#2563EB" />
              <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '500' }}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading notifications...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2563EB']}
                tintColor="#2563EB"
              />
            }
          >
            {notifications.length === 0 ? (
              renderEmpty()
            ) : (
              notifications.map((item) => (
                <View key={item.id}>
                  {renderNotification({ item })}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  )
}

export default Notification