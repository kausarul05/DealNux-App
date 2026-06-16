// ProductDetails.tsx
import {
    ADD_CART,
    ADD_FAVORITE,
    COMPARE_PRODUCT,
    IPA_BASE,
    PRODUCT_DETAILS,
    REMOVE_FAVORITE,
    TOTAL_SUMMERY_POST,
} from '@env'
import {
    Entypo,
    Feather,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native'
import axios from 'axios'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
    ImageSourcePropType,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import ChatModal from '../../components/ChatModal'
import { Toast, useToast } from '../../components/useToost'
import { Images } from '../../constants'
import { AuthStackParamList } from '../../Navigation/types'

const API_BASE_URL = IPA_BASE

type RouteParams = { productId: string | number }

const KNOWN_PLATFORMS = [
    'amazon',
    'walmart',
    'aliexpress',
    'bestbuy',
    'best buy',
    'sephora',
    'target',
    'ebay',
]

const isKnownPlatform = (name: string) =>
    KNOWN_PLATFORMS.some((p) => name?.toLowerCase().includes(p))

type ProductListing = {
    id: number | string
    platform_name: string
    platform_code?: string
    price: string
    currency?: string
    original_price?: string
    discount_percentage?: string
    condition?: string
    free_shipping?: boolean
    shipping_cost?: string
    total_price?: number
    external_url?: string
    is_available?: boolean
}

type ProductData = {
    id: number | string
    title: string
    slug?: string
    price?: number
    platform_name: string
    description?: string
    category?: string | null
    brand?: string
    main_image?: string
    images?: string[]
    lowest_price?: number
    listings?: ProductListing[]
    is_active?: boolean
    created_at?: string
    is_favorite?: boolean
    is_cart?: boolean
    rating: number
    review_count: number
}

type CompareItem = {
    platform: string
    platform_code?: string
    product_id?: number
    listing_id?: string
    clean_title?: string
    price: number
    total_price: number
    url?: string
    main_image?: string
    seller?: string
}

type CompareData = {
    price_comparison: CompareItem[]
    best_deal?: CompareItem
    price_analysis?: {
        lowest_price: number
        highest_price: number
        potential_savings: number
    }
}

const getPlatformLogo = (platformName: string): ImageSourcePropType | null => {
    const name = platformName?.toLowerCase() ?? ''
    if (name.includes('amazon')) return Images.Amazon
    if (name.includes('walmart')) return Images.Wallmart
    if (name.includes('aliexpress')) return Images.Aliexpress
    if (name.includes('bestbuy') || name.includes('best buy')) return Images.BestBuy
    return null
}

// ─── Skeleton Pulse Component ────────────────────────────────────────────────
const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style,
}: {
    width?: number | string
    height: number
    borderRadius?: number
    style?: any
}) => {
    const opacity = useRef(new Animated.Value(0.3)).current

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        )
        pulse.start()
        return () => pulse.stop()
    }, [])

    return (
        <Animated.View
            style={[
                {
                    width: width ?? '100%',
                    height,
                    borderRadius,
                    backgroundColor: '#E2E8F0',
                    opacity,
                },
                style,
            ]}
        />
    )
}

