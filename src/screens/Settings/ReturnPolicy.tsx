import React, { useState, useEffect } from 'react'
import { Text, View, ScrollView, ActivityIndicator, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'

const ReturnPolicy = () => {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    fetchReturnPolicy()
  }, [])

  const fetchReturnPolicy = async () => {
    try {
      setLoading(true)
      await AsyncStorage.getItem('vToken')

      const response = await axios.get(`${IPA_BASE}policy/return-policy/`, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.data?.success && response.data?.data) {
        setContent(response.data.data.content || 'No content available.')
        setLastUpdated(response.data.data.last_updated || '')
      } else {
        setContent('Unable to load return policy. Please try again later.')
      }
    } catch (error: any) {
      console.error('❌ Error fetching return policy:', error)
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to load return policy. Please try again.'
      )
      setContent('Unable to load return policy. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    // API sends "2026-05-25 11:28:39"; iOS won't parse that with the space.
    const date = new Date(dateString.replace(' ', 'T'))
    if (Number.isNaN(date.getTime())) return dateString
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <View className="bg-[#F9F9FB] flex-1">
      <View className="px-5 flex-1">
        {/* Header */}
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader
            left={() => <BackButton />}
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">Return Policy</Text>}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-gray-500 mt-4">Loading return policy...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="flex-1"
          >
            {/* Last Updated */}
            {lastUpdated && (
              <View className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100">
                <Text className="text-sm text-blue-600">
                  Last Updated: {formatDate(lastUpdated)}
                </Text>
              </View>
            )}

            {/* Content */}
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <Text className="text-base leading-6 text-gray-700" style={{ lineHeight: 24 }}>
                {content}
              </Text>
            </View>

            {/* Footer Note */}
            <View className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <Text className="text-xs text-gray-400 text-center">
                This return policy explains how returns and refunds are handled on DealNux.
                Individual seller policies may add to these terms.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  )
}

export default ReturnPolicy
