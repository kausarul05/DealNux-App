// src/context/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { IPA_BASE } from '@env';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

type NotificationContextType = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshNotifications: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  // ✅ Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  // Register for push notifications - only in development builds or standalone
  const registerForPushNotifications = async () => {
    try {
      // Skip in Expo Go
      if (isExpoGo) {
        console.log('📱 Skipping push notification registration in Expo Go');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission denied');
        return;
      }

      // ✅ Get projectId from Constants
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                        Constants.manifest?.extra?.eas?.projectId ||
                        '';

      if (!projectId) {
        console.warn('⚠️ No projectId found for push notifications');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      console.log('📱 FCM Token:', token.data);

      const authToken = await AsyncStorage.getItem('vToken');
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
        );
        console.log('✅ FCM Token registered');
      }
    } catch (error) {
      console.warn('⚠️ Push notification registration skipped:', error);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('vToken');
      if (!token) return;

      const response = await axios.get(
        `${IPA_BASE}notifications/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (response.data?.success && response.data?.data) {
        setUnreadCount(response.data.data.unread_count || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
    }
  };

  const refreshNotifications = () => {
    fetchUnreadCount();
  };

  // Handle incoming notifications - only with valid listener
  const handleNotification = (notification: any) => {
    console.log('📬 Notification received:', notification);
    fetchUnreadCount();
  };

  useEffect(() => {
    // ✅ Only set up listeners if not in Expo Go
    if (!isExpoGo) {
      registerForPushNotifications();

      const subscription = Notifications.addNotificationReceivedListener(
        handleNotification
      );

      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handleNotification(response.notification);
        }
      );

      return () => {
        subscription.remove();
        responseSubscription.remove();
      };
    }
  }, [isExpoGo]);

  // ✅ Always fetch count on auth change
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('vToken');
      if (token) {
        fetchUnreadCount();
      }
    };
    checkToken();
  }, []);

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
  );
};