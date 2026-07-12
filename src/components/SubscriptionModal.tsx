// components/SubscriptionModal.tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    Image,
    Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSubscribe: () => void;
    productName?: string;
    productSeller?: string;
    productPrice?: number;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    visible,
    onClose,
    onSubscribe,
    productName = 'this product',
    productSeller = 'External Store',
    productPrice = 0,
}) => {
    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleSubscribe = () => {
        onSubscribe();
        onClose();
    };

    return (
        <Modal transparent visible={visible} animationType="none">
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                
                <Animated.View 
                    style={[
                        styles.modalContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={['#1E2F73', '#2946A6', '#2355B6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientHeader}
                    >
                        <View style={styles.headerContent}>
                            <View style={styles.crownIcon}>
                                <MaterialCommunityIcons name="crown-circle" size={32} color="#FFD700" />
                            </View>
                            <Text style={styles.headerTitle}>Go Premium </Text>
                            <Text style={styles.headerSubtitle}>
                                with <Text style={styles.highlight}>14-Day Free Trial!</Text>
                            </Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.content}>
                        {/* Product Preview */}
                        <View style={styles.productPreview}>
                            <View style={styles.productIcon}>
                                <MaterialIcons name="storefront" size={28} color="#2355B6" />
                            </View>
                            <View style={styles.productInfo}>
                                <Text style={styles.productLabel}>You're viewing:</Text>
                                <Text style={styles.productName} numberOfLines={1}>
                                    {productName}
                                </Text>
                                <Text style={styles.productSeller}>via {productSeller}</Text>
                            </View>
                        </View>

                        {/* Description */}
                        <Text style={styles.description}>
                            Unlock the full power of price tracking. Try 14 days free, cancel anytime.
                        </Text>

                        {/* Features */}
                        <View style={styles.features}>
                            <View style={styles.featureItem}>
                                <View style={styles.featureIcon}>
                                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                </View>
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Real-time Price Alerts</Text>
                                    <Text style={styles.featureDesc}>
                                        Get notified the second a price drops on your tracked items.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.featureItem}>
                                <View style={styles.featureIcon}>
                                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                </View>
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Unlimited History</Text>
                                    <Text style={styles.featureDesc}>
                                        Analyse price trends over the last 365 days to buy smart.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.featureItem}>
                                <View style={styles.featureIcon}>
                                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                </View>
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Ad-Free Scanning</Text>
                                    <Text style={styles.featureDesc}>
                                        Scan barcodes instantly without interruptions or ads.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Price & Buttons */}
                        <View style={styles.footer}>
                            <Text style={styles.priceText}>
                                14 Days Free, then <Text style={styles.priceHighlight}>$7.99/mo</Text>
                            </Text>

                            <TouchableOpacity
                                style={styles.subscribeButton}
                                onPress={handleSubscribe}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#2355B6', '#1A4D8F']}
                                    style={styles.subscribeGradient}
                                >
                                    <Text style={styles.subscribeButtonText}>
                                        Start 14-Day Free Trial
                                    </Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={onClose}
                            >
                                <Text style={styles.skipButtonText}>Maybe Later</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: height * 0.85,
        overflow: 'hidden',
    },
    gradientHeader: {
        paddingTop: 32,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    headerContent: {
        alignItems: 'center',
    },
    crownIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,215,0,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.3)',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.95)',
        fontWeight: '600',
    },
    highlight: {
        color: '#FFD700',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    productPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    productIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    productInfo: {
        flex: 1,
    },
    productLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    productSeller: {
        fontSize: 12,
        color: '#6B7280',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    features: {
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    featureIcon: {
        width: 28,
        marginRight: 12,
        marginTop: 1,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    featureDesc: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 1,
        lineHeight: 16,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 16,
    },
    priceText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 14,
    },
    priceHighlight: {
        color: '#2355B6',
        fontWeight: '700',
    },
    subscribeButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 10,
    },
    subscribeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    subscribeButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    skipButtonText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
});

export default SubscriptionModal;