import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import React from 'react'
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

const { width } = Dimensions.get('window')

export type ProductSource = 'local' | 'external'

export type UiProduct = {
    id: string
    productId: number
    name: string
    price: number
    originalPrice: number
    rating: number
    review_count: number
    discount: string
    image: string
    seller: string
    source: ProductSource
}

type Props = {
    product: UiProduct
    size?: 'medium' | 'small'
    isFavorite: boolean
    isLoading: boolean
    onToggle: (id: number) => void
    onPress: (id: number, source: ProductSource) => void
}

const ProductCard = ({
    product,
    size = 'medium',
    isFavorite,
    isLoading,
    onToggle,
    onPress,
}: Props) => {
    const cardWidth = size === 'medium' ? (width - 60) / 2 : (width - 50) / 2 

    return (
        <Pressable
            onPress={() => onPress(product.productId, product.source)}
            style={[styles.productCard, { width: cardWidth }]}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="stretch" />

                {!!product.discount && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{product.discount}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.favoriteButton}
                    activeOpacity={0.8}
                    onPress={(e) => {
                        e.stopPropagation()
                        if (!isLoading) onToggle(product.productId)
                    }}
                >
                    {isLoading ? (
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
                <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                </Text>

                <View style={styles.priceRow}>
                    <Text style={styles.price}>${product.price}</Text>
                    {product.originalPrice > product.price && (
                        <Text style={styles.originalPrice}>${product.originalPrice}</Text>
                    )}
                </View>
                {/* <View className='flex-row items-center justify-between'>
                    <Text className='text-lg font-bold mb-2'>⭐ {product.rating}</Text>
                    <View className='flex-row items-center gap-2 self-center'>
                        <MaterialIcons name="reviews" size={24} color="#2355B6" />
                        <Text className='text-xl font-bold'>{product?.review_count}</Text>
                    </View>
                </View> */}
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

export default React.memo(ProductCard)

const styles = StyleSheet.create({
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.08,
        // shadowRadius: 8,
        elevation: 1,
        marginBottom: 20,
    },
    imageContainer: {
        position: 'relative',
        height: 160,
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
        fontSize: 12,
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'white',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        elevation: 3,
    },
    productInfo: {
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    originalPrice: {
        fontSize: 12,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sellerText: {
        fontSize: 13,
        color: '#94A3B8',
        flex: 1,
    },
})