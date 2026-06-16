// components/PremiumCard.tsx (White button version)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface PremiumCardProps {
    onPress: () => void;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ onPress }) => {
    return (
        <LinearGradient
            colors={['#2355B6', '#1A4D8F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.content}>
                <View style={styles.leftContent}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <View style={styles.badge}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={styles.badgeText}>PREMIUM</Text>
                        </View>
                        {/* <Text style={styles.title}>DEALNUX PREMIUM</Text> */}
                    </View>
                    <Text style={styles.description}>
                        Unlock smarter savings and auto-coupons!
                    </Text>
                    <Text style={styles.subDescription}>
                        Experience ad-free browsing and{'\n'}exclusive price drop alerts.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={onPress}>
                        <Text style={styles.buttonText}>Start Free Trial</Text>
                        <Ionicons name="arrow-forward" size={16} color="#2355B6" />
                    </TouchableOpacity>
                </View>
                <View style={styles.rightContent}>
                    <Ionicons name="diamond" size={40} color="#FFD700" />
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        minHeight: 150,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#2355B6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftContent: {
        flex: 1,
    },
    rightContent: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 30,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,215,0,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    badgeText: {
        color: '#FFD700',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    description: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
        lineHeight: 20,
        opacity: 0.95,
    },
    subDescription: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        marginBottom: 14,
        lineHeight: 18,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        color: '#2355B6',
        fontWeight: '600',
        fontSize: 13,
    },
});