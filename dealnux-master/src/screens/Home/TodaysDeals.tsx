import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { AuthStackParamList } from '../../Navigation/types'

const { width } = Dimensions.get('window')

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const TodaysDeals = () => {
const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
const [favorites, setFavorites] = useState<Set<string>>(new Set())

    const recommendedProducts = [
        {
            id: '3',
            name: 'MacBook Air M2',
            price: 999,
            originalPrice: 1099,
            discount: '-10%',
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
            seller: 'Best Buy'
        },
        {
            id: '4',
            name: 'Sony WH-1000XM5',
            price: 299,
            originalPrice: 399,
            discount: '-40%',
            image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400',
            seller: 'Best Buy'
        },
        {
            id: '5',
            name: 'iPhone 15 Pro',
            price: 999,
            originalPrice: 1099,
            discount: '-08%',
            image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
            seller: 'Apple'
        },
        {
            id: '6',
            name: 'Sony Earbuds',
            price: 199,
            originalPrice: 249,
            discount: '-20%',
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
            seller: 'Best Buy'
        },
        {
            id: '7',
            name: 'Sony Earbuds',
            price: 199,
            originalPrice: 249,
            discount: '-20%',
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
            seller: 'Best Buy'
        },
        {
            id: '8',
            name: 'Sony Earbuds',
            price: 199,
            originalPrice: 249,
            discount: '-20%',
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
            seller: 'Best Buy'
        },
        {
            id: '9',
            name: 'Sony Earbuds',
            price: 199,
            originalPrice: 249,
            discount: '-20%',
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
            seller: 'Best Buy'
        },
    ]

    const toggleFavorite = (id: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev)
            if (newFavorites.has(id)) {
                newFavorites.delete(id)
            } else {
                newFavorites.add(id)
            }
            return newFavorites
        })
    }

    const ProductCard = ({ product, size = 'medium' }: any) => {
        const cardWidth = size === 'medium' ? (width - 60) / 2 : (width - 50) / 2 - 8
        const isFavorite = favorites.has(product.id)

        return (
            <Pressable onPress={() => navigation.navigate("ProductDetails")} style={[styles.productCard, { width: cardWidth }]}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{product.discount}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={() => toggleFavorite(product.id)}
                    >
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={20}
                            color={isFavorite ? "#EF4444" : "#64748B"}
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>${product.price}</Text>
                        <Text style={styles.originalPrice}>${product.originalPrice}</Text>
                    </View>
                    <View style={styles.sellerRow}>
                        <MaterialIcons name="storefront" size={16} color="#94A3B8" />
                        <Text style={styles.sellerText}>{product.seller}</Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#94A3B8" />
                    </View>
                </View>
            </Pressable>
        )
    }
  return (
      <SafeAreaView className="flex-1 bg-[#F9F9FB]">
          <View className="px-5  ">
              <View className="flex-row items-center gap-4">
                  <AppHeader left={() => <BackButton />} middle={() => <Text className="text-lg font-semibold">Today’s Best Deals</Text>} />

                  
              </View>
              <ScrollView
              showsVerticalScrollIndicator={false}
              >
                  <View style={styles.recommendedGrid}>
                                      {recommendedProducts.map((product) => (
                                          <ProductCard key={product.id} product={product} size="small" />
                                      ))}
                                  </View>
              </ScrollView>
          </View>
        </SafeAreaView>
  )
}

export default TodaysDeals

const styles = StyleSheet.create({

    
    // Product Card
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    imageContainer: {
        position: 'relative',
        height: 180,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
        gap: 8,
        marginBottom: 8,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    originalPrice: {
        fontSize: 14,
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

    // Recommended Grid
    recommendedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom:60,
        justifyContent: 'space-between',
    },
})