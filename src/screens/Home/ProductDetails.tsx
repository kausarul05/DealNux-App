// ProductDetails.tsx - With Comparison Loading & Polling
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
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { WebView } from 'react-native-webview'

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

// ─── WebView Modal ────────────────────────────────────────────────────────────
const WebViewModal = ({
    visible,
    onClose,
    url,
    title = 'External Link',
}: {
    visible: boolean;
    onClose: () => void;
    url: string;
    title?: string;
}) => {
    const [loading, setLoading] = useState(true);

    if (!url) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="fullScreen"
        >
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                <View style={styles.webViewHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.webViewClose}>
                        <Ionicons name="close" size={28} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.webViewTitle} numberOfLines={1}>{title || 'External Link'}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(url)} style={styles.webViewOpen}>
                        <Ionicons name="open-outline" size={22} color="#2355B6" />
                    </TouchableOpacity>
                </View>
                {loading && (
                    <View style={styles.webViewLoading}>
                        <ActivityIndicator size="large" color="#2355B6" />
                        <Text style={styles.webViewLoadingText}>Loading page...</Text>
                    </View>
                )}
                <WebView
                    source={{ uri: url }}
                    style={styles.webView}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    startInLoadingState={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                />
            </View>
        </Modal>
    )
}

// ─── Comparison Loading Component ────────────────────────────────────────────
const ComparisonLoading = ({ progress, message }: { progress: number; message: string }) => {
    return (
        <View style={styles.compareLoadingContainer}>
            <View style={styles.compareLoadingCard}>
                <ActivityIndicator size="large" color="#2355B6" />
                <Text style={styles.compareLoadingTitle}>Finding Best Prices</Text>
                <Text style={styles.compareLoadingSubtitle}>{message}</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                <View style={styles.loadingDots}>
                    <View style={[styles.loadingDot, styles.loadingDotActive]} />
                    <View style={[styles.loadingDot, progress > 30 && styles.loadingDotActive]} />
                    <View style={[styles.loadingDot, progress > 60 && styles.loadingDotActive]} />
                </View>
            </View>
        </View>
    )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
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
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', marginTop: 50 }}>
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
        </View>
    )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ onRetry }: { onRetry: () => void }) => {
    const navigation = useNavigation()
    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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
        </View>
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
    const [compareProgress, setCompareProgress] = useState(0)
    const [compareMessage, setCompareMessage] = useState('Checking prices...')
    const [compareAttempts, setCompareAttempts] = useState(0)
    const maxCompareAttempts = 5

    // ─── WebView Modal State ──────────────────────────────────────────────────
    const [webViewVisible, setWebViewVisible] = useState(false)
    const [webViewUrl, setWebViewUrl] = useState('')
    const [webViewTitle, setWebViewTitle] = useState('')

    const [actionLocked, setActionLocked] = useState(false)
    const [actionMessage, setActionMessage] = useState('Processing...')

    const [showCompareSection, setShowCompareSection] = useState(false);


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

    const loadComparison = useCallback(async () => {
        if (!product?.slug) {
            toast.show({ message: 'Product slug not available', type: 'error', style: 'top' });
            return;
        }

        setShowCompareSection(true);
        setCompareLoading(true);
        setCompareProgress(5);
        setCompareMessage('Finding best deals...');
        setCompareAttempts(0);

        const result = await pollForCompareData(product.slug, 0);

        if (!result) {
            toast.show({
                message: 'No comparison data found for this product',
                type: 'info',
                style: 'top'
            });
        }
    }, [product?.slug, pollForCompareData, toast]);

    // ── Comparison Polling ────────────────────────────────────────────────────
    const pollForCompareData = useCallback(async (slug: string, attempt = 0) => {
        try {
            const token = await AsyncStorage.getItem('vToken')
            const url = `${API_BASE_URL}${COMPARE_PRODUCT}${slug}/`
            const response = await axios.get(url, {
                headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            })

            const data: CompareData = response?.data?.data ?? response?.data

            // Check if we have comparison data
            if (data?.price_comparison && data.price_comparison.length > 0) {
                setCompareData(data)
                setCompareLoading(false)
                setCompareProgress(100)
                return true
            }

            // If no data and we haven't exceeded max attempts
            if (attempt < maxCompareAttempts) {
                // Update progress based on attempt
                const newProgress = Math.min(20 + (attempt * 16), 90)
                setCompareProgress(newProgress)

                const messages = [
                    'Searching across platforms...',
                    'Checking Amazon...',
                    'Checking eBay...',
                    'Checking Walmart...',
                    'Checking BestBuy...',
                    'Almost done...'
                ]
                setCompareMessage(messages[Math.min(attempt, messages.length - 1)])
                setCompareAttempts(attempt + 1)

                // Wait 2 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 2000))
                return pollForCompareData(slug, attempt + 1)
            }

            // Max attempts reached, show what we have or empty state
            setCompareLoading(false)
            setCompareProgress(100)
            return false
        } catch (err: any) {
            console.log('compare error', err?.response?.data || err?.message)
            if (attempt < maxCompareAttempts) {
                setCompareProgress(Math.min(20 + (attempt * 16), 90))
                await new Promise(resolve => setTimeout(resolve, 2000))
                return pollForCompareData(slug, attempt + 1)
            }
            setCompareLoading(false)
            return false
        }
    }, [])

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

            // ❌ REMOVED auto-load comparison
            // if (productData?.slug) {
            //     setCompareLoading(true)
            //     setCompareProgress(5)
            //     setCompareMessage('Finding best deals...')
            //     pollForCompareData(productData.slug, 0)
            // }
        } catch (err: any) {
            console.log('product details error', err?.response?.data || err?.message)
            setError('Failed to load product details')
        } finally { setLoading(false) }
    }

    // ─── Render Comparison Section ────────────────────────────────────────────
    const renderComparisonSection = () => {
        // If user hasn't clicked "Load Comparison" yet
        if (!showCompareSection) {
            return (
                <View style={styles.section}>
                    <View style={styles.compareHeader}>
                        <Text style={styles.sectionTitle}>🏷️ Price Comparison</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.loadCompareButton}
                        onPress={loadComparison}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#2355B6', '#1A4D8F']}
                            style={styles.loadCompareGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialIcons name="compare-arrows" size={22} color="#FFFFFF" />
                            <Text style={styles.loadCompareText}>Compare Prices</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.loadCompareSubtext}>
                        Compare prices across multiple platforms to find the best deal
                    </Text>
                </View>
            )
        }

        // If loading
        if (compareLoading) {
            return (
                <View style={styles.section}>
                    <View style={styles.compareHeader}>
                        <Text style={styles.sectionTitle}>🏷️ Price Comparison</Text>
                        <Text style={styles.compareCount}>Searching...</Text>
                    </View>
                    <ComparisonLoading progress={compareProgress} message={compareMessage} />
                </View>
            )
        }

        // If has compare data
        if (hasCompareData) {
            return (
                <View style={styles.section}>
                    <View style={styles.compareHeader}>
                        <Text style={styles.sectionTitle}>🏷️ Price Comparison</Text>
                        <Text style={styles.compareCount}>{sortedCompare.length} stores</Text>
                    </View>

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
                            <TouchableOpacity
                                style={styles.compareItem}
                                onPress={() => handleCompareItemPress(item)}
                                activeOpacity={0.8}
                            >
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
                </View>
            )
        }

        // If no compare data found
        return (
            <View style={styles.section}>
                <View style={styles.compareHeader}>
                    <Text style={styles.sectionTitle}>🏷️ Price Comparison</Text>
                </View>
                <View style={styles.noCompareContainer}>
                    <MaterialIcons name="compare-arrows" size={48} color="#D1D5DB" />
                    <Text style={styles.noCompareTitle}>No price comparison available</Text>
                    <Text style={styles.noCompareText}>We couldn't find this product on other platforms.</Text>
                    <TouchableOpacity
                        style={styles.retryCompareButton}
                        onPress={loadComparison}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="refresh" size={18} color="#2355B6" />
                        <Text style={styles.retryCompareText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    const fetchCompare = async (slug: string) => {
        // This is now handled by pollForCompareData
    }

    useEffect(() => { fetchProductDetails() }, [productId])

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
            }).catch(() => { })
        } catch (error: any) {
            const msg: string = error?.response?.data?.message || ''
            toast.show({ message: msg || 'Failed to add to cart', type: 'error', style: 'top' })
        } finally { setCartLoading(false); setActionLocked(false) }
    }

    // ── View / Open URL with WebView ─────────────────────────────────────────
    const openUrlInWebView = (url: string, title?: string) => {
        if (!url) return
        setWebViewUrl(url)
        setWebViewTitle(title || 'External Link')
        setWebViewVisible(true)
    }

    // ── View Deal ─────────────────────────────────────────────────────────────
    const handleViewDeal = async () => {
        if (actionLocked) return

        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' })
            return
        }

        setActionLocked(true)
        setActionMessage('Opening product page...')

        try {
            axios.post(`${API_BASE_URL}${TOTAL_SUMMERY_POST}${product?.slug}/record_purchase_intent/`, {}, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
            }).catch(() => { })

            const externalUrl = mainListing?.external_url

            if (externalUrl) {
                openUrlInWebView(externalUrl, product?.title || 'Product Deal')
            } else {
                toast.show({ message: 'No external URL available', type: 'error', style: 'top' })
            }
        } catch (error: any) {
            console.error('View deal error:', error)
            toast.show({ message: 'Failed to open product page', type: 'error', style: 'top' })
        } finally {
            setTimeout(() => setActionLocked(false), 500)
        }
    }

    // ─── Handle Compare Item Press ────────────────────────────────────────────
    const handleCompareItemPress = (item: CompareItem) => {
        if (item.url) {
            openUrlInWebView(item.url, item.seller || item.platform || 'Store')
        }
    }

    // ─── Handle Share ──────────────────────────────────────────────────────────
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

    const getProductImage = useCallback(() => {
        // 1. First try: product's main_image
        if (product?.main_image && product.main_image.trim() !== '') {
            return { uri: product.main_image };
        }

        // 2. Second try: best deal image from compare data
        if (compareData?.best_deal?.main_image && compareData.best_deal.main_image.trim() !== '') {
            return { uri: compareData.best_deal.main_image };
        }

        // 3. Third try: first price comparison image
        if (compareData?.price_comparison && compareData.price_comparison.length > 0) {
            const firstItem = compareData.price_comparison[0];
            if (firstItem.main_image && firstItem.main_image.trim() !== '') {
                return { uri: firstItem.main_image };
            }
        }

        // 4. Fourth try: check all price comparisons for any image
        if (compareData?.price_comparison) {
            for (const item of compareData.price_comparison) {
                if (item.main_image && item.main_image.trim() !== '') {
                    return { uri: item.main_image };
                }
            }
        }

        // 5. Fallback: placeholder
        return { uri: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' };
    }, [product, compareData]);

    const imageSource = getProductImage();

    const isAvailable = mainListing?.is_available === true
    const hasCompareData = sortedCompare.length > 0

    if (loading) return <ProductDetailsSkeleton />
    if (error || !product) return <EmptyState onRetry={fetchProductDetails} />

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
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

                {/* Content - YOUR EXISTING DESIGN PRESERVED */}
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
                                <TouchableOpacity style={styles.viewButton} onPress={handleViewDeal} disabled={actionLocked}>
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

                    {/* Price Comparison Section */}
                    {renderComparisonSection()}
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

            {/* ─── WebView Modal ──────────────────────────────────────────────── */}
            <WebViewModal
                visible={webViewVisible}
                onClose={() => {
                    setWebViewVisible(false)
                    setWebViewUrl('')
                    setWebViewTitle('')
                }}
                url={webViewUrl}
                title={webViewTitle}
            />
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC',  },

    // Floating Header
    floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: 8, backgroundColor: '#F8FAFC' },
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

    compareLoadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
    compareLoadingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: '#E5E7EB' },
    compareLoadingTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 16 },
    compareLoadingSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4, textAlign: 'center' },
    progressBarContainer: { width: '100%', height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#2355B6', borderRadius: 3 },
    progressText: { fontSize: 12, color: '#64748B', marginTop: 6 },
    loadingDots: { flexDirection: 'row', gap: 8, marginTop: 12 },
    loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB' },
    loadingDotActive: { backgroundColor: '#2355B6' },

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

    noCompareContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    noCompareTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
    noCompareText: { fontSize: 14, color: '#64748B', marginTop: 4, textAlign: 'center' },

    // Chat Button
    chatButton: { position: 'absolute', bottom: 24, right: 24, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    chatGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },

    // ─── WebView Styles ──────────────────────────────────────────────────────
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    webViewClose: { padding: 8 },
    webViewTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1, marginLeft: 8 },
    webViewOpen: { padding: 8 },
    webView: { flex: 1 },
    webViewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    webViewLoadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
    loadCompareButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
    },
    loadCompareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 10,
    },
    loadCompareText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    loadCompareSubtext: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
    },
    retryCompareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
    },
    retryCompareText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2355B6',
    },
})

export default ProductDetails