// screens/Notification.tsx - Updated with Navigation Support
import React, { useState, useEffect, useCallback, useRef } from 'react'
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
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native'
import { AuthStackParamList } from '../../Navigation/types'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useNotification } from '../../context/NotificationContext'

const CLEAR_ALL_ENDPOINT = `${IPA_BASE}notifications/delete-all/`

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
  // Sent by some notification types instead of a cta_link. Optional because the
  // list endpoint does not always include them.
  product_id?: number | string | null
  product?: number | string | { id?: number | string } | null
}

// Product links have arrived in a few shapes depending on which service built
// the notification, so match all of them rather than only "/product/:id".
const PRODUCT_LINK_PATTERNS = [
  /\/products?\/(\d+)/i,
  /\/product-details?\/(\d+)/i,
  /\/deals?\/(\d+)/i,
  /[?&]product_id=(\d+)/i,
  /[?&]productId=(\d+)/i,
]

// Pulls a product id out of a notification, from either an explicit id field or
// the cta_link. Returns null when the notification is not product-related.
const resolveProductId = (item: NotificationItem): number | null => {
  const direct =
    item.product_id ??
    (typeof item.product === 'object' ? item.product?.id : item.product)

  if (direct != null && String(direct).trim() !== '') {
    const parsed = Number(direct)
    if (Number.isFinite(parsed)) return parsed
  }

  const link = item.cta_link?.trim()
  if (!link) return null

  for (const pattern of PRODUCT_LINK_PATTERNS) {
    const match = link.match(pattern)
    if (match) return parseInt(match[1], 10)
  }

  return null
}

const Notification = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const hasUnreadRef = useRef(false)
  // The badge in BrandHeader reads this same context, so writing here keeps the
  // bell and this screen in sync instead of drifting until the 30s poll.
  const { unreadCount, setUnreadCount } = useNotification()

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
      setLoadError(null)
      const token = await AsyncStorage.getItem('vToken')

      if (!token) {
        setLoadError('You need to be signed in to see notifications.')
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

      // console.log('📬 Notifications Response:', JSON.stringify(response.data))

      const body = response.data?.data ?? response.data

      // The list has appeared under a few different keys, so accept any of them
      // rather than silently falling back to [] and showing "No Notifications".
      const list: NotificationItem[] = Array.isArray(body)
        ? body
        : body?.notifications ?? body?.results ?? body?.items ?? []

      setNotifications(list)

      // The server's counter is authoritative - the list is paginated, so
      // counting unread items here would miss anything past the first page.
      setUnreadCount(body?.unread_count ?? list.filter(n => !n.is_read).length)
    } catch (error: any) {
      console.error('❌ Error fetching notifications:', error)
      // Without this the screen renders "No Notifications", which looks
      // identical to an empty inbox and hides expired tokens / network errors.
      const status = error?.response?.status
      setLoadError(
        status === 401
          ? 'Your session expired. Please sign in again.'
          : 'Could not load notifications. Pull down to retry.',
      )
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

  // Keep a ref of the unread state so the blur handler below can read it
  // without re-subscribing every time the list changes.
  useEffect(() => {
    hasUnreadRef.current = notifications.some(item => !item.is_read)
  }, [notifications])

  // Mark everything read when LEAVING the screen, not when arriving - that way
  // new notifications stay highlighted the whole time the user is reading them,
  // and the bell is clear by the time they are back.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (hasUnreadRef.current) {
          hasUnreadRef.current = false
          markAllAsRead()
        }
      }
    }, []),
  )

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
  //     Only ever runs on leaving the screen, so it never alerts the user.
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
    }
  }

  // ─── Clear All ─────────────────────────────────────────────────────────────
  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear notifications',
      'This removes every notification from your list. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearing(true)
              const token = await AsyncStorage.getItem('vToken')
              if (!token) return

              const response = await axios.delete(CLEAR_ALL_ENDPOINT, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                },
              })

              if (response.data?.success !== false) {
                setNotifications([])
                setUnreadCount(0)
              }
            } catch (error: any) {
              console.error('❌ Error clearing notifications:', error)
              Alert.alert('Error', 'Failed to clear notifications. Please try again.')
            } finally {
              setClearing(false)
            }
          },
        },
      ],
    )
  }

  // ─── ✅ Handle Notification Press ──────────────────────────────────────────
  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id)
    }

    // Product notifications win over every other route - this is the whole
    // point of tapping one. Works from an id field or any cta_link shape.
    const productId = resolveProductId(item)
    if (productId != null) {
      navigation.navigate('ProductDetails', { productId })
      return
    }

    const link = item.cta_link?.trim()

    if (link) {
      // Check if it's an order link
      if (/\/orders?\/(\d+)/i.test(link)) {
        navigation.navigate('MyOrders' as never)
        return
      }

      // For external links, open in browser
      if (link.startsWith('http')) {
        try {
          const supported = await Linking.canOpenURL(link)
          if (supported) {
            await Linking.openURL(link)
          }
        } catch (error) {
          console.error('Error opening link:', error)
        }
        return
      }

      // Last resort: treat the link as a screen name, but only if it really is
      // one. Passing an unknown route to navigate() throws and leaves the user
      // on a dead tap with no feedback.
      const screenName = link.replace(/^\//, '')
      const routeNames = (navigation.getState()?.routeNames ?? []) as string[]
      const isKnownScreen = routeNames.includes(screenName)

      if (isKnownScreen) {
        // Dynamic route name - cannot be checked statically.
        ;(navigation as any).navigate(screenName)
      } else {
        // console.log('⚠️ Unrecognised cta_link, showing details instead:', item.cta_link)
        Alert.alert(item.title, item.body)
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

  // ─── Render Error State ────────────────────────────────────────────────────
  const renderError = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 }}>
        Couldn't load
      </Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
        {loadError}
      </Text>
      <TouchableOpacity
        onPress={fetchNotifications}
        style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#2563EB' }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Try again</Text>
      </TouchableOpacity>
    </View>
  )

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
            <TouchableOpacity
              onPress={clearAllNotifications}
              disabled={clearing}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: clearing ? 0.5 : 1 }}
            >
              {clearing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              )}
              <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: '500' }}>Clear all</Text>
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
            {loadError ? (
              renderError()
            ) : notifications.length === 0 ? (
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