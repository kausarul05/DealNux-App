// hooks/useNotifications.ts
import { useEffect } from 'react'
import { Platform, Alert } from 'react-native'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'

export const useNotifications = () => {
  // Register for push notifications
  const registerForPushNotifications = async () => {
    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission denied')
        return
      }

      // Get FCM token
      const token = await Notifications.getExpoPushTokenAsync({
        experienceId: '@dealnux/dealnux-app',
      })

      console.log('📱 FCM Token:', token.data)

      // Send token to backend
      const authToken = await AsyncStorage.getItem('vToken')
      if (authToken) {
        await axios.post(
          `${IPA_BASE}notifications/device-token/`,
          { fcm_token: token.data },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        )
        console.log('✅ FCM Token registered')
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error)
    }
  }

  // Handle incoming notifications
  const handleNotification = (notification: any) => {
    const data = notification.data
    console.log('📬 Notification received:', data)

    // Handle deep link if present
    if (data?.cta_link) {
      // Navigate to the link
      // navigation.navigate(data.cta_link)
    }
  }

  useEffect(() => {
    registerForPushNotifications()

    // Set up notification listeners
    const subscription = Notifications.addNotificationReceivedListener(
      handleNotification
    )

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotification(response.notification)
      }
    )

    return () => {
      subscription.remove()
      responseSubscription.remove()
    }
  }, [])
}

// Use in App.tsx or root component
// import { useNotifications } from './hooks/useNotifications'
// useNotifications()