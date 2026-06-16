import { CART_PRODUCT, CART_REMOVE, CART_UPDATE, IPA_BASE } from '@env'
import { MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native'
import axios from 'axios'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  DimensionValue,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthStackParamList } from '../../Navigation/types'
import CartProductCard from '../../components/CartProductCard'
import { Images } from '../../constants'

const API_BASE_URL = IPA_BASE

const API_ENDPOINTS = {
  CART_UPDATE,
  CART_REMOVE,
}

type CartListing = {
  id: number
  platform_name: string
  platform_code: string
  price: string
  currency: string
  original_price: string | null
  discount_percentage: string | null
  condition: string
  free_shipping: boolean
  shipping_cost: string
  total_price: number
  external_url: string
  is_available: boolean
  has_coupon?: boolean
  coupon_text?: string
  deal_badge?: string
  is_best_seller?: boolean
}

type CartItem = {
  id: number
  product: number
  product_title: string
  product_image: string
  quantity: number
  listing: CartListing
}

type CartSummary = {
  total_platforms: number
  total_items: number
  total_price: number
  currency: string
}

type CartApiData = {
  summary: CartSummary
  platforms: Record<string, CartItem[]>
}

type CartUiItem = CartItem & {
  selectedQty: number
}

type CartPlatformsState = Record<string, CartUiItem[]>

type CouponState = {
  expanded: boolean
  code: string
  applied: boolean
  applying: boolean
  message: string
  discountAmount: number
}

type CouponMapState = Record<string, CouponState>

const DEFAULT_COUPON_STATE: CouponState = {
  expanded: false,
  code: '',
  applied: false,
  applying: false,
  message: '',
  discountAmount: 0,
}

const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#F3F4F6"/>
  <rect x="110" y="120" width="280" height="220" rx="22" fill="#E5E7EB"/>
  <circle cx="190" cy="200" r="28" fill="#CBD5E1"/>
  <path d="M135 305 L220 235 L280 285 L320 250 L365 305 Z" fill="#CBD5E1"/>
  <text x="50%" y="395" text-anchor="middle" fill="#94A3B8" font-size="30" font-family="Arial, sans-serif">
    No Image
  </text>
</svg>
`)}`

const SkeletonBlock = ({
  height,
  width = '100%',
  className = '',
}: {
  height: number
  width?: DimensionValue
  className?: string
}) => {
  return <View className={`bg-[#E9EDF3] rounded-2xl ${className}`} style={{ height, width }} />
}

