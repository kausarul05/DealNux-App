// src/hooks/useAppleAuth.ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { IPA_BASE } from '@env';
import { useNavigation } from '@react-navigation/native';

export const useAppleAuth = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const signInWithApple = async () => {
    try {
      setLoading(true);

      if (Platform.OS !== 'ios') {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is available on iOS only.');
        return;
      }

      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('Apple Sign-In', 'Apple Sign-In is not available on this device.');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        Alert.alert('Apple Sign-In', 'identityToken not found. Please try again.');
        return;
      }

      console.log('✅ Apple credential:', credential);

      // Send token to your backend
      const response = await axios.post(
        `${IPA_BASE}auth/apple/`,
        {
          identity_token: identityToken,
          email: credential.email || '',
          name: credential.fullName?.givenName 
            ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}` 
            : '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      console.log('✅ Apple login response:', data);

      if (data?.success === true) {
        // Store tokens
        await AsyncStorage.setItem('vToken', data.data.access);
        if (data.data.refresh) {
          await AsyncStorage.setItem('vRefreshToken', data.data.refresh);
        }
        if (data.data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
        }

        navigation.navigate('MainTabs' as never);
        return data;
      } else {
        Alert.alert('Login Failed', data?.message || 'Apple login failed. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Apple Sign-In Error:', error);
      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Error', error?.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return { signInWithApple, loading };
};