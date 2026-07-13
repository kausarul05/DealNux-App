// screens/Notification.tsx - Updated with Navigation Support
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
import { useNavigation } from '@react-navigation/native'
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
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // ─── Register Device Token ──────────────────────────────────────────────
  const registerDeviceToken = async () => {
    try {
      const token = await AsyncStorage.getItem('vToken')
      if (!token) return

      const isExpoGo = Constants.appOwnership === 'expo'
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') return

      let fcmToken
      
      if (isExpoGo) {
        fcmToken = await Notifications.getExpoPushTokenAsync()
      } else {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                          Constants.manifest?.extra?.eas?.projectId || ''
        if (!projectId) return
        fcmToken = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })
      }

      await axios.post(
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
    } catch (error: any) {
      // Silent fail
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
    setTimeout(() => {
      registerDeviceToken()
    }, 2000)
  }, [fetchNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  // ─── Mark Single as Read ──────────────────────────────────────────────────
  const markAsRead = async (notificationId: number) => {
    try {
      const token = await AsyncStorage.getItem('vToken')
      if (!token) return

      await axios.post(
        `${IPA_BASE}notifications/notifications/${notificationId}/read/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      setNotifications(prev =>
        prev.map(item =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('❌ Error marking as read:', error)
    }
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

  // ─── ✅ Handle Notification Press ──────────────────────────────────────────
  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark as read
    // if (!item.is_read) {
    //   await markAsRead(item.id)
    // }

    // ✅ Handle deep link / navigation
    if (item.cta_link) {
      // Check if it's a product link
      const productMatch = item.cta_link.match(/\/product\/(\d+)/)
      if (productMatch) {
        const productId = parseInt(productMatch[1])
        navigation.navigate('ProductDetails', { 
          productId: productId 
        } as never)
        return
      }

      // Check if it's a deal link
      const dealMatch = item.cta_link.match(/\/deal\/(\d+)/)
      if (dealMatch) {
        const dealId = parseInt(dealMatch[1])
        // Navigate to deal or product details
        navigation.navigate('ProductDetails', { 
          productId: dealId 
        } as never)
        return
      }

      // Check if it's an order link
      const orderMatch = item.cta_link.match(/\/order\/(\d+)/)
      if (orderMatch) {
        const orderId = parseInt(orderMatch[1])
        navigation.navigate('MyOrders' as never)
        return
      }

      // For external links, open in browser
      if (item.cta_link.startsWith('http')) {
        try {
          const supported = await Linking.canOpenURL(item.cta_link)
          if (supported) {
            await Linking.openURL(item.cta_link)
          }
        } catch (error) {
          console.error('Error opening link:', error)
        }
        return
      }

      // For internal navigation with product ID in query params
      const queryMatch = item.cta_link.match(/product_id=(\d+)/)
      if (queryMatch) {
        const productId = parseInt(queryMatch[1])
        navigation.navigate('ProductDetails', { 
          productId: productId 
        } as never)
        return
      }

      // Default: try to navigate directly
      try {
        navigation.navigate(item.cta_link as never)
      } catch (error) {
        console.log('Cannot navigate to:', item.cta_link)
        // If navigation fails, try to open as URL
        if (item.cta_link.startsWith('http')) {
          await Linking.openURL(item.cta_link)
        }
      }
    } else {
      // If no link, just show the notification details
      Alert.alert(item.title, item.body)
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
      case 'SYSTEM': return 'information-circle'
      case 'PROMOTION': return 'megaphone'
      case 'ORDER': return 'cube'
      case 'PRICE_ALERT': return 'pricetag'
      case 'REFERRAL': return 'gift'
      case 'PRODUCT': return 'cart'
      case 'DEAL': return 'pricetag'
      default: return 'notifications'
    }
  }

  // ─── Get Color Based on Channel ───────────────────────────────────────────
  const getNotificationColor = (channel: string) => {
    switch (channel?.toUpperCase()) {
      case 'SYSTEM': return '#2563EB'
      case 'PROMOTION': return '#F59E0B'
      case 'ORDER': return '#10B981'
      case 'PRICE_ALERT': return '#EF4444'
      case 'REFERRAL': return '#8B5CF6'
      case 'PRODUCT': return '#2355B6'
      case 'DEAL': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  // ─── Render Single Notification ───────────────────────────────────────────
  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const iconName = getNotificationIcon(item.channel)
    const color = getNotificationColor(item.channel)

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>
                  {item.cta_text}
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#2563EB" />
              </View>
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
    <View style={{ flex: 1, backgroundColor: '#F9F9FB' }}>
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
    </View>
  )
}

export default Notification