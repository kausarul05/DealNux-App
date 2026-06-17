// components/chat/ProductCard.tsx
import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { ChatProduct } from '../../services/chatService'

interface ProductCardProps {
    product: ChatProduct
    onPress?: (url: string) => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
    const handlePress = () => {
        if (product.external_url) {
            if (onPress) {
                onPress(product.external_url)
            } else {
                Linking.openURL(product.external_url)
            }
        }
    }

    const imageUrl = product.image_url.startsWith('http') 
        ? product.image_url 
        : `https://ai.dealnux.shop${product.image_url}`

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.image}
                    resizeMode="cover"
                />
                {product.discount_percentage && product.discount_percentage > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                            -{Math.round(product.discount_percentage)}%
                        </Text>
                    </View>
                )}
                {product.free_shipping && (
                    <View style={styles.shippingBadge}>
                        <Text style={styles.shippingText}>Free Ship</Text>
                    </View>
                )}
            </View>

            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                    {product.title}
                </Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>
                        {product.currency} {product.price.toFixed(2)}
                    </Text>
                    {product.original_price && (
                        <Text style={styles.originalPrice}>
                            {product.currency} {product.original_price.toFixed(2)}
                        </Text>
                    )}
                </View>
                <View style={styles.footer}>
                    <View style={styles.platformRow}>
                        <MaterialIcons name="storefront" size={14} color="#94A3B8" />
                        <Text style={styles.platformText}>{product.platform_name}</Text>
                    </View>
                    <View style={styles.conditionBadge}>
                        <Text style={styles.conditionText}>{product.condition}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
    },
    imageContainer: {
        position: 'relative',
        height: 140,
        backgroundColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    discountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    shippingBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    shippingText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    info: {
        padding: 10,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 18,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2563EB',
    },
    originalPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    platformRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    platformText: {
        fontSize: 11,
        color: '#94A3B8',
    },
    conditionBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    conditionText: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
    },
})

export default ProductCard