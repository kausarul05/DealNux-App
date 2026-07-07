// src/hooks/useGoogleAuth.ts
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { IPA_BASE, WEB_CLIENT_ID } from '@env';
import { useNavigation } from '@react-navigation/native';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // For Web Platform
      if (Platform.OS === 'web') {
        // Web এর জন্য আলাদা হ্যান্ডলিং
        window.open(
          `https://accounts.google.com/o/oauth2/v2/auth?client_id=${WEB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
            window.location.origin
          )}&response_type=code&scope=openid%20profile%20email`,
          '_blank'
        );
        return;
      }

      // For Mobile (iOS/Android)
      const redirectUri = makeRedirectUri({
        scheme: 'savvyshopper',
        path: 'auth/google',
      });

      console.log('🔗 Redirect URI:', redirectUri);
      console.log('🌐 Web Client ID:', WEB_CLIENT_ID);

      const authRequest = new AuthSession.AuthRequest({
        clientId: WEB_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: redirectUri,
        responseType: AuthSession.ResponseType.Token,
        // For Android - use code flow
        ...(Platform.OS === 'android' && {
          responseType: AuthSession.ResponseType.Code,
        }),
      });

      const result = await authRequest.promptAsync(discovery);

      console.log('📱 Auth Result:', result);

      if (result?.type === 'success') {
        let accessToken = result.params?.access_token;
        let idToken = result.params?.id_token;

        // Android এর জন্য code থেকে token নিতে হবে
        if (!accessToken && result.params?.code) {
          // Backend এ code পাঠান
          const tokenResponse = await axios.post(
            `${IPA_BASE}auth/google/exchange/`,
            {
              code: result.params.code,
              redirect_uri: redirectUri,
              client_id: WEB_CLIENT_ID,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          accessToken = tokenResponse.data?.access_token;
          idToken = tokenResponse.data?.id_token;
        }

        if (!accessToken && !idToken) {
          Alert.alert('Error', 'No access token received. Please try again.');
          return;
        }

        // Get user info from Google
        let userInfo;
        if (idToken) {
          // Parse ID token for user info
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          userInfo = {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          };
        } else {
          // Fetch user info using access token
          const userInfoResponse = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          userInfo = userInfoResponse.data;
        }

        console.log('👤 User Info:', userInfo);

        // Send to your backend
        const response = await axios.post(
          `${IPA_BASE}auth/google/`,
          {
            id_token: idToken,
            email: userInfo.email,
            name: userInfo.name,
            profile_picture: userInfo.picture,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = response.data;
        console.log('✅ Google login response:', data);

        if (data?.success === true) {
          // Store tokens
          await AsyncStorage.setItem('vToken', data.data.access);
          if (data.data.refresh) {
            await AsyncStorage.setItem('vRefreshToken', data.data.refresh);
          }
          if (data.data.user) {
            await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
          }

          // Navigate to MainTabs
          navigation.navigate('MainTabs' as never);
          return data;
        } else {
          Alert.alert('Login Failed', data?.message || 'Google login failed. Please try again.');
        }
      } else if (result?.type === 'error') {
        console.log('❌ Auth Error:', result.params);
        Alert.alert('Error', result.params?.error_description || 'Something went wrong');
      } else if (result?.type === 'cancel') {
        console.log('❌ Auth Cancelled by user');
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In Error:', error);
      Alert.alert('Error', error?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading };
};