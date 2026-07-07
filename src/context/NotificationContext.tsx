// context/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'

type NotificationContextType = {
  unreadCount: number
  setUnreadCount: (count: number) => void
  refreshNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshNotifications: () => {},
})

export const useNotification = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('vToken')
      if (!token) return

      const response = await axios.get(
        `${IPA_BASE}notifications/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      if (response.data?.success && response.data?.data) {
        setUnreadCount(response.data.data.unread_count || 0)
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error)
    }
  }

  const refreshNotifications = () => {
    fetchUnreadCount()
  }

  useEffect(() => {
    fetchUnreadCount()

    // ✅ প্রতি 30 সেকেন্ডে refresh
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}