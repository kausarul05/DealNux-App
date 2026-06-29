import { ADD_FAVORITE, CATEGORY_PRODUCT, IPA_BASE, REMOVE_FAVORITE } from '@env'
import { AntDesign, EvilIcons, Ionicons, MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import axios from 'axios'
import React, { useCallback, useMemo, useState, useRef } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { AuthStackParamList } from '../../Navigation/types'
import { Toast, useToast } from '../../components/useToost'

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

const API_BASE_URL = IPA_BASE;

type SearchApiProduct = {
    id: number;
    title: string;
    slug?: string;
    main_image: string | null;
    category?: number | null;
    category_name?: string | null;
    platforms_count?: number;
    available_on?: string[];
    lowest_price?: number;
    is_favorite?: boolean | string | null;
    best_deal?: {
        platform?: string;
        platform_code?: string;
        price?: number;
        url?: string;
        free_shipping?: boolean;
    };
    price_comparison?: Array<{
        platform?: string;
        platform_code?: string;
        price?: number;
        currency?: string;
        original_price?: number | null;
        discount_percentage?: number | null;
        free_shipping?: boolean;
        shipping_cost?: number;
        total_price?: number;
        url?: string;
        condition?: string;
        seller?: string;
        product_id?: number;
        product_title?: string;
        product_slug?: string;
        main_image?: string;
    }>;
};

type UiProduct = {
    id: string;
    productId: number;
    name: string;
    price: number;
    originalPrice: number;
    discount: string;
    image: string;
    seller: string;
    isFavorite: boolean;
};

const SearchProduct = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [searchText, setSearchText] = useState('');
    const [searchedQuery, setSearchedQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<Set<string>>(new Set());
    const [products, setProducts] = useState<SearchApiProduct[]>([]);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const buildImageUrl = (path?: string | null) => {
        if (!path) return 'https://via.placeholder.com/400x400/F1F5F9/94A3B8?text=No+Image';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${API_BASE_URL}${path}`;
    };

    const parseFavoriteValue = (value: boolean | string | null | undefined) => {
        if (value === true) return true;
        if (value === false) return false;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        return false;
    };

    const syncFavoritesFromProducts = useCallback((items: SearchApiProduct[]) => {
        const next = new Set<string>();
        items.forEach((item) => {
            if (parseFavoriteValue(item.is_favorite)) {
                next.add(String(item.id));
            }
        });
        setFavorites(next);
    }, []);

    const mapProductToUi = useCallback(
        (item: SearchApiProduct): UiProduct => {
            const bestComparison = item.price_comparison?.[0];

            const finalPrice =
                typeof item.lowest_price === 'number'
                    ? item.lowest_price
                    : typeof item.best_deal?.price === 'number'
                        ? item.best_deal.price
                        : typeof bestComparison?.price === 'number'
                            ? bestComparison.price
                            : 0;

            const originalPrice =
                typeof bestComparison?.original_price === 'number'
                    ? bestComparison.original_price
                    : finalPrice;

            const discount =
                typeof bestComparison?.discount_percentage === 'number' &&
                    bestComparison.discount_percentage > 0
                    ? `-${Math.round(bestComparison.discount_percentage)}%`
                    : originalPrice > finalPrice && originalPrice > 0
                        ? `-${Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}%`
                        : '';

            return {
                id: String(item.id),
                productId: item.id,
                name: item.title,
                price: finalPrice,
                originalPrice,
                discount,
                image: buildImageUrl(item.main_image || bestComparison?.main_image || null),
                seller:
                    item.best_deal?.platform ||
                    item.available_on?.[0] ||
                    bestComparison?.platform ||
                    'Unknown',
                isFavorite: favorites.has(String(item.id)) || parseFavoriteValue(item.is_favorite),
            };
        },
        [favorites]
    );

    const searchProducts = useMemo(() => {
        return products.map(mapProductToUi);
    }, [products, mapProductToUi]);

    const handleSearch = useCallback(async () => {
        const q = searchText.trim();

        if (!q) {
            setProducts([]);
            setFavorites(new Set());
            setSearchedQuery('');
            return;
        }

        if (q === searchedQuery) {
            Keyboard.dismiss();
            return;
        }

        try {
            setLoading(true);
            Keyboard.dismiss();

            const token = await AsyncStorage.getItem('vToken');

            const res = await axios.get(`${API_BASE_URL}${CATEGORY_PRODUCT}`, {
                headers: token
                    ? {
                        Authorization: `Bearer ${token}`,
                    }
                    : undefined,
                params: {
                    search: q,
                    page_size: 1000000
                },
            });

            const resultList = Array.isArray(res?.data?.data?.results)
                ? res.data.data.results
                : [];

            setProducts(resultList);
            syncFavoritesFromProducts(resultList);
            setSearchedQuery(q);
            
            // Animate results
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } catch (error: any) {
            console.error('Search product error:', error?.response?.data || error);
            setProducts([]);
            setFavorites(new Set());

            toast.show({
                message: error?.response?.data?.message || 'Search failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setLoading(false);
        }
    }, [searchText, searchedQuery, syncFavoritesFromProducts, toast]);

    const clearSearch = () => {
        setSearchText('');
        setSearchedQuery('');
        setProducts([]);
        setFavorites(new Set());
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.95);
    };

    const toggleFavorite = async (productId: number) => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({
                message: 'Token missing',
                type: 'error',
                style: 'top',
            });
            return;
        }

        const id = String(productId);
        const isFavorite = favorites.has(id);

        setFavoriteLoadingIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });

        try {
            if (isFavorite) {
                await axios.delete(`${API_BASE_URL}${REMOVE_FAVORITE}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    data: {
                        product_id: productId,
                    },
                });

                setFavorites((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });

                setProducts((prev) =>
                    prev.map((item) =>
                        item.id === productId ? { ...item, is_favorite: false } : item
                    )
                );
            } else {
                await axios.post(
                    `${API_BASE_URL}${ADD_FAVORITE}`,
                    {
                        product_id: productId,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    }
                );

                setFavorites((prev) => {
                    const next = new Set(prev);
                    next.add(id);
                    return next;
                });

                setProducts((prev) =>
                    prev.map((item) =>
                        item.id === productId ? { ...item, is_favorite: true } : item
                    )
                );
            }
        } catch (error: any) {
            console.error('Favorite toggle error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Favorite update failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setFavoriteLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const ProductCard = ({ product, index }: { product: UiProduct; index: number }) => {
        const isFavorite = product.isFavorite;
        const isFavoriteLoading = favoriteLoadingIds.has(product.id);
        const scaleValue = useRef(new Animated.Value(1)).current;

        const handlePressIn = () => {
            Animated.spring(scaleValue, {
                toValue: 0.97,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        };

        const handlePressOut = () => {
            Animated.spring(scaleValue, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        };

        return (
            <Animated.View
                style={[
                    styles.productCardWrapper,
                    {
                        transform: [{ scale: scaleValue }],
                        opacity: fadeAnim,
                    },
                ]}
            >
                <Pressable
                    style={styles.productCard}
                    onPress={() =>
                        navigation.navigate('ProductDetails', { 
                            productId: product.productId,
                            source: 'external' 
                        } as never)
                    }
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: product.image }}
                            style={styles.productImage}
                            resizeMode="cover"
                        />

                        {!!product.discount && (
                            <LinearGradient
                                colors={['#EF4444', '#DC2626']}
                                style={styles.discountBadge}
                            >
                                <Text style={styles.discountText}>{product.discount}</Text>
                            </LinearGradient>
                        )}

                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                if (!isFavoriteLoading) {
                                    toggleFavorite(product.productId);
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            {isFavoriteLoading ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <Ionicons
                                    name={isFavorite ? 'heart' : 'heart-outline'}
                                    size={18}
                                    color={isFavorite ? '#EF4444' : '#64748B'}
                                />
                            )}
                        </TouchableOpacity>

                        {/* Platforms count badge */}
                        {product.seller && (
                            <View style={styles.platformBadge}>
                                <MaterialIcons name="storefront" size={10} color="#FFFFFF" />
                                <Text style={styles.platformBadgeText}>
                                    {product.seller}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {product.name}
                        </Text>

                        <View style={styles.priceRow}>
                            <Text style={styles.price}>${product.price}</Text>
                            {product.originalPrice > product.price && (
                                <Text style={styles.originalPrice}>${product.originalPrice}</Text>
                            )}
                        </View>

                        <View style={styles.sellerRow}>
                            <View style={styles.sellerDot} />
                            <Text style={styles.sellerText} numberOfLines={1}>
                                {product.seller}
                            </Text>
                            <MaterialIcons name="arrow-forward" size={14} color="#94A3B8" />
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;

        if (!searchedQuery) {
            return (
                <View style={styles.emptyWrap}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="search-outline" size={48} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>Search Products</Text>
                    <Text style={styles.emptyText}>
                        Type a keyword and press the search button to find products
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyWrap}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="file-tray-outline" size={48} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Products Found</Text>
                <Text style={styles.emptyText}>
                    No result found for "{searchedQuery}"
                </Text>
                <TouchableOpacity 
                    style={styles.emptyRetryButton} 
                    onPress={handleSearch}
                    activeOpacity={0.8}
                >
                    <Text style={styles.emptyRetryText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderFooter = () => {
        if (!loading || products.length === 0) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.footerLoaderText}>Searching products...</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.headerGradient}
            >
                <Text style={styles.headerTitle}>Search Products</Text>
                <Text style={styles.headerSubtitle}>Find the best deals across all platforms</Text>
            </LinearGradient>

            <View style={styles.searchContainer}>
                <View style={styles.searchIconContainer}>
                    <EvilIcons name="search" size={24} color="#94A3B8" />
                </View>

                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for products, brands..."
                    placeholderTextColor="#94A3B8"
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                />

                {searchText.trim().length > 0 && (
                    <TouchableOpacity 
                        style={styles.clearButton} 
                        onPress={clearSearch}
                        activeOpacity={0.7}
                    >
                        <AntDesign name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.searchButton, loading && styles.searchButtonLoading]}
                    onPress={handleSearch}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.searchButtonText}>Search</Text>
                    )}
                </TouchableOpacity>
            </View>

            {loading && products.length === 0 && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Searching for products...</Text>
                </View>
            )}

            <FlatList
                data={searchProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item, index }) => <ProductCard product={item} index={index} />}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    styles.listContent,
                    searchProducts.length === 0 && styles.emptyListContent
                ]}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                columnWrapperStyle={searchProducts.length > 0 ? styles.columnWrapper : null}
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

export default SearchProduct;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerGradient: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    searchContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 20,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        // elevation: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIconContainer: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    clearButton: {
        backgroundColor: '#64748B',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    searchButton: {
        backgroundColor: '#2355B6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 68,
    },
    searchButtonLoading: {
        backgroundColor: '#94A3B8',
    },
    searchButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        paddingTop: 4,
    },
    emptyListContent: {
        flex: 1,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: 12,
    },
    productCardWrapper: {
        width: CARD_WIDTH,
        marginBottom: 16,
    },
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    imageContainer: {
        position: 'relative',
        height: 180,
        backgroundColor: '#F1F5F9',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    discountText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    platformBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    platformBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '500',
    },
    productInfo: {
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
        lineHeight: 18,
        minHeight: 36,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    price: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2355B6',
    },
    originalPrice: {
        fontSize: 13,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sellerDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#10B981',
    },
    sellerText: {
        fontSize: 12,
        color: '#94A3B8',
        flex: 1,
    },
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyRetryButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#2355B6',
        borderRadius: 12,
    },
    emptyRetryText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    footerLoaderText: {
        fontSize: 13,
        color: '#94A3B8',
    },
});