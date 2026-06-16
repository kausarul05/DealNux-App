import { Feather, MaterialIcons } from '@expo/vector-icons'
import React, { useRef } from 'react'
import {
    ActivityIndicator,
    Animated,
    Image,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'

interface CartProductCardProps {
    image: string
    name: string
    price: number
    originalPrice: number
    discount: string
    quantity?: number
    condition?: string
    isAvailable?: boolean
    qtyLoading?: boolean
    deleteLoading?: boolean
    onIncrease?: () => void | Promise<void>
    onDecrease?: () => void | Promise<void>
    onDelete?: () => void | Promise<void>
    // ✅ swipe শুরু ও শেষে ScrollView enable/disable করার জন্য
    onSwipeStart?: () => void
    onSwipeEnd?: () => void
}

const CartProductCard = ({
    image,
    name,
    price,
    originalPrice,
    discount,
    quantity = 1,
    condition,
    isAvailable = true,
    qtyLoading = false,
    deleteLoading = false,
    onIncrease,
    onDecrease,
    onDelete,
    onSwipeStart,
    onSwipeEnd,
}: CartProductCardProps) => {
    const translateX = useRef(new Animated.Value(0)).current

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,

            // ✅ horizontal movement vertical এর চেয়ে বেশি হলেই PanResponder নেবে
            // এতে ScrollView উপরে-নিচে scroll করতে পারবে
            // আর শুধু বাম দিকে swipe করলে card সরবে
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dx, dy } = gestureState
                // horizontal movement vertical এর দেড়গুণ বেশি হলে swipe ধরবে
                return Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 10
            },

            // ✅ swipe শুরু হলে ScrollView disable করো
            onPanResponderGrant: () => {
                onSwipeStart?.()
            },

            // শুধু বাম দিকে swipe করতে দাও, ডানে না
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) {
                    translateX.setValue(Math.max(gestureState.dx, -80))
                }
            },

            onPanResponderRelease: (_, gestureState) => {
                // ✅ swipe শেষ হলে ScrollView আবার enable করো
                onSwipeEnd?.()

                if (gestureState.dx < -40) {
                    // threshold পার হলে delete button দেখাও
                    Animated.spring(translateX, {
                        toValue: -80,
                        useNativeDriver: true,
                    }).start()
                } else {
                    // threshold না হলে ফিরে যাও
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start()
                }
            },

            // ✅ ScrollView দরকার হলে gesture ছেড়ে দাও
            onPanResponderTerminate: () => {
                onSwipeEnd?.()
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current

    return (
        <View style={styles.container}>
            <View style={styles.deleteContainer}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={onDelete}
                    disabled={deleteLoading}
                >
                    {deleteLoading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <MaterialIcons name="delete" size={36} color="black" />
                    )}
                </TouchableOpacity>
            </View>

            <Animated.View
                style={[
                    styles.card,
                    { transform: [{ translateX }] }
                ]}
                {...panResponder.panHandlers}
            >
                <Image
                    source={{ uri: image }}
                    style={styles.productImage}
                    resizeMode="cover"
                />

                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {name}
                    </Text>

                    {!!condition && (
                        <Text style={styles.conditionText}>
                            {condition}
                        </Text>
                    )}

                    {!isAvailable && (
                        <Text style={styles.outOfStockText}>
                            Out of stock
                        </Text>
                    )}

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>${Number(price || 0).toFixed(2)}</Text>

                        {!!originalPrice && originalPrice > 0 && (
                            <Text style={styles.originalPrice}>
                                ${Number(originalPrice).toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {!!discount && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{discount}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        style={[
                            styles.quantityButton,
                            quantity <= 1 && styles.disabledButton
                        ]}
                        onPress={onDecrease}
                        disabled={qtyLoading || quantity <= 1}
                    >
                        <Feather name="minus" size={18} color="black" />
                    </TouchableOpacity>

                    {qtyLoading ? (
                        <ActivityIndicator />
                    ) : (
                            <Text style={styles.quantityText}>{quantity}</Text>
                    )}

                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={onIncrease}
                        disabled={qtyLoading}
                    >
                        <Feather name="plus" size={18} color="black" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    )
}

export default CartProductCard

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginBottom: 10,
        overflow: 'hidden',
        backgroundColor: '#FFC649',
        borderRadius: 16
    },
    deleteContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#FFC649',
        width: 60,
        height: 100,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        gap: 12,
    },
    productImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    conditionText: {
        color: 'green',
        fontSize: 12,
        marginBottom: 4,
    },
    outOfStockText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2355B6',
    },
    originalPrice: {
        fontSize: 14,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    discountBadge: {
        backgroundColor: '#FEF3C7',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    discountText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400E',
    },
    quantityContainer: {
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        padding: 6,
        borderRadius: 12,
        minWidth: 52,
    },
    quantityButton: {
        width: 30,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.4,
    },
    quantityText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
})