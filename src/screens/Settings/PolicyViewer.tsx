// screens/Settings/PolicyViewer.tsx
//
// One generic policy screen for ALL of the website's legal/policy pages, so the
// app carries every legal tab the website has (Terms, Privacy, Seller, Payment,
// Return, Refund, Delivery, Exchange, Cookie, Pre-Order, Buyer Protection,
// Prohibited Products, Intellectual Property, Community Guidelines, ...).
//
// It takes { slug, title } route params and fetches `${IPA_BASE}policy/{slug}/`
// — the same backend endpoints the website and the existing policy screens use.
// This replaces having to hand-build a separate screen per policy.

import React, { useState, useEffect } from 'react'
import { Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import axios from 'axios'
import { IPA_BASE } from '@env'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { AuthStackParamList } from '../../Navigation/types'

const PolicyViewer = () => {
  const route = useRoute<RouteProp<AuthStackParamList, 'PolicyViewer'>>()
  const { slug, title } = route.params

  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    let active = true

    const fetchPolicy = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${IPA_BASE}policy/${slug}/`, {
          headers: { Accept: 'application/json' },
        })
        if (!active) return
        if (response.data?.success && response.data?.data) {
          setContent(response.data.data.content || 'No content available.')
          setLastUpdated(response.data.data.last_updated || '')
        } else {
          setContent(`Unable to load ${title.toLowerCase()}. Please try again later.`)
        }
      } catch (error: any) {
        console.error(`❌ Error fetching ${slug}:`, error?.response?.data || error?.message)
        if (active) setContent(`Unable to load ${title.toLowerCase()}. Please try again later.`)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchPolicy()
    return () => {
      active = false
    }
  }, [slug, title])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <View className="bg-[#F9F9FB] flex-1">
      <View className="px-5 flex-1">
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader
            left={() => <BackButton />}
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">{title}</Text>}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-gray-500 mt-4">Loading {title.toLowerCase()}...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="flex-1"
          >
            {lastUpdated && (
              <View className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100">
                <Text className="text-sm text-blue-600">Last Updated: {formatDate(lastUpdated)}</Text>
              </View>
            )}

            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <Text className="text-base leading-6 text-gray-700" style={{ lineHeight: 24 }}>
                {content}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  )
}

export default PolicyViewer
