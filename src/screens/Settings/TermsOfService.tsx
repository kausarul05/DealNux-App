// TermsOfService.tsx
import React, { useState, useEffect } from 'react'
import { Text, View, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'

const TermsOfService = () => {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    fetchTerms()
  }, [])

  const fetchTerms = async () => {
    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('vToken')
      
      const response = await axios.get(
        `${IPA_BASE}policy/terms-of-service/`,
        {
          headers: {
            // Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      console.log('📄 Terms Response:', response.data)

      if (response.data?.success && response.data?.data) {
        setContent(response.data.data.content || 'No content available.')
        setLastUpdated(response.data.data.last_updated || '')
      } else {
        setContent('Unable to load terms of service. Please try again later.')
      }
    } catch (error: any) {
      console.error('❌ Error fetching terms:', error)
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to load terms of service. Please try again.'
      )
      setContent('Unable to load terms of service. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <SafeAreaView className="bg-[#F9F9FB] flex-1">
      <View className="px-5 flex-1">
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader 
            left={() => <BackButton />} 
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">Terms of Service</Text>} 
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-gray-500 mt-4">Loading terms of service...</Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="flex-1"
          >
            {lastUpdated && (
              <View className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100">
                <Text className="text-sm text-blue-600">
                  Last Updated: {formatDate(lastUpdated)}
                </Text>
              </View>
            )}

            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <Text className="text-base leading-6 text-gray-700" style={{ lineHeight: 24 }}>
                {content}
              </Text>
            </View>

            <View className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <Text className="text-xs text-gray-400 text-center">
                By using DealNux, you agree to these terms and conditions.
                Please read them carefully.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  )
}

export default TermsOfService