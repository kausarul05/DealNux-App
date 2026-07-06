// screens/AboutUs.tsx
import React, { useState, useEffect } from 'react'
import { 
    Text, 
    View, 
    ScrollView, 
    ActivityIndicator, 
    Alert,
    Image,
    Linking,
    TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { useNavigation } from '@react-navigation/native'

const AboutUs = () => {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const navigation = useNavigation()

  useEffect(() => {
    fetchAboutUs()
  }, [])

  const fetchAboutUs = async () => {
    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('vToken')
      
      const response = await axios.get(
        `${IPA_BASE}policy/about-us/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      console.log('📄 About Us Response:', response.data)

      if (response.data?.success && response.data?.data) {
        setContent(response.data.data.content || 'No content available.')
        setLastUpdated(response.data.data.last_updated || '')
      } else {
        setContent('Unable to load about us. Please try again later.')
      }
    } catch (error: any) {
      console.error('❌ Error fetching about us:', error)
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to load about us. Please try again.'
      )
      setContent('Unable to load about us. Please try again later.')
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
        {/* Header */}
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader 
            left={() => <BackButton />} 
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">About Us</Text>} 
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-gray-500 mt-4">Loading about us...</Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="flex-1"
          >
            {/* Logo / Brand Section */}
            <View className="items-center mb-6 mt-2">
              <View className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center border-2 border-blue-100">
                <Ionicons name="storefront" size={48} color="#2563EB" />
              </View>
              <Text className="text-2xl font-bold text-[#1F2937] mt-3">DealNux</Text>
              <Text className="text-sm text-gray-500">Your Smart Shopping Companion</Text>
            </View>

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

            {/* Mission Section */}
            <View className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons name="rocket-outline" size={20} color="#2563EB" />
                </View>
                <Text className="text-lg font-bold text-[#1F2937]">Our Mission</Text>
              </View>
              <Text className="text-sm text-gray-600 leading-6">
                To empower shoppers with intelligent price comparison and deal discovery, 
                making smart shopping accessible to everyone.
              </Text>
            </View>

            {/* Values Section */}
            <View className="mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <Text className="text-lg font-bold text-[#1F2937] mb-4">Our Values</Text>
              <View className="gap-4">
                <View className="flex-row items-start gap-3">
                  <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                    <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">Trust & Transparency</Text>
                    <Text className="text-sm text-gray-500">Honest pricing and clear policies</Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center">
                    <Ionicons name="bulb-outline" size={16} color="#7C3AED" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">Innovation</Text>
                    <Text className="text-sm text-gray-500">AI-powered deal discovery</Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                    <Ionicons name="heart-outline" size={16} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">Customer First</Text>
                    <Text className="text-sm text-gray-500">Your satisfaction is our priority</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Button */}
            <TouchableOpacity 
              className="mt-6 rounded-2xl overflow-hidden"
              onPress={() => navigation.navigate('contactus')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                className="py-4 px-6 flex-row items-center justify-center gap-3"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="mail-outline" size={20} color="white" />
                <Text className="text-white font-semibold text-base">Contact Us</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer Note */}
            <View className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <Text className="text-xs text-gray-400 text-center">
                © 2024 DealNux. All rights reserved. Made with ❤️
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  )
}

export default AboutUs