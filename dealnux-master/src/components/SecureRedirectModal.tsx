import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import {
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import { Images } from '../constants'

const { height } = Dimensions.get('window')

interface SecureRedirectModalProps {
    visible: boolean
    onClose: () => void
}

const SecureRedirectModal = ({ visible, onClose }: SecureRedirectModalProps) => {
    const stores = [
        {
            id: '1',
            logo: Images.Wallmart,
            name: 'Walmart',
            item: 'Headphone',
            price: '$348.00',
            productImage: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=100',
        },
        {
            id: '2',
            logo: Images.Amazon,
            name: 'Amazon',
            item: 'Shoes & Blender',
            price: '$248.00',
            productImages: [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=50',
                'https://images.unsplash.com/photo-1585515320310-259814833e62?w=50',
            ],
        },
    ]

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>SECURE REDIRECT</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Lock Icon */}
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircleOuter}>
                                <View style={styles.iconCircleInner}>
                                    <Ionicons name="lock-closed" size={24} color="#2563EB" />
                                </View>
                            </View>
                        </View>

                        {/* Title & Description */}
                        <Text style={styles.title}>Compare Prices & Buy</Text>
                        <Text style={styles.description}>
                            We're transferring your items to complete{'\n'}your purchase securely.
                        </Text>

                        {/* Store Cards */}
                        <View style={styles.storesContainer}>
                            {stores.map((store, index) => (
                                <View key={store.id} style={styles.storeCard}>
                                    <View style={styles.storeHeader}>
                                        <Image
                                            source={store.logo}
                                            style={styles.storeLogo}
                                            resizeMode="contain"
                                        />
                                        <View style={styles.storeInfo}>
                                            <Text style={styles.storeName}>{store.name}</Text>
                                            <View style={styles.itemRow}>
                                                <Text style={styles.itemText}>{store.item}</Text>
                                                <Text style={styles.separator}>|</Text>
                                                <Text style={styles.priceText}>{store.price}</Text>
                                            </View>
                                        </View>
                                        {/* Product Image(s) */}
                                        {store.productImages ? (
                                            <View style={styles.productImages}>
                                                {store.productImages.map((img, idx) => (
                                                    <Image
                                                        key={idx}
                                                        source={{ uri: img }}
                                                        style={[
                                                            styles.productImageSmall,
                                                            idx > 0 && styles.productImageOverlap
                                                        ]}
                                                        resizeMode="cover"
                                                    />
                                                ))}
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: store.productImage }}
                                                style={styles.productImage}
                                                resizeMode="cover"
                                            />
                                        )}
                                    </View>

                                    {/* Buy Now Button */}
                                    <TouchableOpacity style={styles.buyButton}>
                                        <Text style={styles.buyButtonText}>Buy Now</Text>
                                        <Ionicons name="arrow-forward" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        {/* Info Notice */}
                        <View style={styles.infoNotice}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="information" size={18} color="#64748B" />
                            </View>
                            <Text style={styles.infoText}>
                                You'll complete payment on <Text style={styles.infoBold}>Amazon</Text>.{'\n'}
                                DealNux does not store payment info.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

export default SecureRedirectModal

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        width: '100%',
        maxHeight: height * 0.85,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#667085',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: 12,
    },
    iconCircleOuter: {
        width: 100,
        height: 100,
        borderRadius: 70,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircleInner: {
        width: 60,
        height: 60,
        borderRadius: 50,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    storesContainer: {
        gap: 16,
    },
    storeCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storeLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    storeInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemText: {
        fontSize: 14,
        color: '#6B7280',
    },
    separator: {
        fontSize: 14,
        color: '#D1D5DB',
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    productImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    productImages: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productImageSmall: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    productImageOverlap: {
        marginLeft: -12,
    },
    buyButton: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    buyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoNotice: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
    },
    infoIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 20,
    },
    infoBold: {
        fontWeight: 'bold',
        color: '#1F2937',
    },
})