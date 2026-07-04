import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useRef, useEffect } from "react";
import { 
    Pressable, 
    ScrollView, 
    Share, 
    StyleSheet, 
    Text, 
    View, 
    Animated,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { IPA_BASE } from '@env';

const { width } = Dimensions.get('window');

type UserProfile = {
    name: string;
    email: string;
    profile_picture: string;
    address: string;
    interests: string[];
    refaradal_code: string;
    balance: number;
    has_claimed_referral: boolean;
    referred_by: string | null;
};

type RouteParams = {
    user: UserProfile;
};

type MyRouteProp = RouteProp<{ Profile: RouteParams }, "Profile">;

const ReferAndEarn = () => {
    const route = useRoute<MyRouteProp>();
    const user = route.params.user;

    const [copied, setCopied] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [loading, setLoading] = useState(true);
    const [referralReward, setReferralReward] = useState(10); // Default $10
    const [userBalance, setUserBalance] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    // Fetch referral settings
    useEffect(() => {
        fetchReferralSettings();
    }, []);

    const fetchReferralSettings = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('vToken');
            if (!token) return;

            const response = await axios.get(`${IPA_BASE}account/site-settings/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            console.log('📊 Referral settings:', response.data);
            
            if (response.data) {
                setReferralReward(response.data.referral_reward_amount || 10);
                setUserBalance(response.data.user_referral_amount || 0);
            }
        } catch (error) {
            console.error('❌ Error fetching referral settings:', error);
            // Keep default $10 if API fails
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showToast) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 0.8,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [showToast]);

    const handleCopy = async () => {
        await Clipboard.setStringAsync(user.refaradal_code);
        setCopied(true);
        setShowToast(true);
        setTimeout(() => {
            setCopied(false);
            setShowToast(false);
        }, 2000);
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `🎉 Use my referral code ${user.refaradal_code} and get $${referralReward} off your first purchase on DealNux! 🛍️`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    return (
        <SafeAreaView className="bg-[#F8FAFC] flex-1">
            <View className="px-5 flex-1">
                {/* Header */}
                <View className="flex-row items-center gap-4 py-2">
                    <AppHeader
                        left={() => <BackButton />}
                        middle={() => <Text className="text-lg font-bold text-[#1F2937]">Refer & Earn</Text>}
                    />
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* Hero Section */}
                    <LinearGradient
                        colors={['#1E2F73', '#2946A6', '#2355B6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        {/* Decorative Circles */}
                        <View style={styles.decorativeCircle1} />
                        <View style={styles.decorativeCircle2} />
                        <View style={styles.decorativeCircle3} />

                        <View style={styles.heroContent}>
                            <View style={styles.giftIconContainer}>
                                <Ionicons name="gift" size={32} color="#FFD700" />
                            </View>
                            <Text style={styles.heroTitle}>Refer a Friend &</Text>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#FFD700" />
                                    <Text style={[styles.heroAmount, { fontSize: 24 }]}>Loading...</Text>
                                </View>
                            ) : (
                                <Text style={styles.heroAmount}>
                                    Both Get ${referralReward}
                                </Text>
                            )}
                            <Text style={styles.heroDescription}>
                                Give your friends a discount and earn credits for your next smart purchase.
                            </Text>
                            
                            {/* Balance Display */}
                            {!loading && userBalance > 0 && (
                                <View style={styles.balanceDisplay}>
                                    <Ionicons name="wallet-outline" size={16} color="#FFD700" />
                                    <Text style={styles.balanceText}>
                                        Your balance: {formatCurrency(userBalance)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>

                    {/* Referral Code Card */}
                    <View style={styles.codeCard}>
                        <View style={styles.codeHeader}>
                            <View>
                                <Text style={styles.codeTitle}>Your Referral Code</Text>
                                <Text style={styles.codeSubtitle}>Share this code with friends</Text>
                            </View>
                            <View style={styles.premiumBadge}>
                                <Ionicons name="star" size={14} color="#FFD700" />
                                <Text style={styles.premiumBadgeText}>Earn ${referralReward}</Text>
                            </View>
                        </View>

                        {/* Code Display */}
                        <View style={styles.codeContainer}>
                            <View style={styles.codeBox}>
                                <Text style={styles.codeText}>{user.refaradal_code}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={handleCopy} 
                                style={styles.copyButton}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#2355B6', '#1A4D8F']}
                                    style={styles.copyGradient}
                                >
                                    <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.copyButtonText}>
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Share Button */}
                        <TouchableOpacity
                            onPress={onShare}
                            style={styles.shareButton}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#FFC649', '#F59E0B']}
                                style={styles.shareGradient}
                            >
                                <Ionicons name="share-social-outline" size={22} color="#1F2937" />
                                <Text style={styles.shareButtonText}>Share Referral Link</Text>
                                <Feather name="arrow-right" size={18} color="#1F2937" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>${referralReward}</Text>
                                <Text style={styles.statLabel}>You Earn</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>${referralReward}</Text>
                                <Text style={styles.statLabel}>Friend Gets</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>∞</Text>
                                <Text style={styles.statLabel}>Unlimited</Text>
                            </View>
                        </View>
                    </View>

                    {/* How It Works */}
                    <View style={styles.howItWorks}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIcon}>
                                <Ionicons name="bulb-outline" size={20} color="#2355B6" />
                            </View>
                            <Text style={styles.sectionTitle}>How It Works</Text>
                        </View>

                        {/* Steps */}
                        <View style={styles.stepsContainer}>
                            {/* Step 1 */}
                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <View style={styles.stepIconWrapper}>
                                        <Ionicons name="share-outline" size={24} color="#2355B6" />
                                    </View>
                                    <Text style={styles.stepTitle}>Invite a friend</Text>
                                    <Text style={styles.stepDescription}>
                                        Share your unique code via text, email, or social media
                                    </Text>
                                </View>
                            </View>

                            {/* Step 2 */}
                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <View style={styles.stepIconWrapper}>
                                        <Ionicons name="person-add-outline" size={24} color="#2355B6" />
                                    </View>
                                    <Text style={styles.stepTitle}>They join & save</Text>
                                    <Text style={styles.stepDescription}>
                                        Your friend signs up and gets ${referralReward} off their first purchase
                                    </Text>
                                </View>
                            </View>

                            {/* Step 3 */}
                            <View style={[styles.stepCard, styles.stepCardLast]}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <View style={styles.stepIconWrapper}>
                                        <Ionicons name="cash-outline" size={24} color="#2355B6" />
                                    </View>
                                    <Text style={styles.stepTitle}>You both earn ${referralReward}</Text>
                                    <Text style={styles.stepDescription}>
                                        Credits are automatically applied to your wallet instantly
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Footer Note */}
                    <View style={styles.footerNote}>
                        <Ionicons name="information-circle-outline" size={18} color="#94A3B8" />
                        <Text style={styles.footerNoteText}>
                            Terms & Conditions apply. Credits expire in 30 days.
                        </Text>
                    </View>
                </ScrollView>
            </View>

            {/* Toast Notification */}
            {showToast && (
                <Animated.View 
                    style={[
                        styles.toastContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.toastGradient}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                        <Text style={styles.toastText}>Code copied successfully!</Text>
                    </LinearGradient>
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    // Hero Card
    heroCard: {
        borderRadius: 24,
        paddingVertical: 36,
        paddingHorizontal: 20,
        marginTop: 8,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#2355B6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    decorativeCircle1: {
        position: 'absolute',
        top: -60,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: -40,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    decorativeCircle3: {
        position: 'absolute',
        top: 20,
        right: 60,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    heroContent: {
        alignItems: 'center',
        zIndex: 1,
    },
    giftIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,215,0,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    heroAmount: {
        fontSize: 38,
        fontWeight: '800',
        color: '#FFD700',
        textAlign: 'center',
        marginTop: 2,
    },
    heroDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    balanceDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,215,0,0.15)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    balanceText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFD700',
    },

    // Code Card
    codeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    codeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    codeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    codeSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    premiumBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    codeBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeText: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 3,
        color: '#1F2937',
    },
    copyButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    copyGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    copyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Share Button
    shareButton: {
        marginTop: 16,
        borderRadius: 14,
        overflow: 'hidden',
    },
    shareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E5E7EB',
    },

    // How It Works
    howItWorks: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    stepsContainer: {
        gap: 12,
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    stepCardLast: {
        marginBottom: 0,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2355B6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        flexShrink: 0,
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    stepContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    stepDescription: {
        fontSize: 12,
        color: '#6B7280',
        flex: 2,
        lineHeight: 18,
    },

    // Footer Note
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 12,
    },
    footerNoteText: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
    },

    // Toast Notification
    toastContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    toastGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    toastText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ReferAndEarn;