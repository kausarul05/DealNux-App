import {
    ADD_FAVORITE,
    ALL_PRODUCT,
    CATEGORIES_LIST,
    CATEGORY_PRODUCT,
    CLICK_ADS,
    IPA_BASE,
    PROFILE,
    RECOMMENDED_PRODUCT,
    REMOVE_FAVORITE,
    VIEW_ADS,
} from '@env'
import { Entypo, EvilIcons, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import axios from 'axios'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LinearGradient } from 'expo-linear-gradient'
import { AuthStackParamList } from '../../Navigation/types'
import AdsCarousel, { AdsItem } from '../../components/AdsCarousel'
import { HomeSkeleton } from '../../components/HomeSkeleton'
import PremiumModal from '../../components/PremiumModal'
import ProductCard, { ProductSource, UiProduct } from '../../components/ProductCard'
import { Toast, useToast } from '../../components/useToost'
import { Images } from '../../constants'
import { HomeHeader } from '../../components/Home/HomeHeader'
import { CategoryScroll } from '../../components/Home/CategoryScroll'
import { AdsModalSection } from '../../components/Home/AdsModalSection'
import { PremiumCard } from '../../components/Home/PremiumCard'
import ChatModal from '../../components/ChatModal'
import SubscriptionModal from '../../components/SubscriptionModal'

const API_BASE_URL = IPA_BASE

// ─── Types ────────────────────────────────────────────────────────────────────
type UserProfile = {
    name: string
    email: string
    profile_picture: string
    address: string
    interests: string[]
    refaradal_code: string
    advertiser_status: { status: string }
    balance: number
    has_claimed_referral: boolean
    referred_by: string | null
}

type SubscriptionStatus = {
    plan_name: string
    price: number
    status: string
    is_active: boolean
    has_used_trial: boolean
    access: string
    features: string[]
}

type ApiProduct = {
    id: number
    title: string
    slug?: string
    brand?: string
    category?: number | null
    category_name?: string | null
    main_image: string | null
    lowest_price?: number
    price?: string
    original_price?: string | null
    discount_percentage?: number | null
    listings_count?: number
    available_on?: string[]
    seller_shop?: string
    is_active?: boolean
    created_at?: string
    rating?: number
    review_count?: number
    is_favorite?: boolean | string | null
    source?: ProductSource
}

