// Cart.tsx - Fixed Version
import { CART_PRODUCT, CART_REMOVE, CART_UPDATE, IPA_BASE } from '@env'
import { 
    MaterialIcons, 
    Ionicons, 
    Feather,
    FontAwesome5 
} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native'
import axios from 'axios'
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import {
    Alert,
    DimensionValue,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    Image,
    TouchableOpacity,
    Animated,
    RefreshControl,
    LayoutAnimation,
    Platform,
    UIManager,
    KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

import { AuthStackParamList } from '../../Navigation/types'
import CartProductCard from '../../components/CartProductCard'
import { Images } from '../../constants'

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

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
    _orderIndex?: number // ✅ Preserve order
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

// ─── Sticky Bottom Summary Bar ───────────────────────────────────────────────
const StickyBottomBar = ({
    totalItems,
    totalPrice,
    currency,
    onCheckout,
    disabled,
    bottomInset = 0, // ✅ For bottom navigation
}: {
    totalItems: number
    totalPrice: number
    currency: string
    onCheckout: () => void
    disabled: boolean
    bottomInset?: number
}) => {
    const slideAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start()
    }, [])

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0],
    })

    const formatMoney = (amount: number, currency = 'USD') => {
        const normalizedCurrency = currency?.toUpperCase?.() || 'USD'
        return `${normalizedCurrency === 'USD' ? '$' : `${normalizedCurrency} `}${amount.toFixed(2)}`
    }

    return (
        <Animated.View
            style={[
                {
                    transform: [{ translateY }],
                    position: 'absolute',
                    bottom: bottomInset, // ✅ Dynamic bottom inset for navigation
                    left: 0,
                    right: 0,
                    zIndex: 50,
                },
            ]}
        >
            <LinearGradient
                colors={['rgba(255,255,255,0)', '#FFFFFF', '#FFFFFF']}
                style={{ paddingTop: 20 }}
            >
                <View className="px-5 pb-6 pt-4 bg-white rounded-t-3xl shadow-lg" 
                    style={{ 
                        shadowColor: '#000', 
                        shadowOffset: { width: 0, height: -4 }, 
                        shadowOpacity: 0.08, 
                        shadowRadius: 12, 
                        elevation: 8,
                        borderTopWidth: 1,
                        borderColor: '#E5E7EB',
                    }}
                >
                    {/* <View className="flex-row items-center justify-between mb-3">
                        <View>
                            <Text className="text-[#64748B] text-sm">Total Items</Text>
                            <Text className="text-lg font-bold text-[#1F2937]">{totalItems}</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-[#64748B] text-sm">Total Price</Text>
                            <Text className="text-2xl font-bold text-[#2355B6]">
                                {formatMoney(totalPrice, currency)}
                            </Text>
                        </View>
                    </View> */}

                    <TouchableOpacity
                        onPress={onCheckout}
                        disabled={disabled}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={disabled ? ['#94A3B8', '#64748B'] : ['#2355B6', '#1A4D8F']}
                            className="rounded-xl overflow-hidden"
                        >
                            <View className="p-4 flex-row items-center justify-center gap-3">
                                <FontAwesome5 name="rocket" size={20} color="#FFFFFF" />
                                <Text className="text-white text-lg font-bold">
                                    Proceed to Checkout
                                </Text>
                                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animated.View>
    )
}

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonBlock = ({ height, width = '100%', rounded = 16 }: any) => {
    return <View className={`bg-[#E9EDF3] rounded-2xl`} style={{ height, width, borderRadius: rounded }} />
}

