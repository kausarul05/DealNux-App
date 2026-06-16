import { ADD_FAVORITE, CATEGORY_PRODUCT, IPA_BASE, REMOVE_FAVORITE } from '@env'
import { AntDesign, EvilIcons, Ionicons, MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import axios from 'axios'
import React, { useCallback, useMemo, useState } from 'react'
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
    View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthStackParamList } from '../../Navigation/types'
import { Toast, useToast } from '../../components/useToost'

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

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
                    // limit: 100000,
                    // page: 2,
                    page_size: 1000000
                },
            });

            const resultList = Array.isArray(res?.data?.data?.results)
                ? res.data.data.results
                : [];

            setProducts(resultList);
            syncFavoritesFromProducts(resultList);
            setSearchedQuery(q);
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

    const ProductCard = ({ product }: { product: UiProduct }) => {
        const isFavorite = product.isFavorite;
        const isFavoriteLoading = favoriteLoadingIds.has(product.id);

        return (
            <Pressable
                style={styles.productCard}
                onPress={() =>
                    navigation.navigate('ProductDetails', { productId: product.productId } as never)
                }
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />

                    {!!product.discount && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{product.discount}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (!isFavoriteLoading) {
                                toggleFavorite(product.productId);
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        {isFavoriteLoading ? (
                            <ActivityIndicator size="small" color="#64748B" />
                        ) : (
                                <Ionicons
                                    name={isFavorite ? 'heart' : 'heart-outline'}
                                    size={20}
                                    color={isFavorite ? '#EF4444' : '#64748B'}
                                />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                    </Text>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>${product.price}</Text>
                        {product.originalPrice > product.price ? (
                            <Text style={styles.originalPrice}>${product.originalPrice}</Text>
                        ) : null}
                    </View>

                    <View style={styles.sellerRow}>
                        <MaterialIcons name="storefront" size={16} color="#94A3B8" />
                        <Text style={styles.sellerText} numberOfLines={1}>
                            {product.seller}
                        </Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#94A3B8" />
                    </View>
                </View>
            </Pressable>
        )
    }

    const renderEmpty = () => {
        if (loading) return null;

        if (!searchedQuery) {
            return (
                <View style={styles.emptyWrap}>
                    <Ionicons name="search-outline" size={42} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>Search products</Text>
                    <Text style={styles.emptyText}>
                        Type a keyword and press the search button.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>
                    No result found for "{searchedQuery}"
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.searchContainer}>
                <EvilIcons name="search" size={40} color="#94A3B8" />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    placeholderTextColor="#94A3B8"
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                />

                {searchText.trim().length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                        <AntDesign name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    activeOpacity={0.85}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.searchButtonText}>Search</Text>
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={searchProducts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ProductCard product={item} />}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={renderEmpty}
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
        backgroundColor: '#F9F9FB',
        paddingHorizontal: 20,
    },

    searchContainer: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        paddingHorizontal: 4,
    },
    clearButton: {
        backgroundColor: '#64748B',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 72,
    },
    searchButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },

    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    imageContainer: {
        position: 'relative',
        height: 220,
        backgroundColor: '#E2E8F0',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#FCD34D',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    discountText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'white',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    productInfo: {
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 22,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    originalPrice: {
        fontSize: 16,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sellerText: {
        fontSize: 14,
        color: '#94A3B8',
        flex: 1,
    },

    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    emptyText: {
        marginTop: 6,
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
    },
});