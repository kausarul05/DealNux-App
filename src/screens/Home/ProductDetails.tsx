// ProductDetails.tsx - Fixed Version
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
    Dimensions,
    Easing,
    FlatList,
    Image,
    ImageSourcePropType,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'

import BackButton from '../../components/BackButton'
import ChatModal from '../../components/ChatModal'
import { Toast, useToast } from '../../components/useToost'
import { Images } from '../../constants'
import { AuthStackParamList } from '../../Navigation/types'

const { width } = Dimensions.get('window')
const API_BASE_URL = IPA_BASE

type RouteParams = { productId: string | number }

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

// ─── Skeleton Loader (FIXED) ────────────────────────────────────────────────
const ProductDetailsSkeleton = () => {
    const shimmerAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        )
        shimmer.start()
        return () => shimmer.stop()
    }, [])

    // ✅ FIXED: Use number values for outputRange
    const SkeletonItem = ({ w, h, rounded = 8 }: { w: number; h: number; rounded?: number }) => {
        const translateX = shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-w, w],
        })

        return (
            <View style={[{ width: w, height: h, borderRadius: rounded, backgroundColor: '#E5E7EB', overflow: 'hidden' }]}>
                <Animated.View
                    style={[
                        {
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            transform: [{ translateX }],
                        },
                    ]}
                />
            </View>
        )
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SkeletonItem w={40} h={40} rounded={20} />
                <SkeletonItem w={120} h={20} rounded={6} />
                <SkeletonItem w={40} h={40} rounded={20} />
            </View>
            <SkeletonItem w={width} h={280} rounded={0} />
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                <SkeletonItem w={width * 0.8} h={24} rounded={6} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                    <SkeletonItem w={120} h={20} rounded={6} />
                    <SkeletonItem w={80} h={20} rounded={6} />
                </View>
                <View style={{ marginTop: 16 }}>
                    <SkeletonItem w={width - 40} h={160} rounded={16} />
                </View>
                <View style={{ marginTop: 16 }}>
                    <SkeletonItem w={width * 0.4} h={22} rounded={6} />
                    <SkeletonItem w={width - 40} h={80} rounded={16} style={{ marginTop: 8 }} />
                </View>
            </View>
        </SafeAreaView>
    )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ onRetry }: { onRetry: () => void }) => {
    const navigation = useNavigation()
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40 }}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <MaterialIcons name="inventory-2" size={52} color="#CBD5E1" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>Product Not Found</Text>
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                    We couldn't load the product details.{'\n'}Please check your connection and try again.
                </Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2355B6', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }} onPress={onRetry}>
                    <MaterialIcons name="refresh" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Try Again</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