const CartSectionSkeleton = () => {
    return (
        <View className="rounded-3xl mt-5 overflow-hidden bg-white shadow-sm" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
            <View className="px-4 py-4 border-b items-center" style={{ borderColor: '#E5E7EB' }}>
                <SkeletonBlock height={30} width={180} />
            </View>
            <View className="p-4">
                {[1, 2].map(item => (
                    <View key={item} className={`border rounded-3xl p-4 ${item > 1 ? 'mt-4' : ''}`} style={{ borderColor: '#EEF1F5' }}>
                        <View className="flex-row">
                            <SkeletonBlock height={92} width={92} rounded={16} />
                            <View className="flex-1 ml-4">
                                <SkeletonBlock height={18} width="80%" rounded={6} />
                                <SkeletonBlock height={14} width="45%" rounded={6} className="mt-3" />
                                <SkeletonBlock height={14} width="35%" rounded={6} className="mt-2" />
                                <View className="flex-row items-center justify-between mt-4">
                                    <SkeletonBlock height={16} width={90} rounded={6} />
                                    <SkeletonBlock height={34} width={110} rounded={12} />
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
            <View className="px-6 py-4" style={{ backgroundColor: '#36405305' }}>
                <View className="flex-row items-center justify-between">
                    <SkeletonBlock height={18} width={140} rounded={6} />
                    <SkeletonBlock height={24} width={100} rounded={6} />
                </View>
            </View>
        </View>
    )
}

// ─── Empty Cart Component ────────────────────────────────────────────────────
const EmptyCart = ({ onRefresh }: { onRefresh: () => void }) => (
    <View className="flex-1 items-center justify-center py-16 px-8">
        <View className="w-32 h-32 rounded-full bg-[#F1F5F9] items-center justify-center mb-6">
            <Feather name="shopping-bag" size={56} color="#94A3B8" />
        </View>
        <Text className="text-2xl font-bold text-[#1F2937] mb-2">Your Cart is Empty</Text>
        <Text className="text-[#64748B] text-center text-base mb-8">
            Looks like you haven't added any items to your cart yet.
        </Text>
        <TouchableOpacity 
            onPress={onRefresh}
            className="bg-[#2355B6] px-8 py-4 rounded-full flex-row items-center gap-2"
        >
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text className="text-white font-semibold text-base">Browse Products</Text>
        </TouchableOpacity>
    </View>
)

// ─── Main Component ──────────────────────────────────────────────────────────
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
    
    // ✅ Track bottom inset for navigation
    const [bottomInset, setBottomInset] = useState(0)

    // ── Helper Functions ──────────────────────────────────────────────────────
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

    const updateCouponState = (platformName: string, updater: (prev: CouponState) => CouponState) => {
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
                if (!next[key]) next[key] = DEFAULT_COUPON_STATE
            })
            return next
        })
    }

    const normalizeImageUrl = (imagePath?: string | null) => {
        if (!imagePath || !String(imagePath).trim()) return PLACEHOLDER_IMAGE
        const cleaned = String(imagePath).trim()
        if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:image')) {
            return cleaned
        }
        const base = String(API_BASE_URL || '').trim()
        if (!base) return PLACEHOLDER_IMAGE
        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
        return `${normalizedBase}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`
    }

    // ✅ Preserve order when building UI state
    const buildUiState = (data: CartApiData): CartPlatformsState => {
        const nextState: CartPlatformsState = {}
        Object.entries(data?.platforms ?? {}).forEach(([platformName, items]) => {
            nextState[platformName] = (items ?? []).map((item, index) => ({
                ...item,
                selectedQty: Math.max(1, toNumber(item.quantity, 1)),
                _orderIndex: index, // ✅ Preserve original order
            }))
        })
        return nextState
    }

    // ── API Calls ─────────────────────────────────────────────────────────────
    const fetchCart = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true)
            const token = await AsyncStorage.getItem('vToken')
            if (!token) {
                setCartData(null)
                setPlatformItems({})
                return
            }
            const res = await axios.get(`${API_BASE_URL}${CART_PRODUCT}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
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

    useFocusEffect(useCallback(() => { fetchCart(true) }, [fetchCart]))

    const onRefresh = async () => {
        try {
            setRefreshing(true)
            await fetchCart(false)
        } catch { setRefreshing(false) }
    }

    // ── Optimized Local Update (Preserves Order) ─────────────────────────────
    const updateLocalQty = (platformName: string, itemId: number, listingId: number, nextQty: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setPlatformItems(prev => {
            const platformList = prev[platformName] ?? []
            
            // ✅ Find and update the item while preserving order
            const updatedList = platformList.map(item => {
                if (item.id === itemId && item.listing.id === listingId) {
                    return { ...item, selectedQty: Math.max(1, nextQty) }
                }
                return item
            })
            
            // ✅ Sort by original order index to maintain sequence
            const sortedList = updatedList.sort((a, b) => (a._orderIndex ?? 0) - (b._orderIndex ?? 0))
            
            return {
                ...prev,
                [platformName]: sortedList,
            }
        })
    }

    // ✅ Clean empty platforms while preserving order
    const cleanEmptyPlatforms = (prev: CartPlatformsState) => {
        const cleaned: CartPlatformsState = {}
        Object.entries(prev).forEach(([platformName, items]) => {
            if (items.length > 0) {
                // ✅ Maintain order after filtering
                cleaned[platformName] = items.sort((a, b) => (a._orderIndex ?? 0) - (b._orderIndex ?? 0))
            }
        })
        return cleaned
    }

    // ── Quantity Management ──────────────────────────────────────────────────
    const handleDecreaseQuantity = async (platformName: string, item: CartUiItem) => {
        const itemKey = getItemKey(platformName, item.id, item.listing.id)
        if (item.selectedQty <= 1) return
        const previousQty = item.selectedQty
        const nextQty = previousQty - 1
        
        // Update UI immediately (optimistic update)
        updateLocalQty(platformName, item.id, item.listing.id, nextQty)

        try {
            setQtyLoadingMap(prev => ({ ...prev, [itemKey]: true }))
            const token = await AsyncStorage.getItem('vToken')
            if (!token) return
            
            const formData = new FormData()
            formData.append('product', String(item.product))
            formData.append('quantity', String(nextQty))
            
            await axios.put(`${API_BASE_URL}${API_ENDPOINTS.CART_UPDATE}${item.id}/`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`, 
                    Accept: 'application/json', 
                    'Content-Type': 'multipart/form-data' 
                },
            })
            
            // Silently refresh in background
            await fetchCart(false)
        } catch (error: any) {
            console.error('decrease qty error', error?.response?.data || error)
            // Revert on error
            updateLocalQty(platformName, item.id, item.listing.id, previousQty)
        } finally {
            setQtyLoadingMap(prev => ({ ...prev, [itemKey]: false }))
        }
    }

    const handleIncreaseQuantity = async (platformName: string, item: CartUiItem) => {
        const itemKey = getItemKey(platformName, item.id, item.listing.id)
        const previousQty = item.selectedQty
        const nextQty = previousQty + 1
        
        // Update UI immediately (optimistic update)
        updateLocalQty(platformName, item.id, item.listing.id, nextQty)

        try {
            setQtyLoadingMap(prev => ({ ...prev, [itemKey]: true }))
            const token = await AsyncStorage.getItem('vToken')
            if (!token) return
            
            const formData = new FormData()
            formData.append('product', String(item.product))
            formData.append('quantity', String(nextQty))
            
            await axios.put(`${API_BASE_URL}${API_ENDPOINTS.CART_UPDATE}${item.id}/`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`, 
                    Accept: 'application/json', 
                    'Content-Type': 'multipart/form-data' 
                },
            })
            
            // Silently refresh in background
            await fetchCart(false)
        } catch (error: any) {
            console.error('increase qty error', error?.response?.data || error)
            // Revert on error
            updateLocalQty(platformName, item.id, item.listing.id, previousQty)
        } finally {
            setQtyLoadingMap(prev => ({ ...prev, [itemKey]: false }))
        }
    }

    const handleDeleteItem = async (platformName: string, item: CartUiItem) => {
        const itemKey = getItemKey(platformName, item.id, item.listing.id)
        
        Alert.alert(
            'Remove Item',
            'Are you sure you want to remove this item from your cart?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        // Optimistic update - remove immediately
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
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
                            
                            await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.CART_REMOVE}${item.id}/`, {
                                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                            })
                            
                            // Silently refresh in background
                            await fetchCart(false)
                        } catch (error: any) {
                            console.error('delete cart item error', error?.response?.data || error)
                            await fetchCart(false)
                        } finally {
                            setDeleteLoadingMap(prev => ({ ...prev, [itemKey]: false }))
                        }
                    },
                },
            ]
        )
    }

    // ── Coupon Management ────────────────────────────────────────────────────
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
            updateCouponState(platformName, prev => ({ ...prev, applying: true, message: '' }))
            // TODO: Connect coupon API here
            updateCouponState(platformName, prev => ({
                ...prev,
                applying: false,
                applied: true,
                message: `✅ Coupon "${code}" applied successfully!`,
                discountAmount: 0,
            }))
        } catch (error: any) {
            console.error('coupon apply error', error?.response?.data || error)
            updateCouponState(platformName, prev => ({
                ...prev,
                applying: false,
                applied: false,
                message: '❌ Failed to apply coupon. Please try again.',
                discountAmount: 0,
            }))
        }
    }

    // ── Computed Values ──────────────────────────────────────────────────────
    const platformEntries = useMemo(() => {
        // ✅ Sort platforms by their first item's order to maintain consistency
        return Object.entries(platformItems ?? {}).sort(([, itemsA], [, itemsB]) => {
            const orderA = itemsA[0]?._orderIndex ?? 0
            const orderB = itemsB[0]?._orderIndex ?? 0
            return orderA - orderB
        })
    }, [platformItems])

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

    const finalTotal = Math.max(0, toNumber(cartData?.summary?.total_price, grandTotal) - totalCouponDiscount)

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
            {/* Header */}
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()} 
                            className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm" 
                            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
                        >
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-2xl font-bold text-[#1F2937]">My Cart</Text>
                            <Text className="text-[#64748B] text-sm">
                                {totalSelectedItems} {totalSelectedItems === 1 ? 'item' : 'items'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        onPress={onRefresh} 
                        className="w-10 h-10 rounded-full bg-[#EFF6FF] items-center justify-center"
                    >
                        <Ionicons name="refresh" size={22} color="#2355B6" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <View className="flex-1">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="px-5"
                    contentContainerStyle={{ 
                        paddingBottom: 200, // ✅ Extra padding for bottom bar + navigation
                        paddingTop: 4,
                    }}
                    scrollEnabled={scrollEnabled}
                    nestedScrollEnabled={true}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2355B6']} tintColor="#2355B6" />
                    }
                >
                    {loading ? (
                        <>
                            <CartSectionSkeleton />
                            <CartSectionSkeleton />
                        </>
                    ) : platformEntries.length === 0 ? (
                        <EmptyCart onRefresh={onRefresh} />
                    ) : (
                        <>
                            {platformEntries.map(([platformName, items], sectionIndex) => {
                                const platformLogo = getPlatformLogo(platformName)
                                const platformSubtotal = getPlatformSubtotal(items)
                                const couponState = getCouponState(platformName)
                                const platformFinalSubtotal = Math.max(0, platformSubtotal - toNumber(couponState.discountAmount, 0))

                                return (
                                    <View
                                        key={platformName}
                                        className={`rounded-3xl bg-white mt-${sectionIndex > 0 ? '5' : '4'} shadow-sm`}
                                        style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                                    >
                                        {/* Platform Header */}
                                        <LinearGradient
                                            colors={['#F8FAFC', '#FFFFFF']}
                                            className="flex-row items-center px-4 py-3 border-b"
                                            style={{ borderColor: '#E5E7EB', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                                        >
                                            <View className="w-10 h-10 rounded-full bg-[#EFF6FF] items-center justify-center mr-3">
                                                {platformLogo ? (
                                                    <Image source={platformLogo} className="w-6 h-6" resizeMode="contain" />
                                                ) : (
                                                    <MaterialIcons name="storefront" size={22} color="#2355B6" />
                                                )}
                                            </View>
                                            <Text className="text-lg font-semibold text-[#1F2937] flex-1">{platformName}</Text>
                                            <View className="bg-[#EFF6FF] px-3 py-1 rounded-full">
                                                <Text className="text-[#2355B6] text-xs font-semibold">{items.length} items</Text>
                                            </View>
                                        </LinearGradient>

                                        {/* Coupon Section */}
                                        <View className="px-4 pt-3">
                                            <View className="rounded-2xl p-3" style={{ backgroundColor: '#FAFBFD', borderWidth: 1, borderColor: '#E7ECF3' }}>
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1 pr-3">
                                                        <Text className="text-sm font-semibold text-[#1F2937]">🎫 Apply Coupon</Text>
                                                        <Text className="text-[#94A3B8] text-xs mt-0.5">Get extra discounts</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handleToggleCoupon(platformName)}
                                                        className="px-4 py-2 rounded-full bg-[#2355B6]"
                                                    >
                                                        <Text className="text-white text-sm font-semibold">
                                                            {couponState.expanded ? 'Hide' : 'Apply'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {couponState.expanded && (
                                                    <View className="mt-3">
                                                        <View className="flex-row items-center gap-2">
                                                            <View className="flex-1 rounded-xl bg-white px-3 py-2 flex-row items-center" style={{ borderWidth: 1, borderColor: '#D7DEEA' }}>
                                                                <FontAwesome5 name="tag" size={16} color="#94A3B8" />
                                                                <TextInput
                                                                    value={couponState.code}
                                                                    onChangeText={value => handleCouponInput(platformName, value)}
                                                                    placeholder="Enter coupon code"
                                                                    placeholderTextColor="#94A3B8"
                                                                    autoCapitalize="characters"
                                                                    className="flex-1 ml-2 text-[#1F2937]"
                                                                />
                                                            </View>
                                                            <TouchableOpacity
                                                                onPress={() => handleApplyCoupon(platformName, platformSubtotal)}
                                                                disabled={couponState.applying}
                                                                className="px-4 py-2 rounded-xl bg-[#1F2937]"
                                                                style={{ opacity: couponState.applying ? 0.7 : 1 }}
                                                            >
                                                                <Text className="text-white font-semibold text-sm">
                                                                    {couponState.applying ? '...' : 'Apply'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                        {!!couponState.message && (
                                                            <Text className={`mt-2 text-sm ${couponState.applied ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                                                {couponState.message}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* Items - Preserved Order */}
                                        <View className="p-3">
                                            {items.map((item, index) => {
                                                const itemKey = getItemKey(platformName, item.id, item.listing.id)
                                                return (
                                                    <View key={`${platformName}_${item.product}_${item.id}`}>
                                                        <CartProductCard
                                                            image={normalizeImageUrl(item.product_image) as any}
                                                            name={item.product_title}
                                                            price={toNumber(item.listing.total_price ?? item.listing.price, 0)}
                                                            originalPrice={toNumber(item.listing.original_price, 0)}
                                                            discount={item.listing.discount_percentage ? `-${Math.round(Number(item.listing.discount_percentage))}%` : ''}
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
                                                        {index < items.length - 1 && (
                                                            <View className="h-px bg-[#E5E7EB] my-2 mx-2" />
                                                        )}
                                                    </View>
                                                )
                                            })}
                                        </View>

                                        {/* Platform Subtotal */}
                                        <LinearGradient
                                            colors={['#F8FAFC', '#F1F5F9']}
                                            className="px-4 py-3 rounded-b-3xl flex-row items-center justify-between"
                                            style={{ borderTopWidth: 1, borderColor: '#E5E7EB' }}
                                        >
                                            <Text className="text-[#64748B] text-sm font-medium">Subtotal</Text>
                                            <View className="flex-row items-center gap-2">
                                                {toNumber(couponState.discountAmount, 0) > 0 && (
                                                    <Text className="text-[#94A3B8] text-sm line-through">
                                                        {formatMoney(platformSubtotal, currency)}
                                                    </Text>
                                                )}
                                                <Text className="text-lg font-bold text-[#2355B6]">
                                                    {formatMoney(platformFinalSubtotal, currency)}
                                                </Text>
                                            </View>
                                        </LinearGradient>
                                    </View>
                                )
                            })}
                            
                            {/* Extra bottom spacing for the sticky bar */}
                            <View className="h-4" />
                        </>
                    )}
                </ScrollView>

                {/* ✅ Sticky Bottom Bar - Only show when cart has items */}
                {!loading && platformEntries.length > 0 && (
                    <StickyBottomBar
                        totalItems={totalSelectedItems}
                        totalPrice={finalTotal}
                        currency={currency}
                        onCheckout={() => navigation.navigate('SavingsSummary')}
                        disabled={platformEntries.length === 0}
                        bottomInset={80} // ✅ Space for bottom navigation (adjust based on your nav height)
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

export default Cart