// screens/AppReview.tsx
import React, { useState, useEffect } from 'react'
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
  FlatList,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { IPA_BASE } from '@env'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'

type Review = {
  id: number
  rating: number
  comment: string
  user_name: string
  created_at: string
  updated_at: string
}

const AppReview = () => {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState({ rating: '', comment: '' })

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('vToken')

      const response = await axios.get(
        `${IPA_BASE}policy/review/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      console.log('📊 Reviews Response:', response.data)

      if (response.data?.success && response.data?.data) {
        const reviewsData = response.data.data
        setReviews(reviewsData)

        // Calculate average rating
        if (reviewsData.length > 0) {
          const total = reviewsData.reduce((sum: number, r: Review) => sum + r.rating, 0)
          setAverageRating(total / reviewsData.length)
          setTotalReviews(reviewsData.length)
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching reviews:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchReviews()
  }

  // Submit review
  const handleSubmit = async () => {
    // Validate
    let isValid = true
    const newErrors = { rating: '', comment: '' }

    if (rating === 0) {
      newErrors.rating = 'Please select a rating'
      isValid = false
    }

    if (!comment.trim()) {
      newErrors.comment = 'Please write a comment'
      isValid = false
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Comment must be at least 10 characters'
      isValid = false
    }

    setErrors(newErrors)

    if (!isValid) return

    try {
      setSubmitting(true)
      const token = await AsyncStorage.getItem('vToken')
        console.log("xxxxxxxxxxx")

      const response = await axios.post(
        `${IPA_BASE}policy/review/`,
        {
          rating: rating,
          comment: comment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )
      console.log("uuuuuuuuuuuu")
      console.log('✅ Review submitted:', response)

      if (response.data?.success) {
        Alert.alert(
          '🎉 Thank You!',
          'Your review has been submitted successfully.',
          [{ text: 'OK' }]
        )

        // Reset form and refresh
        setRating(0)
        setComment('')
        setErrors({ rating: '', comment: '' })
        fetchReviews()
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to submit review.')
      }
    } catch (error: any) {
      console.error('❌ Submit review error:', error)
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit review. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Render stars
  const renderStars = (rating: number, interactive = false) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => interactive && setRating(i)}
          disabled={!interactive}
          activeOpacity={0.7}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={interactive ? 36 : 20}
            color={i <= rating ? '#F59E0B' : '#D1D5DB'}
            style={{ marginHorizontal: interactive ? 4 : 2 }}
          />
        </TouchableOpacity>
      )
    }
    return stars
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Render review item
  const renderReviewItem = ({ item }: { item: Review }) => (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-blue-600 font-bold">
              {item.user_email?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text className="font-semibold text-gray-800">{item.user_email || 'Anonymous'}</Text>
            <Text className="text-xs text-gray-400">{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View className="flex-row">
          {renderStars(item.rating)}
        </View>
      </View>
      <Text className="text-gray-600 mt-1 leading-5">{item.comment}</Text>
    </View>
  )

  return (
    <SafeAreaView className="bg-[#F9F9FB] flex-1">
      <View className="px-5 flex-1">
        {/* Header */}
        <View className="flex-row items-center gap-4 py-2">
          <AppHeader
            left={() => <BackButton />}
            middle={() => <Text className="text-lg font-semibold text-[#1F2937]">App Review</Text>}
          />
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
            }
          >
            {/* Rating Summary */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-gray-500">Average Rating</Text>
                  <Text className="text-3xl font-bold text-[#1F2937]">
                    {averageRating ? averageRating.toFixed(1) : '0.0'}
                  </Text>
                </View>
                <View className="flex-row">
                  {renderStars(Math.round(averageRating))}
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <Text className="text-sm text-gray-500">
                  {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </Text>
                <TouchableOpacity onPress={onRefresh} className="flex-row items-center gap-1">
                  <Ionicons name="refresh-outline" size={16} color="#2563EB" />
                  <Text className="text-sm text-blue-600">Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Write Review Section */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              <Text className="text-lg font-bold text-[#1F2937] mb-2">Write a Review</Text>
              <Text className="text-sm text-gray-500 mb-4">
                Share your experience with DealNux
              </Text>

              {/* Rating Stars */}
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Your Rating <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center justify-center py-2">
                  {renderStars(rating, true)}
                </View>
                {errors.rating && (
                  <Text className="text-red-500 text-xs text-center mt-1">{errors.rating}</Text>
                )}
              </View>

              {/* Comment */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Your Review <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-gray-50 rounded-xl border ${errors.comment ? 'border-red-500' : 'border-gray-200'} p-3`}>
                  <TextInput
                    className="text-gray-800"
                    placeholder="Write your review here..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{ minHeight: 100 }}
                    value={comment}
                    onChangeText={(text) => {
                      setComment(text)
                      if (errors.comment) setErrors({ ...errors, comment: '' })
                    }}
                  />
                </View>
                <View className="flex-row justify-between mt-1">
                  {errors.comment ? (
                    <Text className="text-red-500 text-xs">{errors.comment}</Text>
                  ) : (
                    <Text className="text-gray-400 text-xs">
                      Minimum 10 characters
                    </Text>
                  )}
                  <Text className="text-gray-400 text-xs">
                    {comment.length}/500
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className="rounded-2xl overflow-hidden"
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={submitting ? ['#9CA3AF', '#6B7280'] : ['#2563EB', '#1D4ED8']}
                  className="py-4 flex-row items-center justify-center gap-3"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {submitting ? (
                    <>
                      <ActivityIndicator color="white" />
                      <Text className="text-white font-semibold text-base">Submitting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={20} color="white" />
                      <Text className="text-white font-semibold text-base">Submit Review</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* All Reviews */}
            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="text-gray-500 mt-3">Loading reviews...</Text>
              </View>
            ) : reviews.length > 0 ? (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-bold text-[#1F2937]">All Reviews</Text>
                  <Text className="text-sm text-gray-500">{reviews.length} reviews</Text>
                </View>
                <FlatList
                  data={reviews}
                  renderItem={renderReviewItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <View className="items-center justify-center py-10 bg-white rounded-2xl border border-gray-100">
                <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 font-medium">No reviews yet</Text>
                <Text className="text-gray-400 text-sm">Be the first to review!</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  )
}

export default AppReview