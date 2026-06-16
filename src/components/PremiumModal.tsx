import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
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

interface PremiumModalProps {
    visible: boolean
    onClose: () => void
}

const PremiumModal = ({ visible, onClose }: PremiumModalProps) => {
    const features = [
        {
            id: '1',
            icon: 'notifications-active',
            iconType: 'material',
            title: 'Real-time Price Alerts',
            description: 'Get notified the second a price drops on your tracked items.',
        },
        {
            id: '2',
            icon: 'calendar',
            iconType: 'ionicons',
            title: 'Unlimited History',
            description: 'Analyse price trends over the last 365 days to buy smart.',
        },
        {
            id: '3',
            icon: 'scan',
            iconType: 'ionicons',
            title: 'Scanning Unlimited',
            description: 'Scanning instantly without hassle.',
        },
    ]

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill}>
                <View style={styles.overlay} >
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.restoreButton}>
                                <Text style={styles.restoreText}>Restore</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* Diamond Icon */}
                            <View style={styles.diamondContainer}>
                                <Image
                                    source={Images.Diamond}
                                    style={styles.diamondImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.popularBadge}>
                                    <Text style={styles.starIcon}>⭐</Text>
                                    <Text style={styles.popularText}>MOST POPULAR</Text>
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={styles.title}>
                                Go Premium{'\n'}with <Text style={styles.titleBlue}>Free Trial!</Text>
                            </Text>

                            {/* Subtitle */}
                            <Text style={styles.subtitle}>
                                Unlock the full power of price tracking.{'\n'}
                                Try 7 days free, cancel anytime.
                            </Text>

                            {/* Features List */}
                            <View style={styles.featuresContainer}>
                                {features.map((feature) => (
                                    <View key={feature.id} style={styles.featureItem}>
                                        <View style={styles.featureIcon}>
                                            {feature.iconType === 'material' ? (
                                                <MaterialIcons
                                                    name={feature.icon as any}
                                                    size={24}
                                                    color="#2563EB"
                                                />
                                            ) : (
                                                <Ionicons
                                                    name={feature.icon as any}
                                                    size={24}
                                                    color="#2563EB"
                                                />
                                            )}
                                        </View>
                                        <View style={styles.featureText}>
                                            <Text style={styles.featureTitle}>{feature.title}</Text>
                                            <Text style={styles.featureDescription}>
                                                {feature.description}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Pricing */}
                            <Text style={styles.pricingText}>
                                7 Days Free, then $4.99/mo
                            </Text>

                            {/* Start Trial Button */}
                            <TouchableOpacity style={styles.trialButton}>
                                <Text style={styles.trialButtonText}>Start Free Trial</Text>
                                <MaterialIcons name="arrow-forward" size={20} color="white" />
                            </TouchableOpacity>

                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </BlurView>
        </Modal>
    )
}

export default PremiumModal

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        margin: 20,
        paddingTop:60,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius:32,
        maxHeight: height * 0.92,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    restoreButton: {
        paddingHorizontal: 4,
    },
    restoreText: {
        fontSize: 16,
        color: '#2563EB',
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    diamondContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    diamondImage: {
    
    },
    popularBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
    },
    starIcon: {
        fontSize: 16,
    },
    popularText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#92400E',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 40,
    },
    titleBlue: {
        color: '#2563EB',
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    featuresContainer: {
        gap: 24,
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        gap: 16,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        flex: 1,
        paddingTop: 4,
    },
    featureTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    pricingText: {
        fontSize: 15,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 10,
    },
    trialButton: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    trialButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
})