// ─── Action Loading Modal ────────────────────────────────────────────────────
const ActionLoadingModal = ({ visible, message = 'Processing...' }: { visible: boolean; message?: string }) => {
    const dash1 = useRef(new Animated.Value(0.3)).current
    const dash2 = useRef(new Animated.Value(0.3)).current
    const dash3 = useRef(new Animated.Value(0.3)).current

    useEffect(() => {
        if (!visible) return
        const animate = (val: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0.3, duration: 400, easing: Easing.ease, useNativeDriver: true }),
                ])
            )
        const a1 = animate(dash1, 0)
        const a2 = animate(dash2, 180)
        const a3 = animate(dash3, 360)
        a1.start(); a2.start(); a3.start()
        return () => { a1.stop(); a2.stop(); a3.stop(); dash1.setValue(0.3); dash2.setValue(0.3); dash3.setValue(0.3) }
    }, [visible])

    return (
        <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 36, paddingVertical: 28, alignItems: 'center', gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, minWidth: 200 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {[dash1, dash2, dash3].map((anim, i) => (
                            <Animated.View key={i} style={{ width: 48, height: 6, borderRadius: 99, backgroundColor: '#2355B6', opacity: anim }} />
                        ))}
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', textAlign: 'center' }}>{message}</Text>
                </View>
            </View>
        </Modal>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductDetails = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
    const route = useRoute()
    const { productId } = route.params as RouteParams
    const toast = useToast()
    const scrollY = useRef(new Animated.Value(0)).current

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

    const [actionLocked, setActionLocked] = useState(false)
    const [actionMessage, setActionMessage] = useState('Processing...')

    // ── Header Animation ──────────────────────────────────────────────────────
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    })

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [-50, 0],
        extrapolate: 'clamp',
    })

    // ── Fetch Functions ────────────────────────────────────────────────────────
    const fetchProductDetails = async () => {
        if (!productId) { setError('Product id missing'); return }
        try {
            setLoading(true); setError('')
            const token = await AsyncStorage.getItem('vToken')
            const url = `${API_BASE_URL}${PRODUCT_DETAILS}${productId}/detail/`
            const response = await axios.get(url, {
                headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })
            const productData: ProductData = response?.data?.data ?? response?.data
            setProduct(productData)
            setIsFavorite(productData?.is_favorite === true)
            setIsInCart(productData?.is_cart === true)
        } catch (err: any) {
            console.log('product details error', err?.response?.data || err?.message)
            setError('Failed to load product details')
        } finally { setLoading(false) }
    }

    const fetchCompare = async (slug: string) => {
        if (!slug) return
        try {
            setCompareLoading(true)
            const token = await AsyncStorage.getItem('vToken')
            const url = `${API_BASE_URL}${COMPARE_PRODUCT}${slug}/`
            const response = await axios.get(url, {
                headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })
            const data: CompareData = response?.data?.data ?? response?.data
            setCompareData(data)
        } catch (err: any) {
            console.log('compare error', err?.response?.data || err?.message)
        } finally { setCompareLoading(false) }
    }

    useEffect(() => { fetchProductDetails() }, [productId])
    useEffect(() => { if (product?.slug) fetchCompare(product.slug) }, [product?.slug])

    // ── Toggle Favorite ──────────────────────────────────────────────────────
    const toggleFavorite = async () => {
        const token = await AsyncStorage.getItem('vToken')
        if (!token) { toast.show({ message: 'Token missing', type: 'error', style: 'top' }); return }
        setFavLoading(true)
        try {
            if (isFavorite) {
                await axios.delete(`${API_BASE_URL}${REMOVE_FAVORITE}`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
                    data: { product_id: Number(productId) },
                })
                setIsFavorite(false)
                toast.show({ message: 'Removed from favorites', type: 'success', style: 'top' })
            } else {
                await axios.post(`${API_BASE_URL}${ADD_FAVORITE}`, { product_id: Number(productId) }, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
                })
                setIsFavorite(true)
                toast.show({ message: 'Added to favorites', type: 'success', style: 'top' })
            }
        } catch (error: any) {
            const msg: string = error?.response?.data?.message || ''
            const status: number = error?.response?.status
            if (status === 400 && msg.toLowerCase().includes('already in favorites')) { setIsFavorite(true); return }
            toast.show({ message: msg || 'Favorite update failed', type: 'error', style: 'top' })
        } finally { setFavLoading(false) }
    }

    // ── Add to Cart ──────────────────────────────────────────────────────────
    const handleAddToCart = async () => {
        if (isInCart || actionLocked) return
        const token = await AsyncStorage.getItem('vToken')
        if (!token) { toast.show({ message: 'Token missing', type: 'error', style: 'top' }); return }
        if (!mainListing?.id) { toast.show({ message: 'No listing available', type: 'error', style: 'top' }); return }

        setActionLocked(true); setActionMessage('Adding to cart...'); setCartLoading(true)
        try {
            await axios.post(`${API_BASE_URL}${ADD_CART}`, { product_id: Number(productId) }, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
            })
            setIsInCart(true)
            toast.show({ message: 'Added to cart successfully', type: 'success', style: 'top' })
            axios.post(`${API_BASE_URL}${TOTAL_SUMMERY_POST}${product?.slug}/record_purchase_intent/`, {}, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
            }).catch(() => {})
        } catch (error: any) {
            const msg: string = error?.response?.data?.message || ''
            toast.show({ message: msg || 'Failed to add to cart', type: 'error', style: 'top' })
        } finally { setCartLoading(false); setActionLocked(false) }
    }

    // ── View / Open URL ──────────────────────────────────────────────────────
    const viewControll = async () => {
        if (actionLocked) return
        const token = await AsyncStorage.getItem('vToken')
        if (!token) { toast.show({ message: 'Token missing', type: 'error', style: 'top' }); return }

        setActionLocked(true); setActionMessage('Opening product page...')
        try {
            axios.post(`${API_BASE_URL}${TOTAL_SUMMERY_POST}${product?.slug}/record_purchase_intent/`, {}, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
            }).catch(() => {})
            if (mainListing?.external_url) {
                const supported = await Linking.canOpenURL(mainListing.external_url)
                if (supported) await Linking.openURL(mainListing.external_url)
                else toast.show({ message: 'Cannot open this URL', type: 'error', style: 'top' })
            }
        } finally { setTimeout(() => setActionLocked(false), 500) }
    }

    const openUrl = async (url?: string) => {
        if (!url) return
        const supported = await Linking.canOpenURL(url)
        if (supported) await Linking.openURL(url)
        else toast.show({ message: 'Cannot open this URL', type: 'error', style: 'top' })
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${product?.title} on DealNux!`,
                url: mainListing?.external_url || '',
            })
        } catch (error) {
            console.log('Share error', error)
        }
    }

    const mainListing = useMemo(() => product?.listings?.[0], [product])
    const sortedCompare = useMemo(() => {
        if (!compareData?.price_comparison) return []
        return [...compareData.price_comparison].sort((a, b) => a.total_price - b.total_price)
    }, [compareData])

    const imageSource = product?.main_image
        ? { uri: product.main_image }
        : { uri: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' }

    const isAvailable = mainListing?.is_available === true

    if (loading) return <ProductDetailsSkeleton />
    if (error || !product) return <EmptyState onRetry={fetchProductDetails} />

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <ActionLoadingModal visible={actionLocked} message={actionMessage} />

            {/* Floating Header */}
            <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
                <BlurView intensity={80} tint="light" style={styles.blurHeader}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text numberOfLines={1} style={styles.headerTitle}>{product?.title || 'Product'}</Text>
                        <TouchableOpacity onPress={toggleFavorite} disabled={favLoading} style={styles.headerBtn}>
                            {favLoading ? <ActivityIndicator size="small" color="#EF4444" /> :
                                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#EF4444' : '#1F2937'} />}
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                scrollEventThrottle={16}
            >
                {/* Hero Image */}
                <View style={styles.imageContainer}>
                    <Image source={imageSource} style={styles.heroImage} resizeMode="cover" />
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']} style={styles.imageGradient} />
                    
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backOverlay}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={toggleFavorite} disabled={favLoading} style={styles.favOverlay}>
                        <BlurView intensity={60} tint="dark" style={styles.favBlur}>
                            {favLoading ? <ActivityIndicator size="small" color="#EF4444" /> :
                                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#EF4444' : '#FFFFFF'} />}
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Title & Meta */}
                    <View style={styles.titleSection}>
                        <Text style={styles.productTitle}>{product?.title}</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.platformBadge}>
                                <Entypo name="shop" size={14} color="#2355B6" />
                                <Text style={styles.platformText}>{product?.platform_name}</Text>
                            </View>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={14} color="#F59E0B" />
                                <Text style={styles.ratingText}>{product?.rating?.toFixed(1) || '0'}</Text>
                                <Text style={styles.reviewCount}>({product?.review_count || 0})</Text>
                            </View>
                        </View>
                    </View>

                    {/* Price Card */}
                    <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.priceCard}>
                        <View style={styles.priceHeader}>
                            <Text style={styles.priceLabel}>💰 BEST PRICE</Text>
                            {mainListing?.discount_percentage && Number(mainListing.discount_percentage) > 0 && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>-{Math.round(Number(mainListing.discount_percentage))}%</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.priceRow}>
                            <Text style={styles.priceAmount}>${product?.price ?? mainListing?.price ?? '0.00'}</Text>
                            {mainListing?.original_price && Number(mainListing.original_price) > 0 && (
                                <Text style={styles.originalPrice}>${mainListing.original_price}</Text>
                            )}
                        </View>

                        <View style={styles.shippingRow}>
                            {mainListing?.free_shipping ? (
                                <View style={styles.shippingBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                                    <Text style={styles.shippingText}>Free Shipping</Text>
                                </View>
                            ) : mainListing?.shipping_cost ? (
                                <Text style={styles.shippingCost}>Shipping: ${mainListing.shipping_cost}</Text>
                            ) : null}
                            {mainListing?.condition && (
                                <View style={styles.conditionBadge}>
                                    <MaterialIcons name="verified" size={14} color="#16A34A" />
                                    <Text style={styles.conditionText}>{mainListing.condition}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                                <MaterialCommunityIcons name="share-variant" size={22} color="#64748B" />
                                <Text style={styles.shareText}>Share</Text>
                            </TouchableOpacity>

                            {mainListing?.external_url ? (
                                <TouchableOpacity style={styles.viewButton} onPress={viewControll} disabled={actionLocked}>
                                    <LinearGradient colors={['#2355B6', '#1A4D8F']} style={styles.gradientBtn}>
                                        <MaterialCommunityIcons name="open-in-new" size={22} color="#FFF" />
                                        <Text style={styles.btnText}>View Deal</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.viewButton} onPress={handleAddToCart} disabled={cartLoading || !isAvailable || isInCart || actionLocked}>
                                    <LinearGradient colors={isInCart ? ['#16A34A', '#15803D'] : ['#2355B6', '#1A4D8F']} style={styles.gradientBtn}>
                                        {cartLoading ? <ActivityIndicator size="small" color="#FFF" /> : <>
                                            <Feather name={isInCart ? 'check-circle' : 'shopping-cart'} size={22} color="#FFF" />
                                            <Text style={styles.btnText}>{cartLoading ? 'Adding...' : isInCart ? 'In Cart' : 'Add to Cart'}</Text>
                                        </>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </LinearGradient>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📝 Description</Text>
                        <Text style={styles.description}>{product?.description?.trim() || 'No description available.'}</Text>
                    </View>

                    {/* Price Comparison */}
                    {(compareLoading || sortedCompare.length > 0) && (
                        <View style={styles.section}>
                            <View style={styles.compareHeader}>
                                <Text style={styles.sectionTitle}>🏷️ Price Comparison</Text>
                                {sortedCompare.length > 0 && <Text style={styles.compareCount}>{sortedCompare.length} stores</Text>}
                            </View>

                            {compareLoading ? (
                                <View style={styles.compareLoading}>
                                    <ActivityIndicator size="large" color="#2355B6" />
                                    <Text style={styles.compareLoadingText}>Finding best prices...</Text>
                                </View>
                            ) : (
                                <>
                                    {compareData?.price_analysis?.potential_savings > 0 && (
                                        <View style={styles.savingsBanner}>
                                            <MaterialIcons name="savings" size={20} color="#16A34A" />
                                            <Text style={styles.savingsText}>Save up to ${compareData.price_analysis.potential_savings.toFixed(2)}</Text>
                                        </View>
                                    )}

                                    <FlatList
                                        data={sortedCompare}
                                        keyExtractor={(item, index) => String(item.listing_id ?? item.product_id ?? index)}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.compareList}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity style={styles.compareItem} onPress={() => openUrl(item.url)} activeOpacity={0.8}>
                                                <View style={styles.compareImageWrap}>
                                                    {item.main_image ? (
                                                        <Image source={{ uri: item.main_image }} style={styles.compareImage} resizeMode="cover" />
                                                    ) : (
                                                        <View style={styles.compareImageFallback}>
                                                            <MaterialIcons name="image-not-supported" size={32} color="#9CA3AF" />
                                                        </View>
                                                    )}
                                                    {item === sortedCompare[0] && (
                                                        <LinearGradient colors={['#2355B6', '#1A4D8F']} style={styles.bestDealBadge}>
                                                            <Text style={styles.bestDealText}>⭐ BEST</Text>
                                                        </LinearGradient>
                                                    )}
                                                </View>
                                                <View style={styles.compareInfo}>
                                                    <Text numberOfLines={1} style={styles.compareStore}>{item.seller || item.platform || 'Store'}</Text>
                                                    <Text style={styles.comparePriceText}>${Number(item.total_price ?? item.price ?? 0).toFixed(2)}</Text>
                                                    <View style={styles.compareArrow}>
                                                        <MaterialCommunityIcons name="arrow-right" size={18} color="#2355B6" />
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </>
                            )}
                        </View>
                    )}
                </View>
            </Animated.ScrollView>

            {/* Chat Button */}
            <TouchableOpacity onPress={() => setChatModalVisible(true)} style={styles.chatButton}>
                <LinearGradient colors={['#FFC649', '#F59E0B']} style={styles.chatGradient}>
                    <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>

            <ChatModal visible={chatModalVisible} onClose={() => setChatModalVisible(false)} />
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    
    // Floating Header
    floatingHeader: { position: 'absolute', top: 40, left: 0, right: 0, zIndex: 100, paddingTop: 8, backgroundColor: '#F8FAFC' },
    blurHeader: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1F2937' },
    
    // Hero Image
    imageContainer: { position: 'relative', width: '100%', height: 300, backgroundColor: '#F1F5F9' },
    heroImage: { width: '100%', height: '100%' },
    imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
    backOverlay: { position: 'absolute', top: 12, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    favOverlay: { position: 'absolute', top: 12, right: 16, width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
    favBlur: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    
    // Content
    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    
    // Title Section
    titleSection: { marginBottom: 20 },
    productTitle: { fontSize: 22, fontWeight: '700', color: '#1F2937', lineHeight: 28, marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    platformBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#EFF6FF', borderRadius: 20 },
    platformText: { fontSize: 12, fontWeight: '600', color: '#2355B6' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FEF3C7', borderRadius: 20 },
    ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
    reviewCount: { fontSize: 11, color: '#92400E', opacity: 0.7 },
    
    // Price Card
    priceCard: { padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' },
    priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    priceLabel: { fontSize: 12, fontWeight: '600', color: '#3B82F6', letterSpacing: 0.5 },
    discountBadge: { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: '#EF4444', borderRadius: 12 },
    discountText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
    priceAmount: { fontSize: 34, fontWeight: '800', color: '#1F2937' },
    originalPrice: { fontSize: 16, color: '#94A3B8', textDecorationLine: 'line-through' },
    shippingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    shippingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    shippingText: { fontSize: 13, fontWeight: '500', color: '#16A34A' },
    shippingCost: { fontSize: 13, color: '#64748B' },
    conditionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#ECFDF5', borderRadius: 12 },
    conditionText: { fontSize: 11, fontWeight: '500', color: '#16A34A' },
    
    // Action Row
    actionRow: { flexDirection: 'row', gap: 12 },
    shareButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
    shareText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    viewButton: { flex: 1 },
    gradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    btnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    
    // Section
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    description: { fontSize: 14, lineHeight: 22, color: '#64748B' },
    
    // Compare
    compareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    compareCount: { fontSize: 13, color: '#64748B' },
    compareLoading: { alignItems: 'center', paddingVertical: 30 },
    compareLoadingText: { marginTop: 8, fontSize: 14, color: '#64748B' },
    savingsBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 12, marginBottom: 16 },
    savingsText: { fontSize: 14, fontWeight: '600', color: '#065F46' },
    compareList: { gap: 12, paddingBottom: 8 },
    compareItem: { width: 140, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    compareImageWrap: { position: 'relative', width: '100%', height: 120, backgroundColor: '#F8FAFC' },
    compareImage: { width: '100%', height: '100%' },
    compareImageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    bestDealBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    bestDealText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
    compareInfo: { padding: 12 },
    compareStore: { fontSize: 12, fontWeight: '500', color: '#64748B', marginBottom: 4 },
    comparePriceText: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    compareArrow: { alignItems: 'flex-end' },
    
    // Chat Button
    chatButton: { position: 'absolute', bottom: 24, right: 24, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    chatGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
})

export default ProductDetails