// ─── Skeleton Screen ─────────────────────────────────────────────────────────
const ProductDetailsSkeleton = () => {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9FB' }}>
            {/* Header */}
            <View style={skeletonStyles.header}>
                <SkeletonBox width={36} height={36} borderRadius={18} />
                <SkeletonBox width={140} height={20} borderRadius={6} style={{ marginLeft: 12 }} />
            </View>

            {/* Hero image */}
            <SkeletonBox width="100%" height={300} borderRadius={0} />

            <ScrollView style={{ paddingHorizontal: 20 }} scrollEnabled={false}>
                {/* Title + platform row */}
                <View style={skeletonStyles.row}>
                    <View style={{ flex: 1, gap: 8 }}>
                        <SkeletonBox width="90%" height={22} borderRadius={6} />
                        <SkeletonBox width="60%" height={18} borderRadius={6} />
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <SkeletonBox width={100} height={20} borderRadius={6} />
                        <SkeletonBox width={90} height={32} borderRadius={999} />
                    </View>
                </View>

                {/* Price card */}
                <View style={skeletonStyles.card}>
                    <View style={skeletonStyles.row}>
                        <SkeletonBox width={160} height={16} borderRadius={5} />
                        <SkeletonBox width={80} height={30} borderRadius={10} />
                    </View>
                    <SkeletonBox width={140} height={40} borderRadius={8} style={{ marginTop: 14 }} />
                    <SkeletonBox width={100} height={16} borderRadius={5} style={{ marginTop: 8 }} />
                    <View style={[skeletonStyles.row, { marginTop: 20, gap: 12 }]}>
                        <SkeletonBox width={80} height={56} borderRadius={12} />
                        <SkeletonBox width={200} height={56} borderRadius={12} />
                    </View>
                </View>

                {/* Description card */}
                <View style={skeletonStyles.card}>
                    <SkeletonBox width={120} height={22} borderRadius={6} style={{ marginBottom: 14 }} />
                    <SkeletonBox height={14} borderRadius={5} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="92%" height={14} borderRadius={5} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="80%" height={14} borderRadius={5} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="70%" height={14} borderRadius={5} />
                </View>

                {/* Compare section */}
                <View style={{ marginTop: 8 }}>
                    <SkeletonBox width={160} height={22} borderRadius={6} style={{ marginBottom: 14 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={skeletonStyles.compareCard}>
                                <SkeletonBox height={138} borderRadius={0} />
                                <View style={{ padding: 12, gap: 8 }}>
                                    <SkeletonBox height={14} borderRadius={4} />
                                    <SkeletonBox width="60%" height={14} borderRadius={4} />
                                    <SkeletonBox width={80} height={28} borderRadius={6} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const skeletonStyles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: '#E5E7EB',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    card: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        padding: 20,
        borderRadius: 16,
        marginTop: 16,
        backgroundColor: '#fff',
    },
    compareCard: {
        width: 160,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
})

// ─── Empty State Component ────────────────────────────────────────────────────
const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9FB' }}>
        <View style={emptyStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <BackButton />
                <Text style={emptyStyles.headerTitle}>Product Detail</Text>
            </View>
        </View>
        <View style={emptyStyles.container}>
            <View style={emptyStyles.iconWrap}>
                <MaterialIcons name="inventory-2" size={52} color="#CBD5E1" />
            </View>
            <Text style={emptyStyles.title}>Product Not Found</Text>
            <Text style={emptyStyles.subtitle}>
                We couldn't load the product details.{'\n'}Please check your connection and try again.
            </Text>
            <TouchableOpacity style={emptyStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={emptyStyles.retryText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
)

const emptyStyles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        marginBottom: 4,
        borderBottomWidth: 2,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2355B6',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
})

// ─── Action Loading Modal (3 dash lines) ─────────────────────────────────────
const ActionLoadingModal = ({
    visible,
    message = 'Processing...',
}: {
    visible: boolean
    message?: string
}) => {
    const dash1 = useRef(new Animated.Value(0.3)).current
    const dash2 = useRef(new Animated.Value(0.3)).current
    const dash3 = useRef(new Animated.Value(0.3)).current

    useEffect(() => {
        if (!visible) return

        const animate = (val: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                    Animated.timing(val, {
                        toValue: 0.3,
                        duration: 400,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                ])
            )

        const a1 = animate(dash1, 0)
        const a2 = animate(dash2, 180)
        const a3 = animate(dash3, 360)

        a1.start()
        a2.start()
        a3.start()

        return () => {
            a1.stop()
            a2.stop()
            a3.stop()
            dash1.setValue(0.3)
            dash2.setValue(0.3)
            dash3.setValue(0.3)
        }
    }, [visible])

    return (
        <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.card}>
                    {/* 3 animated dash lines */}
                    <View style={modalStyles.dashRow}>
                        {[dash1, dash2, dash3].map((anim, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    modalStyles.dash,
                                    { opacity: anim },
                                ]}
                            />
                        ))}
                    </View>
                    <Text style={modalStyles.message}>{message}</Text>
                </View>
            </View>
        </Modal>
    )
}

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 36,
        paddingVertical: 28,
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        minWidth: 200,
    },
    dashRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dash: {
        width: 48,
        height: 6,
        borderRadius: 99,
        backgroundColor: '#2355B6',
    },
    message: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'center',
    },
})

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductDetails = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
    const route = useRoute()
    const { productId } = route.params as RouteParams
    const toast = useToast()

    const [chatModalVisible, setChatModalVisible] = useState(false)
    const [product, setProduct] = useState<ProductData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [isFavorite, setIsFavorite] = useState(false)
    const [favLoading, setFavLoading] = useState(false)

    const [isInCart, setIsInCart] = useState(false)
    const [cartLoading, setCartLoading] = useState(false)

    const [compareData, setCompareData] = useState<CompareData | null>(null)
    const [compareLoading, setCompareLoading] = useState(false)

    // Action lock: prevents View and Cart from conflicting
    const [actionLocked, setActionLocked] = useState(false)
    const [actionMessage, setActionMessage] = useState('Processing...')

    const fetchProductDetails = async () => {
        if (!productId) {
            setError('Product id missing')
            return
        }

        try {
            setLoading(true)
            setError('')

            const token = await AsyncStorage.getItem('vToken')
            const url = `${API_BASE_URL}${PRODUCT_DETAILS}${productId}/detail/`

            const response = await axios.get(url, {
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            })

            const productData: ProductData = response?.data?.data ?? response?.data
            setProduct(productData)
            setIsFavorite(productData?.is_favorite === true)
            setIsInCart(productData?.is_cart === true)
        } catch (err: any) {
            console.log('product details error', err?.response?.data || err?.message)
            setError('Failed to load product details')
        } finally {
            setLoading(false)
        }
    }

    const fetchCompare = async (slug: string) => {
        if (!slug) return

        try {
            setCompareLoading(true)

            const token = await AsyncStorage.getItem('vToken')
            const url = `${API_BASE_URL}${COMPARE_PRODUCT}${slug}/`

            const response = await axios.get(url, {
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            })

            const data: CompareData = response?.data?.data ?? response?.data
            setCompareData(data)
        } catch (err: any) {
            console.log('compare error', err?.response?.data || err?.message)
        } finally {
            setCompareLoading(false)
        }
    }

    useEffect(() => {
        fetchProductDetails()
    }, [productId])

    useEffect(() => {
        if (product?.slug) {
            fetchCompare(product.slug)
        }
    }, [product?.slug])

    const toggleFavorite = async () => {
        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' })
            return
        }

        setFavLoading(true)

        try {
            if (isFavorite) {
                await axios.delete(`${API_BASE_URL}${REMOVE_FAVORITE}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    data: { product_id: Number(productId) },
                })
                setIsFavorite(false)
                toast.show({ message: 'Removed from favorites', type: 'success', style: 'top' })
            } else {
                await axios.post(
                    `${API_BASE_URL}${ADD_FAVORITE}`,
                    { product_id: Number(productId) },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    }
                )
                setIsFavorite(true)
                toast.show({ message: 'Added to favorites', type: 'success', style: 'top' })
            }
        } catch (error: any) {
            const msg: string = error?.response?.data?.message || ''
            const status: number = error?.response?.status

            if (status === 400 && msg.toLowerCase().includes('already in favorites')) {
                setIsFavorite(true)
                return
            }

            toast.show({ message: msg || 'Favorite update failed', type: 'error', style: 'top' })
        } finally {
            setFavLoading(false)
        }
    }

    // ── Add to Cart — with action lock ────────────────────────────────────────
    const handleAddToCart = async () => {
        if (isInCart || actionLocked) return

        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' })
            return
        }

        if (!mainListing?.id) {
            toast.show({ message: 'No listing available', type: 'error', style: 'top' })
            return
        }

        // Lock actions & show modal
        setActionLocked(true)
        setActionMessage('Adding to cart...')
        setCartLoading(true)

        try {
            await axios.post(
                `${API_BASE_URL}${ADD_CART}`,
                { product_id: Number(productId) },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            )

            setIsInCart(true)
            toast.show({ message: 'Added to cart successfully', type: 'success', style: 'top' })

            // fire purchase intent — don't await, non-blocking
            axios
                .post(
                    `${API_BASE_URL}${TOTAL_SUMMERY_POST}${product?.slug}/record_purchase_intent/`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    }
                )
                .catch(() => {
                    // silent — purchase intent failure should not affect UX
                })
        } catch (error: any) {
            const msg: string = error?.response?.data?.message || ''
            toast.show({ message: msg || 'Failed to add to cart', type: 'error', style: 'top' })
        } finally {
            setCartLoading(false)
            setActionLocked(false)
        }
    }

    // ── View / Open URL — with action lock ────────────────────────────────────
    const viewControll = async () => {
        if (actionLocked) return

        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' })
            return
        }

        // Lock actions & show modal
        setActionLocked(true)
        setActionMessage('Opening product page...')

        try {
            // fire purchase intent — non-blocking
            axios
                .post(
                    `${API_BASE_URL}${TOTAL_SUMMERY_POST}${product?.slug}/record_purchase_intent/`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    }
                )
                .catch(() => { })

            // open URL immediately — no need to await the API
            if (mainListing?.external_url) {
                const supported = await Linking.canOpenURL(mainListing.external_url)
                if (supported) {
                    await Linking.openURL(mainListing.external_url)
                } else {
                    toast.show({ message: 'Cannot open this URL', type: 'error', style: 'top' })
                }
            }
        } finally {
            // small delay so the modal doesn't flash
            setTimeout(() => setActionLocked(false), 500)
        }
    }

    const openUrl = async (url?: string) => {
        if (!url) return
        const supported = await Linking.canOpenURL(url)
        if (supported) await Linking.openURL(url)
        else toast.show({ message: 'Cannot open this URL', type: 'error', style: 'top' })
    }

    const mainListing = useMemo(() => product?.listings?.[0], [product])

    const sortedListings = useMemo(() => {
        if (!product?.listings) return []
        return [...product.listings].sort(
            (a, b) => (a.total_price ?? Number(a.price)) - (b.total_price ?? Number(b.price))
        )
    }, [product])

    const sortedCompare = useMemo(() => {
        if (!compareData?.price_comparison) return []
        return [...compareData.price_comparison].sort((a, b) => a.total_price - b.total_price)
    }, [compareData])

    const imageSource = product?.main_image
        ? { uri: product.main_image }
        : { uri: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' }

    const isAvailable = mainListing?.is_available === true

    // ── Render: Skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return <ProductDetailsSkeleton />
    }

    // ── Render: Empty / Error state ───────────────────────────────────────────
    if (error || !product) {
        return <EmptyState onRetry={fetchProductDetails} />
    }
    console.log(mainListing?.external_url)
    // ── Render: Main UI ───────────────────────────────────────────────────────
    return (
        <SafeAreaView className="flex-1 bg-[#F9F9FB]">
            {/* Action conflict modal */}
            <ActionLoadingModal visible={actionLocked} message={actionMessage} />

            <View className="px-5 pb-3 mb-4 border-b-2 border-[#E5E7EB]">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold text-gray-900">Product Detail</Text>

                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={toggleFavorite}
                        disabled={favLoading}
                    >
                        {favLoading ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <Ionicons
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={20}
                                color="#EF4444"
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                    style={{ width: '100%', height: 250 }}
                    source={imageSource}
                    resizeMode="contain"
                />

                <View className="px-5">
                    <View className="flex-row justify-between my-4">

                            <Text className="text-xl font-bold">
                                {product?.title || 'No title found'}
                            </Text>

                    </View>

                    <View className='flex-row items-center justify-between'>
                        <View className='gap-2'>
                            <View className="items-center flex-row gap-2">
                                <Entypo name="shop" size={20} color="#2355B6" />
                                <Text className="text-xl text-[#2355B6] font-bold self-center">
                                    {product?.platform_name}
                                </Text>
                            </View>

                            <View className="bg-[#27C8401A] p-2 rounded-full mt-2 flex-row items-center justify-center gap-2">
                                <MaterialIcons name="verified" size={20} color="#137C0A" />
                                <Text className="text-[#137C0A] text-xl font-bold">
                                    {mainListing?.condition || 'N/A'}
                                </Text>
                            </View>
                        </View>
                        <View className='gap-2'>
                            <View className='gap-2'>
                                <Text className='text-xl font-bold self-center'> ⭐ {product?.rating}</Text>
                            </View>
                            <View className='flex-row items-center gap-2 self-center'>
                                <MaterialIcons name="reviews" size={24} color="#2355B6" />
                                <Text className='text-xl font-bold'>{product?.review_count}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="border-2 border-[#E5E7EB] p-5 rounded-2xl my-5 bg-white">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-[#636F85] text-xl">LOWEST PRICE FOUND</Text>
                            <Text className="bg-[#FFC649] p-2 rounded-xl">BEST DEAL</Text>
                        </View>

                        <View className="flex-row items-end gap-2 my-2">
                            <Text className="text-4xl text-[#2355B6] font-bold">
                                ${product?.price ?? mainListing?.price ?? '0.00'}
                            </Text>

                            {!!mainListing?.original_price && Number(mainListing.original_price) > 0 && (
                                <Text className="text-[#A1A8B3] text-xl line-through">
                                    ${mainListing.original_price}
                                </Text>
                            )}
                        </View>

                        {!!mainListing?.discount_percentage &&
                            Number(mainListing.discount_percentage) > 0 && (
                                <Text className="text-[#34C759] text-xl">
                                    You save {Math.round(Number(mainListing.discount_percentage))}%
                                </Text>
                            )}

                        <Text className="text-[#34C759] text-xl">
                            {mainListing?.free_shipping
                                ? 'Free Shipping Available'
                                : mainListing?.shipping_cost
                                    ? 'Shipping Cost: ' + mainListing?.shipping_cost
                                    : ''}
                        </Text>

                        <View className="mt-4 flex-row items-center gap-2">
                            <Pressable className="bg-[#e1e6eb] px-6 py-4 rounded-xl">
                                <MaterialCommunityIcons
                                    name="open-in-new"
                                    size={30}
                                    color="#334155"
                                />
                                <Text className="text-[#636F85]">Share</Text>
                            </Pressable>
                            {/* amar akahne akta issue suru hoice add to cart button disabled hoy ace ki karone janao */}
                            {mainListing?.external_url ? (
                                <Pressable
                                    onPress={viewControll}
                                    disabled={actionLocked}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#2355B6',
                                        opacity: actionLocked ? 0.6 : 1,
                                        borderRadius: 12,
                                        paddingVertical: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center', // ✅ centers content
                                        gap: 8,
                                    }}
                                    className='py-7'
                                >
                                    <MaterialCommunityIcons name="open-in-new" size={26} color="white" />
                                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>View</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    onPress={handleAddToCart}
                                        disabled={cartLoading || !isAvailable || isInCart || actionLocked}
                                        style={{
                                            flex: 1,
                                            backgroundColor: isInCart ? '#16A34A' : '#2355B6',
                                            opacity: cartLoading || !isAvailable || actionLocked ? 0.6 : 1,
                                            borderRadius: 12,
                                            paddingVertical: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center', // ✅ centers content
                                            gap: 8,
                                        }}
                                        className='py-7'
                                    >
                                        {cartLoading ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Feather
                                                name={isInCart ? 'check-circle' : 'shopping-cart'}
                                                size={26}
                                                color="white"
                                            />
                                        )}
                                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }} >
                                            {cartLoading ? 'Adding...' : isInCart ? 'In Cart' : 'Add to Cart'}
                                        </Text>
                                    </Pressable>
                            )}
                        </View>
                    </View>

                    <View className="border-2 border-[#E5E7EB] p-5 rounded-2xl my-5 bg-white">
                        <Text className="text-2xl font-bold mb-3">Description</Text>
                        <Text className="text-[#636F85] text-base leading-6">
                            {product?.description?.trim()
                                ? product.description
                                : 'No description available for this product.'}
                        </Text>
                    </View>

                    {(compareLoading || sortedCompare.length > 0) && (
                        <>
                            <View className="flex-row items-center justify-between my-4">
                                <Text className="text-2xl font-bold">Price Comparison</Text>
                                {sortedCompare.length > 0 && (
                                    <Text className="text-sm text-[#636F85]">
                                        {sortedCompare.length} stores
                                    </Text>
                                )}
                            </View>

                            {compareLoading ? (
                                <View className="items-center py-6">
                                    <ActivityIndicator size="large" color="#2355B6" />
                                    <Text className="mt-2 text-[#636F85]">
                                        Finding best prices...
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {compareData?.price_analysis &&
                                        compareData.price_analysis.potential_savings > 0 && (
                                            <View style={styles.savingsBanner}>
                                                <MaterialIcons
                                                    name="savings"
                                                    size={20}
                                                    color="#16A34A"
                                                />
                                                <Text style={styles.savingsText}>
                                                    Save up to $
                                                    {compareData.price_analysis.potential_savings.toFixed(2)}
                                                </Text>
                                                </View>
                                            )}

                                        <FlatList
                                            data={sortedCompare}
                                            keyExtractor={(item, index) =>
                                                String(item.listing_id ?? item.product_id ?? index)
                                            }
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{
                                                paddingBottom: 24,
                                                paddingRight: 8,
                                            }}
                                            ItemSeparatorComponent={() => (
                                                <View style={{ width: 14 }} />
                                            )}
                                            renderItem={({ item }) => {
                                                const displayName =
                                                    item.clean_title ||
                                                    item.seller ||
                                                    item.platform ||
                                                    'Unknown Store'
                                                const storeName =
                                                    item.seller || item.platform || 'Store'

                                                return (
                                                    <Pressable
                                                        onPress={() => openUrl(item.url)}
                                                        style={styles.compareCard}
                                                    >
                                                        <View style={styles.compareHeartBtn}>
                                                            <Ionicons
                                                                name="heart-outline"
                                                                size={18}
                                                                color="#9CA3AF"
                                                            />
                                                        </View>

                                                        <View style={styles.compareImageWrap}>
                                                            {item.main_image ? (
                                                                <Image
                                                                    source={{ uri: item.main_image }}
                                                                    style={styles.compareImage}
                                                                    resizeMode="stretch"
                                                                />
                                                            ) : (
                                                                <View style={styles.compareImageFallback}>
                                                                    <MaterialIcons
                                                                        name="image-not-supported"
                                                                        size={28}
                                                                        color="#9CA3AF"
                                                                    />
                                                                </View>
                                                            )}
                                                        </View>

                                                        <View style={styles.compareBody}>
                                                            <Text
                                                                numberOfLines={2}
                                                                style={styles.compareTitle}
                                                            >
                                                                {displayName}
                                                            </Text>

                                                            <Text style={styles.comparePrice}>
                                                                $
                                                                {Number(
                                                                    item.total_price ?? item.price ?? 0
                                                                ).toFixed(2)}
                                                            </Text>

                                                            <View style={styles.compareFooter}>
                                                                <View style={styles.compareStoreWrap}>
                                                                    <MaterialIcons
                                                                        name="storefront"
                                                                        size={14}
                                                                        color="#9CA3AF"
                                                                    />
                                                                    <Text
                                                                        numberOfLines={1}
                                                                        style={styles.compareStoreText}
                                                                    >
                                                                        {storeName}
                                                                    </Text>
                                                                </View>

                                                                <View style={styles.compareArrowWrap}>
                                                                    <MaterialCommunityIcons
                                                                        name="arrow-right"
                                                                        size={18}
                                                                        color="#9CA3AF"
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </Pressable>
                                                )
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            <Pressable
                onPress={() => setChatModalVisible(true)}
                className='absolute right-12 bottom-10 bg-white p-2 rounded-full border-2 border-[#FFC64933]'
            >
                <Ionicons name="chatbubble-ellipses" size={40} color="#FFC649" />
            </Pressable>

            <ChatModal
                visible={chatModalVisible}
                onClose={() => setChatModalVisible(false)}
            />

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                style={toast.style}
                onHide={toast.hide}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    favoriteButton: {
        marginLeft: 'auto',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF1F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    savingsBanner: {
        backgroundColor: '#ECFDF3',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    savingsText: {
        color: '#15803D',
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
    compareCard: {
        width: 170,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 8,
    },
    compareHeartBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    compareImageWrap: {
        width: '100%',
        height: 138,
        backgroundColor: '#F8FAFC',
    },
    compareImage: {
        width: '100%',
        height: '100%',
    },
    compareImageFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compareBody: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 10,
    },
    compareTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 20,
        minHeight: 40,
    },
    comparePrice: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginTop: 8,
    },
    compareFooter: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    compareStoreWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    compareStoreText: {
        marginLeft: 4,
        fontSize: 13,
        color: '#9CA3AF',
        flexShrink: 1,
    },
    compareArrowWrap: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listingCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        position: 'relative',
    },
    listingCardBest: {
        borderColor: '#2355B6',
        shadowColor: '#2355B6',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    bestPriceBadge: {
        position: 'absolute',
        top: -10,
        left: 14,
        backgroundColor: '#2355B6',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        zIndex: 2,
    },
    bestPriceText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    listingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    logoImage: {
        width: 34,
        height: 34,
    },
    listingInfo: {
        flex: 1,
        paddingRight: 8,
    },
    listingPlatformName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    listingShipping: {
        fontSize: 13,
        color: '#64748B',
    },
    listingRight: {
        alignItems: 'flex-end',
    },
    priceCol: {
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    listingPrice: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    listingPriceBest: {
        color: '#2355B6',
    },
    listingOriginal: {
        fontSize: 12,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
        marginTop: 2,
    },
    listingDiscount: {
        fontSize: 12,
        color: '#16A34A',
        fontWeight: '700',
        marginTop: 2,
    },
    listingBtn: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 86,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listingBtnSecondary: {
        backgroundColor: '#EFF6FF',
    },
    listingBtnCart: {
        backgroundColor: '#16A34A',
    },
    listingBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    listingBtnTextSecondary: {
        color: '#2355B6',
    },
})

export default ProductDetails