const CartSectionSkeleton = () => {
  return (
    <View className="border-2 border-[#E5E7EB] rounded-3xl mt-5 overflow-hidden bg-white">
      <View className="px-4 py-4 border-b-2 border-[#E5E7EB] items-center">
        <SkeletonBlock height={30} width={180} />
      </View>

      <View className="p-4">
        {[1, 2].map(item => (
          <View
            key={item}
            className={`border border-[#EEF1F5] rounded-3xl p-4 ${item > 1 ? 'mt-4' : ''}`}
          >
            <View className="flex-row">
              <SkeletonBlock height={92} width={92} className="rounded-2xl" />
              <View className="flex-1 ml-4">
                <SkeletonBlock height={18} width="80%" />
                <SkeletonBlock height={14} width="45%" className="mt-3" />
                <SkeletonBlock height={14} width="35%" className="mt-2" />
                <View className="flex-row items-center justify-between mt-4">
                  <SkeletonBlock height={16} width={90} />
                  <SkeletonBlock height={34} width={110} className="rounded-xl" />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className="px-6 py-4 bg-[#36405305]">
        <View className="flex-row items-center justify-between">
          <SkeletonBlock height={18} width={140} />
          <SkeletonBlock height={24} width={100} />
        </View>
      </View>
    </View>
  )
}

const SummarySkeleton = () => {
  return (
    <View className="bg-white border-2 border-[#E5E7EB] rounded-3xl p-5 mt-5">
      <View className="flex-row items-center justify-between mb-3">
        <SkeletonBlock height={16} width={90} />
        <SkeletonBlock height={16} width={40} />
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <SkeletonBlock height={16} width={60} />
        <SkeletonBlock height={16} width={40} />
      </View>

      <View className="flex-row items-center justify-between">
        <SkeletonBlock height={22} width={70} />
        <SkeletonBlock height={28} width={120} />
      </View>
    </View>
  )
}

const Cart = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>()

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [cartData, setCartData] = useState<CartApiData | null>(null)
  const [platformItems, setPlatformItems] = useState<CartPlatformsState>({})
  const [qtyLoadingMap, setQtyLoadingMap] = useState<Record<string, boolean>>({})
  const [deleteLoadingMap, setDeleteLoadingMap] = useState<Record<string, boolean>>({})
  const [couponMap, setCouponMap] = useState<CouponMapState>({})
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const getPlatformLogo = (platformName?: string) => {
    const name = platformName?.toLowerCase()?.trim() ?? ''

    if (name.includes('amazon')) return Images.Amazon
    if (name.includes('walmart')) return Images.Wallmart
    if (name.includes('aliexpress')) return Images.Aliexpress
    if (name.includes('bestbuy') || name.includes('best buy')) return Images.BestBuy

    return null
  }

  const toNumber = (value: unknown, fallback = 0) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  const formatMoney = (amount: number, currency = 'USD') => {
    const normalizedCurrency = currency?.toUpperCase?.() || 'USD'
    return `${normalizedCurrency === 'USD' ? '$' : `${normalizedCurrency} `}${amount.toFixed(2)}`
  }

  const getItemKey = (platformName: string, itemId: number, listingId: number) =>
    `${platformName}_${itemId}_${listingId}`

  const getPlatformKey = (platformName: string) => platformName.trim().toLowerCase()

  const getCouponState = (platformName: string): CouponState => {
    return couponMap[getPlatformKey(platformName)] ?? DEFAULT_COUPON_STATE
  }

  const updateCouponState = (
    platformName: string,
    updater: (prev: CouponState) => CouponState
  ) => {
    const platformKey = getPlatformKey(platformName)

    setCouponMap(prev => ({
      ...prev,
      [platformKey]: updater(prev[platformKey] ?? DEFAULT_COUPON_STATE),
    }))
  }

  const ensureCouponStateFromApi = (data: CartApiData | null) => {
    if (!data?.platforms) return

    setCouponMap(prev => {
      const next = { ...prev }

      Object.keys(data.platforms).forEach(platformName => {
        const key = getPlatformKey(platformName)

        if (!next[key]) {
          next[key] = DEFAULT_COUPON_STATE
        }
      })

      return next
    })
  }

  const normalizeImageUrl = (imagePath?: string | null) => {
    if (!imagePath || !String(imagePath).trim()) {
      return PLACEHOLDER_IMAGE
    }

    const cleaned = String(imagePath).trim()

    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:image')) {
      return cleaned
    }

    const base = String(API_BASE_URL || '').trim()

    if (!base) {
      return PLACEHOLDER_IMAGE
    }

    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base

    return `${normalizedBase}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`
  }

  const buildUiState = (data: CartApiData): CartPlatformsState => {
    const nextState: CartPlatformsState = {}

    Object.entries(data?.platforms ?? {}).forEach(([platformName, items]) => {
      nextState[platformName] = (items ?? []).map(item => ({
        ...item,
        selectedQty: Math.max(1, toNumber(item.quantity, 1)),
      }))
    })

    return nextState
  }

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true)

      const token = await AsyncStorage.getItem('vToken')

      if (!token) {
        setCartData(null)
        setPlatformItems({})
        return
      }

      const res = await axios.get(`${API_BASE_URL}${CART_PRODUCT}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      const apiData: CartApiData | null = res?.data?.data ?? null

      setCartData(apiData)
      setPlatformItems(apiData ? buildUiState(apiData) : {})
      ensureCouponStateFromApi(apiData)
    } catch (error) {
      console.error('cart fetch error', error)
      setCartData(null)
      setPlatformItems({})
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchCart()
    }, [fetchCart])
  )

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      await fetchCart()
    } catch {
      setRefreshing(false)
    }
  }

  const updateLocalQty = (
    platformName: string,
    itemId: number,
    listingId: number,
    nextQty: number
  ) => {
    setPlatformItems(prev => {
      const platformList = prev[platformName] ?? []

      return {
        ...prev,
        [platformName]: platformList.map(item => {
          if (!(item.id === itemId && item.listing.id === listingId)) return item

          return {
            ...item,
            selectedQty: Math.max(1, nextQty),
          }
        }),
      }
    })
  }

  const cleanEmptyPlatforms = (prev: CartPlatformsState) => {
    const cleaned: CartPlatformsState = {}

    Object.entries(prev).forEach(([platformName, items]) => {
      if (items.length > 0) {
        cleaned[platformName] = items
      }
    })

    return cleaned
  }

  const handleDecreaseQuantity = async (platformName: string, item: CartUiItem) => {
    const itemKey = getItemKey(platformName, item.id, item.listing.id)

    if (item.selectedQty <= 1) return

    const previousQty = item.selectedQty
    const nextQty = previousQty - 1

    updateLocalQty(platformName, item.id, item.listing.id, nextQty)

    try {
      setQtyLoadingMap(prev => ({ ...prev, [itemKey]: true }))

      const token = await AsyncStorage.getItem('vToken')
      if (!token) return

      const formData = new FormData()
      formData.append('product', String(item.product))
      formData.append('quantity', String(nextQty))

      await axios.put(
        `${API_BASE_URL}${API_ENDPOINTS.CART_UPDATE}${item.id}/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      await fetchCart()
    } catch (error: any) {
      console.error('decrease qty error', error?.response?.data || error)
      updateLocalQty(platformName, item.id, item.listing.id, previousQty)
    } finally {
      setQtyLoadingMap(prev => ({ ...prev, [itemKey]: false }))
    }
  }

  const handleIncreaseQuantity = async (platformName: string, item: CartUiItem) => {
    const itemKey = getItemKey(platformName, item.id, item.listing.id)

    const previousQty = item.selectedQty
    const nextQty = previousQty + 1

    updateLocalQty(platformName, item.id, item.listing.id, nextQty)

    try {
      setQtyLoadingMap(prev => ({ ...prev, [itemKey]: true }))

      const token = await AsyncStorage.getItem('vToken')
      if (!token) return

      const formData = new FormData()
      formData.append('product', String(item.product))
      formData.append('quantity', String(nextQty))

      await axios.put(
        `${API_BASE_URL}${API_ENDPOINTS.CART_UPDATE}${item.id}/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      await fetchCart()
    } catch (error: any) {
      console.error('increase qty error', error?.response?.data || error)
      updateLocalQty(platformName, item.id, item.listing.id, previousQty)
    } finally {
      setQtyLoadingMap(prev => ({ ...prev, [itemKey]: false }))
    }
  }

  const handleDeleteItem = async (platformName: string, item: CartUiItem) => {
    const itemKey = getItemKey(platformName, item.id, item.listing.id)

    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const previousState = platformItems

            setPlatformItems(prev => {
              const updated = {
                ...prev,
                [platformName]: (prev[platformName] ?? []).filter(
                  cartItem => !(cartItem.id === item.id && cartItem.listing.id === item.listing.id)
                ),
              }

              return cleanEmptyPlatforms(updated)
            })

            try {
              setDeleteLoadingMap(prev => ({ ...prev, [itemKey]: true }))

              const token = await AsyncStorage.getItem('vToken')
              if (!token) return

              await axios.delete(
                `${API_BASE_URL}${API_ENDPOINTS.CART_REMOVE}${item.id}/`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                  },
                }
              )

              await fetchCart()
            } catch (error: any) {
              console.error('delete cart item error', error?.response?.data || error)
              setPlatformItems(previousState)
            } finally {
              setDeleteLoadingMap(prev => ({ ...prev, [itemKey]: false }))
            }
          },
        },
      ]
    )
  }

  const handleToggleCoupon = (platformName: string) => {
    updateCouponState(platformName, prev => ({
      ...prev,
      expanded: !prev.expanded,
      message: prev.expanded ? '' : prev.message,
    }))
  }

  const handleCouponInput = (platformName: string, value: string) => {
    updateCouponState(platformName, prev => ({
      ...prev,
      code: value,
      applied: false,
      message: '',
      discountAmount: 0,
    }))
  }

  const handleApplyCoupon = async (platformName: string, platformSubtotal: number) => {
    const state = getCouponState(platformName)
    const code = state.code.trim()

    if (!code) {
      updateCouponState(platformName, prev => ({
        ...prev,
        applied: false,
        message: 'Please enter a coupon code.',
      }))
      return
    }

    try {
      updateCouponState(platformName, prev => ({
        ...prev,
        applying: true,
        message: '',
      }))

      /**
       * TODO:
       * Here you can connect coupon API later.
       * Example request body:
       * {
       *   platform: platformName,
       *   coupon_code: code
       * }
       *
       * Then update discountAmount from API response.
       */

      // Temporary frontend-ready state
      updateCouponState(platformName, prev => ({
        ...prev,
        applying: false,
        applied: true,
        message: `Coupon "${code}" captured successfully. Discount calculation will be connected with API.`,
        discountAmount: 0,
      }))
    } catch (error: any) {
      console.error('coupon apply error', error?.response?.data || error)

      updateCouponState(platformName, prev => ({
        ...prev,
        applying: false,
        applied: false,
        message: 'Failed to apply coupon. Please try again.',
        discountAmount: 0,
      }))
    }
  }

  const platformEntries = useMemo(() => Object.entries(platformItems ?? {}), [platformItems])

  const totalSelectedItems = useMemo(() => {
    return platformEntries.reduce((sum, [, items]) => {
      return sum + items.reduce((acc, item) => acc + item.selectedQty, 0)
    }, 0)
  }, [platformEntries])

  const currency = (cartData?.summary?.currency || 'USD').toUpperCase()

  const getPlatformSubtotal = (items: CartUiItem[]) => {
    return items.reduce((sum, item) => {
      const unitPrice = toNumber(item?.listing?.total_price ?? item?.listing?.price, 0)
      return sum + unitPrice * item.selectedQty
    }, 0)
  }

  const totalCouponDiscount = useMemo(() => {
    return platformEntries.reduce((sum, [platformName]) => {
      const discount = toNumber(getCouponState(platformName).discountAmount, 0)
      return sum + discount
    }, 0)
  }, [platformEntries, couponMap])

  const grandTotal = useMemo(() => {
    return platformEntries.reduce((sum, [, items]) => sum + getPlatformSubtotal(items), 0)
  }, [platformEntries])

  const finalTotal = Math.max(
    0,
    toNumber(cartData?.summary?.total_price, grandTotal) - totalCouponDiscount
  )

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 mb-20 flex-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold">My Cart</Text>
            <Text className="text-[#636F85]">
              ({cartData?.summary?.total_items ?? totalSelectedItems})
            </Text>
          </View>

          <Pressable onPress={onRefresh}>
            <Text className="text-[#2355B6] font-semibold">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="mt-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          scrollEnabled={scrollEnabled}
          nestedScrollEnabled={true}
        >
          {loading ? (
            <>
              <CartSectionSkeleton />
              <CartSectionSkeleton />
              <SummarySkeleton />

              <Pressable className="p-5 bg-[#2355B6] rounded-xl mt-5 mb-6" disabled={true}>
                <Text className="text-white text-xl font-bold text-center">
                  See Best Checkout Option
                </Text>
              </Pressable>
            </>
          ) : platformEntries.length === 0 ? (
            <View className="bg-white border border-[#E5E7EB] rounded-3xl p-6">
              <Text className="text-xl font-bold text-center">Your cart is empty</Text>
              <Text className="text-[#636F85] text-center mt-2">
                Add products to see them here.
              </Text>
            </View>
          ) : (
            <>
              {platformEntries.map(([platformName, items], sectionIndex) => {
                const platformLogo = getPlatformLogo(platformName)
                const platformSubtotal = getPlatformSubtotal(items)
                const couponState = getCouponState(platformName)
                const platformFinalSubtotal = Math.max(
                  0,
                  platformSubtotal - toNumber(couponState.discountAmount, 0)
                )

                return (
                  <View
                    key={platformName}
                    className={`border-2 border-[#E5E7EB] rounded-3xl bg-white ${sectionIndex > 0 ? 'mt-5' : ''
                      }`}
                  >
                    <View className="flex-row items-center justify-center gap-4 px-4 py-3 border-b-2 border-[#E5E7EB]">
                      {platformLogo ? (
                        <View>
                          <MaterialIcons name="storefront" size={0} color="transparent" />
                        </View>
                      ) : (
                        <MaterialIcons name="storefront" size={30} color="#2355B6" />
                      )}

                      <Text className="text-xl font-semibold">{platformName}</Text>
                    </View>

                    <View className="px-4 pt-4">
                      <View className="border border-[#E7ECF3] rounded-2xl p-4 bg-[#FAFBFD]">
                        <View className="flex-row items-center justify-between">
                          <View className="pr-3 flex-1">
                            <Text className="text-base font-semibold text-[#111827]">
                              Apply Coupon
                            </Text>
                            <Text className="text-[#636F85] mt-1">
                              Add a coupon code for {platformName}.
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => handleToggleCoupon(platformName)}
                            className="px-4 py-2 rounded-xl bg-[#2355B6]"
                          >
                            <Text className="text-white font-semibold">
                              {couponState.expanded ? 'Hide' : 'Apply Coupon'}
                            </Text>
                          </Pressable>
                        </View>

                        {couponState.expanded && (
                          <View className="mt-4">
                            <View className="flex-row items-center gap-3">
                              <TextInput
                                value={couponState.code}
                                onChangeText={value => handleCouponInput(platformName, value)}
                                placeholder="Enter coupon code"
                                placeholderTextColor="#94A3B8"
                                autoCapitalize="characters"
                                className="flex-1 border border-[#D7DEEA] bg-white rounded-xl px-4 py-3 text-[#111827]"
                              />

                              <Pressable
                                onPress={() => handleApplyCoupon(platformName, platformSubtotal)}
                                disabled={couponState.applying}
                                className="px-4 py-3 rounded-xl bg-[#111827]"
                                style={{ opacity: couponState.applying ? 0.7 : 1 }}
                              >
                                <Text className="text-white font-semibold">
                                  {couponState.applying ? 'Applying...' : 'Apply'}
                                </Text>
                              </Pressable>
                            </View>

                            {!!couponState.message && (
                              <Text
                                className={`mt-3 text-sm ${couponState.applied ? 'text-[#15803D]' : 'text-[#DC2626]'
                                  }`}
                              >
                                {couponState.message}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="p-4">
                      {items.map(item => {
                        const itemKey = getItemKey(platformName, item.id, item.listing.id)

                        return (
                          <CartProductCard
                            key={`${platformName}_${item.product}_${item.id}_${item.listing.id}`}
                            image={normalizeImageUrl(item.product_image) as any}
                            name={item.product_title}
                            price={toNumber(item.listing.total_price ?? item.listing.price, 0)}
                            originalPrice={toNumber(item.listing.original_price, 0)}
                            discount={
                              item.listing.discount_percentage
                                ? `-${Math.round(Number(item.listing.discount_percentage))}%`
                                : ''
                            }
                            quantity={item.selectedQty}
                            condition={item.listing.condition}
                            isAvailable={item.listing.is_available}
                            qtyLoading={!!qtyLoadingMap[itemKey]}
                            deleteLoading={!!deleteLoadingMap[itemKey]}
                            onIncrease={() => handleIncreaseQuantity(platformName, item)}
                            onDecrease={() => handleDecreaseQuantity(platformName, item)}
                            onDelete={() => handleDeleteItem(platformName, item)}
                            onSwipeStart={() => setScrollEnabled(false)}
                            onSwipeEnd={() => setScrollEnabled(true)}
                          />
                        )
                      })}
                    </View>

                    <View className="bg-[#36405305] px-6 py-4 rounded-b-3xl">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[#636F85] text-lg">
                          {platformName.toUpperCase()} SUBTOTAL
                        </Text>
                        <Text className="text-xl font-bold">
                          {formatMoney(platformSubtotal, currency)}
                        </Text>
                      </View>

                      {toNumber(couponState.discountAmount, 0) > 0 && (
                        <>
                          <View className="flex-row items-center justify-between mt-2">
                            <Text className="text-[#15803D] text-lg">Coupon Discount</Text>
                            <Text className="text-[#15803D] text-xl font-semibold">
                              -{formatMoney(toNumber(couponState.discountAmount, 0), currency)}
                            </Text>
                          </View>

                          <View className="flex-row items-center justify-between mt-2">
                            <Text className="text-[#111827] text-lg font-semibold">New Subtotal</Text>
                            <Text className="text-[#2355B6] text-2xl font-bold">
                              {formatMoney(platformFinalSubtotal, currency)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )
              })}

              <View className="bg-white border-2 border-[#E5E7EB] rounded-3xl p-5 mt-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#636F85] text-lg">Platforms</Text>
                  <Text className="text-lg font-semibold">
                    {cartData?.summary?.total_platforms ?? platformEntries.length}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#636F85] text-lg">Items</Text>
                  <Text className="text-lg font-semibold">
                    {cartData?.summary?.total_items ?? totalSelectedItems}
                  </Text>
                </View>

                {totalCouponDiscount > 0 && (
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[#15803D] text-lg">Coupon Discount</Text>
                    <Text className="text-[#15803D] text-lg font-semibold">
                      -{formatMoney(totalCouponDiscount, currency)}
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-bold">Total</Text>
                  <Text className="text-3xl font-bold text-[#2355B6]">
                    {formatMoney(finalTotal, currency)}
                  </Text>
                </View>
              </View>

              <Pressable
                className="p-5 bg-[#2355B6] rounded-xl mt-5 mb-6"
                    onPress={() => navigation.navigate('SavingsSummary')}
                disabled={platformEntries.length === 0}
                style={{ opacity: platformEntries.length === 0 ? 0.5 : 1 }}
              >
                <Text className="text-white text-xl font-bold text-center">
                  See Best Checkout Option
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

export default Cart