type CategoryItem = {
    id: number
    name: string
    slug: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildImageUrl = (path?: string | null): string => {
    if (!path) return 'https://via.placeholder.com/400x400/F1F5F9/94A3B8?text=No+Image'
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    return `${API_BASE_URL}${path}`
}

const parseFav = (v: boolean | string | null | undefined): boolean => {
    if (v === true) return true
    if (v === false) return false
    if (typeof v === 'string') return v.toLowerCase() === 'true'
    return false
}

const toUi = (item: ApiProduct): UiProduct => {
    const finalPrice =
        typeof item.lowest_price === 'number' ? item.lowest_price : Number(item.price ?? 0)

    const originalPrice =
        item.original_price != null && item.original_price !== ''
            ? Number(item.original_price)
            : finalPrice

    const discount =
        item.discount_percentage && item.discount_percentage > 0
            ? `-${Math.round(item.discount_percentage)}%`
            : originalPrice > finalPrice && originalPrice > 0
                ? `-${Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}%`
                : ''

    return {
        id: String(item.id),
        productId: item.id,
        name: item.title,
        price: finalPrice,
        originalPrice,
        discount,
        review_count: item.review_count ?? 0,
        rating: item.rating ?? 0,
        image: buildImageUrl(item.main_image),
        seller: item.available_on?.[0] || item.seller_shop || item.brand || 'Unknown',
        source: item.source ?? 'external',
    }
}

const Home = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
    const toast = useToast()

    const [premiumModalVisible, setPremiumModalVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [profileLoading, setProfileLoading] = useState(false)
    const [productLoading, setProductLoading] = useState(false)
    const [categoryLoading, setCategoryLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

    const [selectedCategory, setSelectedCategory] = useState('all')
    const [user, setUser] = useState<UserProfile | null>(null)
    const [products, setProducts] = useState<ApiProduct[]>([])
    const [categories, setCategories] = useState<CategoryItem[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(50)
    const [hasNextPage, setHasNextPage] = useState(true)
    const [recommendedProducts, setRecommendedProducts] = useState<ApiProduct[]>([])

    // ─── Subscription State ──────────────────────────────────────────────────
    const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
    const [selectedExternalProduct, setSelectedExternalProduct] = useState<UiProduct | null>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
    const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

    const [chatModalVisible, setChatModalVisible] = useState(false)

    //---ads
    const [ads, setAds] = useState<AdsItem[]>([])
    const [actionLocked, setActionLocked] = useState(false)
    const [actionMessage, setActionMessage] = useState('Processing...')

    // ─── Fetch Subscription Status ──────────────────────────────────────────
    const fetchSubscriptionStatus = useCallback(async (token: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}payment/subscription/status/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            })

            const data = res?.data?.data ?? res?.data;
            if (data) {
                setSubscriptionStatus(data);
                const isActive = data.status === 'ACTIVE';
                setIsSubscriptionActive(isActive);
                // console.log('📊 Subscription Status:', data.status);
                // console.log('📊 Is Active:', isActive);
            }
            return data;
        } catch (error) {
            console.error('❌ Error fetching subscription status:', error);
            return null;
        }
    }, []);

    // ── Handle External Product Press ──────────────────────────────────────
    const handleExternalProductPress = useCallback((product: UiProduct) => {
        // ✅ Check subscription status before showing modal
        if (!isSubscriptionActive) {
            setSelectedExternalProduct(product);
            setSubscriptionModalVisible(true);
        } else {
            // ✅ If subscription is active, navigate directly to product details
            navigation.navigate('ProductDetails', {
                productId: product.productId,
                source: product.source,
            } as never);
        }
    }, [isSubscriptionActive, navigation]);

    // ── favorites ──────────────────────────────────────────────────────────────
    const favRef = useRef<Set<string>>(new Set())
    const [favVersion, setFavVersion] = useState(0)
    const favLoadRef = useRef<Set<string>>(new Set())
    const [favLoadVersion, setFavLoadVersion] = useState(0)

    const addFav = (id: string) => {
        favRef.current.add(id)
        setFavVersion(v => v + 1)
    }

    const removeFav = (id: string) => {
        favRef.current.delete(id)
        setFavVersion(v => v + 1)
    }

    const isFav = (id: string) => favRef.current.has(id)

    const addFavLoad = (id: string) => {
        favLoadRef.current.add(id)
        setFavLoadVersion(v => v + 1)
    }

    const removeFavLoad = (id: string) => {
        favLoadRef.current.delete(id)
        setFavLoadVersion(v => v + 1)
    }

    const isFavLoad = (id: string) => favLoadRef.current.has(id)

    const syncFavs = (items: ApiProduct[], append = false) => {
        if (!append) favRef.current = new Set()

        items.forEach(item => {
            if (parseFav(item.is_favorite)) favRef.current.add(String(item.id))
            else if (append) favRef.current.delete(String(item.id))
        })

        setFavVersion(v => v + 1)
    }

    // ── derived ────────────────────────────────────────────────────────────────
    const uiProducts = useMemo(() => products.map(toUi), [products])
    const displayCategories = useMemo(
        () => [{ id: 0, name: 'All', slug: 'all' }, ...categories],
        [categories]
    )

    // ── API calls ──────────────────────────────────────────────────────────────
    const fetchProfile = useCallback(async (token: string) => {
        try {
            setProfileLoading(true)
            const res = await axios.get(`${API_BASE_URL}${PROFILE}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setUser(res?.data?.data ?? null)
        } catch (e) {
            console.error('profile error', e)
        } finally {
            setProfileLoading(false)
        }
    }, [])

    const fetchCategories = useCallback(async (token: string) => {
        try {
            setCategoryLoading(true)
            const res = await axios.get(`${API_BASE_URL}${CATEGORIES_LIST}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const list = Array.isArray(res?.data?.data) ? res.data.data : []
            setCategories([...list].reverse())
        } catch (e) {
            console.error('category error', e)
            setCategories([])
        } finally {
            setCategoryLoading(false)
        }
    }, [])

    const fetchAds = useCallback(async (token: string) => {
        try {
            setCategoryLoading(true)
            const res = await axios.get(`${API_BASE_URL}${VIEW_ADS}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const list = Array.isArray(res?.data?.data) ? res.data.data : []
            setAds(list)
        } catch (e) {
            console.error('ads load error', e)
            setAds([])
        } finally {
            setCategoryLoading(false)
        }
    }, [])

    const handleAds = async (id: number, targetUrl: string) => {
        if (actionLocked) return

        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' })
            return
        }

        setActionLocked(true)
        setActionMessage('Opening ad...')

        try {
            const clickAdsUrl = `${API_BASE_URL}${CLICK_ADS}${id}/`

            await axios.post(
                clickAdsUrl,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (!targetUrl) {
                toast.show({ message: 'Ad URL missing', type: 'error', style: 'top' })
                return
            }

            const finalUrl =
                targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
                    ? targetUrl
                    : `https://${targetUrl}`

            const Linking = require('react-native').Linking
            const supported = await Linking.canOpenURL(finalUrl)

            if (supported) {
                await Linking.openURL(finalUrl)
            } else {
                toast.show({ message: 'Cannot open this URL', type: 'error', style: 'top' })
            }
        } catch (error: any) {
            console.error('ad click/open error:', error?.response?.data || error)
            toast.show({
                message: error?.response?.data?.message || 'Failed to open ad',
                type: 'error',
                style: 'top',
            })
        } finally {
            setTimeout(() => setActionLocked(false), 500)
        }
    }

    const fetchProducts = useCallback(async (token: string, page = 1, append = false) => {
        try {
            append ? setLoadingMore(true) : setProductLoading(true)

            const res = await axios.get(`${API_BASE_URL}${ALL_PRODUCT}`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page, page_size: pageSize },
            })

            const list: ApiProduct[] = (
                Array.isArray(res?.data?.data?.results) ? res.data.data.results : []
            ).map((item: ApiProduct) => ({ ...item, source: 'external' as ProductSource }))

            const pg = res?.data?.pagination ?? {}
            syncFavs(list, append)

            setProducts(prev => {
                if (!append) return list
                const merged = [...prev, ...list]
                return merged.filter((item, idx, arr) => idx === arr.findIndex(p => p.id === item.id))
            })

            setCurrentPage(pg?.current_page ?? page)
            setHasNextPage(Boolean(pg?.has_next))
        } catch (e) {
            console.error('products error', e)
            if (!append) {
                setProducts([])
                favRef.current = new Set()
                setFavVersion(v => v + 1)
            }
        } finally {
            setProductLoading(false)
            setLoadingMore(false)
        }
    }, [pageSize])

    const fetchProductsByCategory = useCallback(async (token: string, slug: string) => {
        try {
            setProductLoading(true)

            const res = await axios.get(`${API_BASE_URL}${CATEGORY_PRODUCT}`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { category: slug, page_size: 1000000 },
            })

            const list: ApiProduct[] = (
                Array.isArray(res?.data?.data?.results) ? res.data.data.results : []
            ).map((item: ApiProduct) => ({ ...item, source: 'external' as ProductSource }))

            const pg = res?.data?.pagination ?? {}
            syncFavs(list, false)
            setProducts(list)
            setCurrentPage(pg?.current_page ?? 1)
            setHasNextPage(Boolean(pg?.has_next))
        } catch (e) {
            console.error('category products error', e)
            setProducts([])
            favRef.current = new Set()
            setFavVersion(v => v + 1)
        } finally {
            setProductLoading(false)
        }
    }, [])

    const fetchRecommended = useCallback(async (token: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}${RECOMMENDED_PRODUCT}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            const raw: ApiProduct[] = Array.isArray(res?.data?.data?.results)
                ? res.data.data.results
                : Array.isArray(res?.data?.data)
                    ? res.data.data
                    : []

            const list = raw.map(item => ({ ...item, source: 'local' as ProductSource }))
            setRecommendedProducts(list)
        } catch (e) {
            console.error('recommended error', e)
        }
    }, [])

    const loadInitialData = useCallback(async () => {
        if (hasLoadedOnce) return

        setLoading(true)
        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            setLoading(false)
            return
        }

        try {
            await Promise.all([
                fetchProfile(token),
                fetchProducts(token, 1, false),
                fetchCategories(token),
                fetchRecommended(token),
                fetchAds(token),
                // ✅ Fetch subscription status
                fetchSubscriptionStatus(token),
            ])
            setHasLoadedOnce(true)
        } catch (e) {
            console.error('initial load error', e)
        } finally {
            setLoading(false)
        }
    }, [fetchProfile, fetchProducts, fetchCategories, fetchRecommended, fetchAds, fetchSubscriptionStatus, hasLoadedOnce])

    useEffect(() => {
        loadInitialData()
    }, [loadInitialData])

    const handleCategoryPress = async (slug: string) => {
        if (slug === selectedCategory) return

        const token = await AsyncStorage.getItem('vToken')
        if (!token) return

        setSelectedCategory(slug)
        setCurrentPage(1)
        setHasNextPage(true)

        if (slug === 'all') await fetchProducts(token, 1, false)
        else await fetchProductsByCategory(token, slug)
    }

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || productLoading || loading || !hasNextPage || selectedCategory !== 'all') return

        const token = await AsyncStorage.getItem('vToken')
        if (!token) return

        const next = currentPage + 1
        await fetchProducts(token, next, true)
    }, [currentPage, fetchProducts, hasNextPage, loading, loadingMore, productLoading, selectedCategory])

    const onRefresh = useCallback(async () => {
        const token = await AsyncStorage.getItem('vToken')
        if (!token) return

        try {
            setRefreshing(true)
            setCurrentPage(1)
            setHasNextPage(true)

            await Promise.all([
                fetchProfile(token),
                fetchCategories(token),
                fetchRecommended(token),
                fetchAds(token),
                fetchSubscriptionStatus(token),
                selectedCategory === 'all'
                    ? fetchProducts(token, 1, false)
                    : fetchProductsByCategory(token, selectedCategory),
            ])
        } finally {
            setRefreshing(false)
        }
    }, [fetchProfile, fetchCategories, fetchRecommended, fetchAds, fetchProducts, fetchProductsByCategory, selectedCategory, fetchSubscriptionStatus])

    const toggleFavorite = useCallback(async (productId: number) => {
        const token = await AsyncStorage.getItem('vToken')
        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' })
            return
        }

        const id = String(productId)
        const currentlyFav = isFav(id)
        addFavLoad(id)

        try {
            if (currentlyFav) {
                await axios.delete(`${API_BASE_URL}${REMOVE_FAVORITE}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    data: { product_id: productId },
                })

                removeFav(id)
                setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_favorite: false } : p))
                toast.show({ message: 'Removed from favorites', type: 'success', style: 'top' })
            } else {
                await axios.post(
                    `${API_BASE_URL}${ADD_FAVORITE}`,
                    { product_id: productId },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    }
                )

                addFav(id)
                setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_favorite: true } : p))
                toast.show({ message: 'Added to favorites', type: 'success', style: 'top' })
            }
        } catch (error: any) {
            console.error('toggle fav error:', JSON.stringify(error?.response?.data))
        } finally {
            removeFavLoad(id)
        }
    }, [toast])

    const handleNavigateProduct = useCallback((id: number, source: ProductSource, product?: UiProduct) => {
        if (source === 'external') {
            // ✅ Check subscription before showing modal
            if (!isSubscriptionActive) {
                if (product) {
                    setSelectedExternalProduct(product);
                    setSubscriptionModalVisible(true);
                }
            } else {
                // ✅ Subscription active - navigate directly
                navigation.navigate('ProductDetails', {
                    productId: id,
                    source,
                } as never);
            }
        } else {
            // Navigate directly for local products
            navigation.navigate('ProductDetails', {
                productId: id,
                source,
            } as never);
        }
    }, [isSubscriptionActive, navigation]);

    const renderItem = useCallback(({ item }: { item: UiProduct }) => (
        <ProductCard
            product={item}
            size="small"
            isFavorite={isFav(item.id)}
            isLoading={isFavLoad(item.id)}
            onToggle={toggleFavorite}
            onPress={(id, source) => {
                if (source === 'external') {
                    if (!isSubscriptionActive) {
                        setSelectedExternalProduct(item);
                        setSubscriptionModalVisible(true);
                    } else {
                        navigation.navigate('ProductDetails', {
                            productId: id,
                            source,
                        } as never);
                    }
                } else {
                    navigation.navigate('ProductDetails', {
                        productId: id,
                        source,
                    } as never);
                }
            }}
        />
    ), [toggleFavorite, navigation, isSubscriptionActive, favVersion, favLoadVersion]);

    const renderRecommendedItem = useCallback(({ item }: { item: UiProduct }) => (
        <ProductCard
            product={item}
            size="medium"
            isFavorite={isFav(item.id)}
            isLoading={isFavLoad(item.id)}
            onToggle={toggleFavorite}
            onPress={(id, source) => {
                if (source === 'external') {
                    if (!isSubscriptionActive) {
                        setSelectedExternalProduct(item);
                        setSubscriptionModalVisible(true);
                    } else {
                        navigation.navigate('ProductDetails', {
                            productId: id,
                            source,
                        } as never);
                    }
                } else {
                    navigation.navigate('ProductDetails', {
                        productId: id,
                        source,
                    } as never);
                }
            }}
        />
    ), [toggleFavorite, navigation, isSubscriptionActive, favVersion, favLoadVersion]);

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 30 }} />
        return (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#2563EB" />
            </View>
        )
    }

    const renderHeader = () => (
        <>
            <HomeHeader userName={user?.name || 'User'} />

            <Pressable
                style={styles.searchContainer}
                onPress={() => navigation.navigate('SearchProduct' as never)}
            >
                <EvilIcons name="search" size={26} color="#94A3B8" />
                <Text style={styles.searchInput}>Search products, brands....</Text>
            </Pressable>

            <CategoryScroll
                categories={displayCategories}
                selectedCategory={selectedCategory}
                onCategoryPress={handleCategoryPress}
            />

            <AdsModalSection
                ads={ads}
                buildImageUrl={buildImageUrl}
                onPressAd={handleAds}
            />

            {!isSubscriptionActive && (
                <PremiumCard onPress={() => setSubscriptionModalVisible(true)} />
            )}

            {recommendedProducts.length > 0 && (
                <View style={styles.recommendedSection}>
                    <View style={styles.recommendedHeader}>
                        <Text style={styles.sectionTitle}>Recommended for You</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        horizontal
                        data={recommendedProducts.map(toUi)}
                        keyExtractor={item => `rec-${item.id}`}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recommendedList}
                        renderItem={renderRecommendedItem}
                    />
                </View>
            )}

            <View style={styles.allProductsHeader}>
                <Text style={styles.allProductsTitle}>All Products</Text>
                {!productLoading && uiProducts.length > 0 && (
                    <View style={styles.itemsBadge}>
                        <Text style={styles.itemsBadgeText}>
                            {uiProducts.length} items
                        </Text>
                    </View>
                )}
            </View>
        </>
    )

    if (loading && products.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <HomeSkeleton />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={uiProducts}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.productGrid}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                onRefresh={onRefresh}
                refreshing={refreshing}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                ListEmptyComponent={
                    !productLoading ? (
                        <Text style={styles.emptyText}>
                            No products found
                        </Text>
                    ) : null
                }
            />

            <PremiumModal
                visible={premiumModalVisible}
                onClose={() => setPremiumModalVisible(false)}
            />

            {actionLocked && (
                <View style={styles.actionOverlay}>
                    <View style={styles.actionBox}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.actionText}>{actionMessage}</Text>
                    </View>
                </View>
            )}

            {/* Chat Button */}
            <TouchableOpacity onPress={() => setChatModalVisible(true)} style={styles.chatButton}>
                <LinearGradient colors={['#FFC649', '#F59E0B']} style={styles.chatGradient}>
                    <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>

            <ChatModal
                visible={chatModalVisible} onClose={() => setChatModalVisible(false)} />

            {/* ✅ Subscription Modal - Only shows when subscription is INACTIVE */}
            <SubscriptionModal
                visible={subscriptionModalVisible}
                onClose={() => {
                    setSubscriptionModalVisible(false);
                    setSelectedExternalProduct(null);
                }}
                onSubscribe={() => {
                    setSubscriptionModalVisible(false);
                    navigation.navigate('Subscription' as never);
                }}
                productName={selectedExternalProduct?.name || 'this product'}
                productSeller={selectedExternalProduct?.seller || 'External Store'}
                productPrice={selectedExternalProduct?.price || 0}
            />

            <Toast
                style={toast.style}
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                onHide={toast.hide}
            />
        </SafeAreaView>
    )
}

export default Home

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9FB' },
    contentContainer: {
        paddingBottom: 40
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    searchContainer: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 6,
        marginHorizontal: 16,
        marginBottom: 8,
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#636F85',
        paddingHorizontal: 4,
    },
    categoryContainer: {
        paddingHorizontal: 20,
        marginBottom: 8,
        marginRight: 16,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D6DB',
    },
    categoryButtonActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    categoryText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    categoryTextActive: {
        color: 'white',
    },
    premiumCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 120,
    },
    angleIcon: {
        position: 'absolute',
        top: -100,
        right: -40,
    },
    moneyStraw: {
        position: 'absolute',
        right: 20,
        bottom: 16,
        width: 115,
        height: 115,
    },
    premiumIcon: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    premiumIconText: {
        padding: 12,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        fontSize: 20,
    },
    premiumTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    premiumSubtitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        lineHeight: 28,
    },
    premiumDescription: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    premiumButton: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 6,
    },
    premiumButtonText: {
        color: '#0057FF',
        fontWeight: '600',
        fontSize: 16,
    },
    recommendedGrid: {
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    allProductsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 14,
        marginTop: 4,
    },
    allProductsTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    itemsBadge: {
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    itemsBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563EB',
    },
    actionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.16)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBox: {
        minWidth: 150,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    actionText: {
        color: '#1F2937',
        fontSize: 14,
        fontWeight: '600',
    },
    recommendedSection: {
        marginBottom: 20,
    },
    recommendedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    seeAllText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '500',
    },
    recommendedList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    productGrid: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        gap: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: '#64748B',
        marginTop: 40,
        fontSize: 16,
    },
    chatButton: {
        position: 'absolute',
        bottom: 100,
        right: 24,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    chatGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
})