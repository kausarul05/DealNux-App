import { ALL_FAVORITE, IPA_BASE, REMOVE_FAVORITE } from "@env";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import { Toast, useToast } from "../../components/useToost";
import { AuthStackParamList } from "../../Navigation/types";

const { width } = Dimensions.get("window");

const API_BASE_URL = IPA_BASE;

type FavoriteProductData = {
    id: number;
    title: string;
    slug?: string;
    brand?: string;
    category?: number | null;
    category_name?: string | null;
    main_image: string | null;
    lowest_price?: number;
    price?: string;
    original_price?: string | null;
    discount_percentage?: number | null;
    listings_count?: number;
    available_on?: string[];
    seller_shop?: string;
    is_active?: boolean;
    created_at?: string;
};

type ApiFavoriteItem = {
    id: number;
    product: FavoriteProductData;
    created_at?: string;
};

type UiProduct = {
    id: string;
    favoriteId: number;
    productId: number;
    name: string;
    price: number;
    originalPrice: number;
    discount: string;
    image: string;
    seller: string;
};

const MyFavourite = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [products, setProducts] = useState<ApiFavoriteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [removeLoadingIds, setRemoveLoadingIds] = useState<Set<string>>(new Set());

    const buildImageUrl = (path?: string | null) => {
        if (!path) {
            return "https://via.placeholder.com/400x400/F1F5F9/94A3B8?text=No+Image";
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        return `${API_BASE_URL}${path}`;
    };

    const mapProductToUi = useCallback((item: ApiFavoriteItem): UiProduct => {
        const product = item.product;

        const finalPrice =
            typeof product?.lowest_price === "number"
                ? product.lowest_price
                : Number(product?.price ?? 0);

        const originalPrice =
            product?.original_price != null && product.original_price !== ""
                ? Number(product.original_price)
                : finalPrice;

        const discount =
            product?.discount_percentage && product.discount_percentage > 0
                ? `-${Math.round(product.discount_percentage)}%`
                : originalPrice > finalPrice && originalPrice > 0
                    ? `-${Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}%`
                    : "";

        return {
            id: String(item.id),
            favoriteId: item.id,
            productId: product.id,
            name: product.title,
            price: finalPrice,
            originalPrice,
            discount,
            image: buildImageUrl(product.main_image),
            seller: product.available_on?.[0] || product.seller_shop || product.brand || "Unknown",
        };
    }, []);

    const favouriteProducts = useMemo(() => {
        return products
            .filter((item) => item?.product?.id)
            .map(mapProductToUi);
    }, [products, mapProductToUi]);

    const loadFavorites = useCallback(
        async (force = false) => {
            if (hasLoadedOnce && !force) return;

            const token = await AsyncStorage.getItem("vToken");

            if (!token) {
                toast.show({
                    message: "Token missing",
                    type: "error",
                    style: "top",
                });
                return;
            }

            try {
                if (force) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                const res = await axios.get(`${API_BASE_URL}${ALL_FAVORITE}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("favorite response:", res.data);

                const favoriteList =
                    res?.data?.data?.favorites ??
                    res?.data?.data?.results ??
                    res?.data?.data ??
                    res?.data?.results ??
                    res?.data ??
                    [];

                setProducts(Array.isArray(favoriteList) ? favoriteList : []);
                setHasLoadedOnce(true);
            } catch (error: any) {
                console.error("Load favorite error:", error?.response?.data || error);
                setProducts([]);
                toast.show({
                    message: error?.response?.data?.message || "Failed to load favorites",
                    type: "error",
                    style: "top",
                });
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [hasLoadedOnce, toast]
    );

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    const removeFavorite = async (productId: number) => {
        const token = await AsyncStorage.getItem("vToken");

        if (!token) {
            toast.show({
                message: "Token missing",
                type: "error",
                style: "top",
            });
            return;
        }

        const id = String(productId);

        try {
            setRemoveLoadingIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });

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

            setProducts((prev) =>
                prev.filter((item) => item.product?.id !== productId)
            );

            toast.show({
                message: "Removed from favorites",
                type: "success",
                style: "top",
            });
        } catch (error: any) {
            console.error("Remove favorite error:", error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || "Failed to remove favorite",
                type: "error",
                style: "top",
            });
        } finally {
            setRemoveLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const ProductCard = ({ product }: { product: UiProduct }) => {
        const cardWidth = (width - 50) / 2 - 6;
        const isRemoving = removeLoadingIds.has(String(product.productId));
        console.log(product.productId)
        return (
            <Pressable
                onPress={() =>
                    navigation.navigate("ProductDetails", { productId: product.productId } as never)

                }
                style={[styles.productCard, { width: cardWidth }]}
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
                        activeOpacity={0.85}
                        onPress={(e: any) => {
                            e.stopPropagation?.();
                            if (!isRemoving) {
                                removeFavorite(product.productId);
                            }
                        }}
                    >
                        {isRemoving ? (
                            <ActivityIndicator size="small" color="#64748B" />
                        ) : (
                            <Ionicons name="heart" size={18} color="#EF4444" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                    </Text>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>${product.price}</Text>
                        {product.originalPrice > product.price ? (
                            <Text style={styles.originalPrice}>${product.originalPrice}</Text>
                        ) : null}
                    </View>

                    <View style={styles.sellerRow}>
                        <View style={styles.storeIconBox}>
                            <MaterialIcons name="storefront" size={16} color="#94A3B8" />
                        </View>

                        <Text style={styles.sellerText} numberOfLines={1}>
                            {product.seller}
                        </Text>

                        <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
                    </View>
                </View>
            </Pressable>
        );
    };

    // const renderHeader = () => (

    // );

    const renderEmpty = () => {
        if (loading) return null;

        return (
            <View style={styles.emptyWrap}>
                <Ionicons name="heart-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No favourite products</Text>
                <Text style={styles.emptyText}>
                    Your saved favourite items will appear here.
                </Text>
            </View>
        );
    };

    if (loading && favouriteProducts.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9FB" }}>
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#F9F9FB" }}>
            <View style={{ paddingHorizontal: 20 }}>
                <View style={styles.headerRow}>
                    <AppHeader left={() => <BackButton />} />
                    <Text style={styles.headerTitle}>My Favourite</Text>
                </View>
            </View>
            <FlatList
                data={favouriteProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => <ProductCard product={item} />}
                columnWrapperStyle={styles.recommendedGrid}
                // ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                onRefresh={() => loadFavorites(true)}
                refreshing={refreshing}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
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
        </View>
    );
};

export default MyFavourite;

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#2D2D2D",
        flex: 1,
    },

    recommendedGrid: {
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 20,
    },

    productCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#EEF0F3",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 20,
    },
    imageContainer: {
        position: "relative",
        height: 180,
        backgroundColor: "#E2E8F0",
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    discountBadge: {
        position: "absolute",
        top: 14,
        left: 14,
        backgroundColor: "#FCD34D",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    discountText: {
        color: "#000",
        fontWeight: "800",
        fontSize: 14,
    },
    favoriteButton: {
        position: "absolute",
        top: 14,
        right: 14,
        backgroundColor: "white",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },

    productInfo: {
        padding: 14,
        backgroundColor: "#FFFFFF",
    },
    productName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1F2937",
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
    },
    price: {
        fontSize: 22,
        fontWeight: "900",
        color: "#1D4ED8",
    },
    originalPrice: {
        fontSize: 18,
        color: "#94A3B8",
        textDecorationLine: "line-through",
        fontWeight: "700",
    },
    sellerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    storeIconBox: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    sellerText: {
        fontSize: 16,
        color: "#64748B",
        flex: 1,
        fontWeight: "700",
    },

    loaderWrap: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 80,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    emptyText: {
        marginTop: 6,
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
    },
});