// screens/ContactUs.tsx
import React, { useState } from 'react'
import {
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

const ContactUs = () => {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ticketId, setTicketId] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    subject: '',
    message: '',
  })

  const [errors, setErrors] = useState({
    full_name: '',
    email: '',
    subject: '',
    message: '',
  })

  const validate = () => {
    const newErrors = { full_name: '', email: '', subject: '', message: '' }
    let isValid = true

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
      isValid = false
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required'
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email'
      isValid = false
    }

    if (!form.subject.trim()) {
      newErrors.subject = 'Subject is required'
      isValid = false
    }

    if (!form.message.trim()) {
      newErrors.message = 'Message is required'
      isValid = false
    } else if (form.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('vToken')

      const response = await axios.post(
        `${IPA_BASE}policy/contact/send/`,
        {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('📧 Contact response:', response.data)

      if (response.data?.ticket_id) {
        setTicketId(response.data.ticket_id)
        setSuccess(true)
        setForm({ full_name: '', email: '', subject: '', message: '' })
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.')
      }
    } catch (error: any) {
      console.error('❌ Contact error:', error?.response?.data || error)
      Alert.alert(
        'Error',
        error?.response?.data?.detail || 'Failed to send message. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSuccess(false)
    setTicketId('')
    setForm({ full_name: '', email: '', subject: '', message: '' })
    setErrors({ full_name: '', email: '', subject: '', message: '' })
  }

  return (
    <SafeAreaView className="bg-[#F9F9FB] flex-1">
      <View className="px-5 flex-1">
        {/* Header */}
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader
            left={() => <BackButton />}
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">Contact Us</Text>}
          />
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {success ? (
            // Success View
            <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
              <View className="flex-1 items-center justify-center py-10">
                <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
                  <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
                </View>
                <Text className="text-2xl font-bold text-[#1F2937] mb-2">Message Sent!</Text>
                <Text className="text-center text-gray-500 mb-2">
                  Thank you for reaching out. We'll get back to you within one business day.
                </Text>
                {ticketId && (
                  <View className="bg-blue-50 px-6 py-3 rounded-xl mt-3 border border-blue-100">
                    <Text className="text-sm text-blue-600 font-semibold">
                      Ticket ID: {ticketId}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  className="mt-8 bg-[#2563EB] px-8 py-4 rounded-xl"
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-semibold text-base">Send Another Message</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            // Form View
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              className="flex-1"
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-6">
                <Text className="text-xl font-bold text-[#1F2937]">Get in Touch</Text>
                <Text className="text-gray-500 mt-1">
                  Have questions or feedback? We'd love to hear from you!
                </Text>
              </View>

              {/* Form Fields */}
              <View className="gap-4">
                {/* Full Name */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Full Name <Text className="text-red-500">*</Text>
                  </Text>
                  <View className={`flex-row items-center bg-white rounded-xl border ${errors.full_name ? 'border-red-500' : 'border-gray-200'} px-4`}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      className="flex-1 py-3 px-3 text-gray-800"
                      placeholder="John Doe"
                      placeholderTextColor="#9CA3AF"
                      value={form.full_name}
                      onChangeText={(text) => {
                        setForm({ ...form, full_name: text })
                        if (errors.full_name) setErrors({ ...errors, full_name: '' })
                      }}
                    />
                  </View>
                  {errors.full_name && (
                    <Text className="text-red-500 text-xs mt-1">{errors.full_name}</Text>
                  )}
                </View>

                {/* Email */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Email Address <Text className="text-red-500">*</Text>
                  </Text>
                  <View className={`flex-row items-center bg-white rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} px-4`}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      className="flex-1 py-3 px-3 text-gray-800"
                      placeholder="john@example.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.email}
                      onChangeText={(text) => {
                        setForm({ ...form, email: text })
                        if (errors.email) setErrors({ ...errors, email: '' })
                      }}
                    />
                  </View>
                  {errors.email && (
                    <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
                  )}
                </View>

                {/* Subject */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Subject <Text className="text-red-500">*</Text>
                  </Text>
                  <View className={`flex-row items-center bg-white rounded-xl border ${errors.subject ? 'border-red-500' : 'border-gray-200'} px-4`}>
                    <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      className="flex-1 py-3 px-3 text-gray-800"
                      placeholder="What is this about?"
                      placeholderTextColor="#9CA3AF"
                      value={form.subject}
                      onChangeText={(text) => {
                        setForm({ ...form, subject: text })
                        if (errors.subject) setErrors({ ...errors, subject: '' })
                      }}
                    />
                  </View>
                  {errors.subject && (
                    <Text className="text-red-500 text-xs mt-1">{errors.subject}</Text>
                  )}
                </View>

                {/* Message */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Message <Text className="text-red-500">*</Text>
                  </Text>
                  <View className={`bg-white rounded-xl border ${errors.message ? 'border-red-500' : 'border-gray-200'} p-4`}>
                    <TextInput
                      className="text-gray-800"
                      placeholder="Write your message here..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      style={{ minHeight: 120 }}
                      value={form.message}
                      onChangeText={(text) => {
                        setForm({ ...form, message: text })
                        if (errors.message) setErrors({ ...errors, message: '' })
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-red-500 text-xs">{errors.message}</Text>
                    <Text className="text-gray-400 text-xs">
                      {form.message.length}/500
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Support Info */}
              <View className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <Text className="text-sm text-blue-700 font-semibold mb-2">💡 Quick Support</Text>
                <Text className="text-sm text-gray-600">
                  Response time: Within 1 business day
                </Text>
                <Text className="text-sm text-gray-600">
                  For urgent issues, please call our support team.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className="mt-6 rounded-2xl overflow-hidden"
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#9CA3AF', '#6B7280'] : ['#2563EB', '#1D4ED8']}
                  className="py-4 flex-row items-center justify-center gap-3"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="white" />
                      <Text className="text-white font-semibold text-base">Sending...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={20} color="white" />
                      <Text className="text-white font-semibold text-base">Send Message</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  )
}

export default ContactUs