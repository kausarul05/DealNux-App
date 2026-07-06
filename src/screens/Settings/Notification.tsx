// screens/Notification.tsx
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { Images } from '../../constants'

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

  // Fetch notifications
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
  }, [fetchNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  // Mark all as read
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

      console.log('✅ Mark all read:', response.data)

      if (response.data?.success) {
        // Update local state
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

  // Mark single notification as read
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

      // Update local state
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

  // Handle notification press
  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark as read
    if (!item.is_read) {
      await markAsRead(item.id)
    }

    // Handle deep link
    if (item.cta_link) {
      // Navigate based on the link
      // You can use navigation.navigate or Linking
      console.log('🔗 Navigate to:', item.cta_link)
      // Example: navigation.navigate(item.cta_link)
    }
  }

  // Format date
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

  // Get icon based on channel
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
      default:
        return 'notifications'
    }
  }

  // Get color based on channel
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
      default:
        return '#6B7280'
    }
  }

  // Render single notification
  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const iconName = getNotificationIcon(item.channel)
    const color = getNotificationColor(item.channel)

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
        className={`flex-row items-start gap-3 mb-3 p-4 rounded-2xl ${
          item.is_read ? 'bg-white' : 'bg-blue-50'
        } border ${item.is_read ? 'border-gray-100' : 'border-blue-100'}`}
      >
        {/* Icon */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Ionicons name={iconName as any} size={24} color={color} />
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className={`text-sm font-semibold ${item.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
              {item.title}
            </Text>
            {!item.is_read && (
              <View className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </View>
          <Text
            className={`text-sm mt-1 ${item.is_read ? 'text-gray-400' : 'text-gray-600'}`}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-xs text-gray-400">
              {formatDate(item.created_at)}
            </Text>
            {item.cta_text && (
              <Text className="text-xs text-blue-600 font-semibold">
                {item.cta_text} →
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // Render empty state
  const renderEmpty = () => (
    <View className="items-center justify-center py-16">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center">
        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-bold text-gray-700 mt-4">No Notifications</Text>
      <Text className="text-gray-400 text-center mt-2">
        You're all caught up! {'\n'}
        We'll notify you when something arrives.
      </Text>
    </View>
  )

  return (
    <SafeAreaView className="bg-[#F9F9FB] flex-1">
      <View className="px-5 flex-1">
        {/* Header */}
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader
            left={() => <BackButton />}
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">Notifications</Text>}
          />
        </View>

        {/* Header Actions */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-gray-700">All</Text>
            {unreadCount > 0 && (
              <View className="bg-blue-500 px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-bold">{unreadCount}</Text>
              </View>
            )}
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              className="flex-row items-center gap-1"
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#2563EB" />
              <Text className="text-sm text-blue-600 font-medium">Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading State */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-gray-500 mt-3">Loading notifications...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1"
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