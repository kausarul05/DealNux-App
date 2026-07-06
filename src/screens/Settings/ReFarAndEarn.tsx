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
    const [referralReward, setReferralReward] = useState(8); // Default $8
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

            // console.log('📊 Referral settings:', response.data);
            
            if (response.data) {
                setReferralReward(response.data.referral_reward_amount || 8);
                setUserBalance(response.data.user_referral_amount || 0);
            }
        } catch (error) {
            console.error('❌ Error fetching referral settings:', error);
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
                    {/* Hero Section - Refer a Friend and Win a Prize */}
                    <LinearGradient
                        colors={['#1E2F73', '#2946A6', '#2355B6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.decorativeCircle1} />
                        <View style={styles.decorativeCircle2} />
                        <View style={styles.decorativeCircle3} />

                        <View style={styles.heroContent}>
                            <View style={styles.giftIconContainer}>
                                <Ionicons name="gift" size={28} color="#FFD700" />
                            </View>
                            <Text style={styles.heroTitle}>Refer a Friend &</Text>
                            <Text style={styles.heroSubtitle}>Win a Prize</Text>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#FFD700" />
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.heroAmount}>
                                        Earn {referralReward} Credits
                                    </Text>
                                    <Text style={styles.heroPerReferral}>
                                        for each Referral
                                    </Text>
                                </>
                            )}
                            <Text style={styles.heroDescription}>
                                Invite your friends to join DEALNUX and earn credits towards your next smart purchase.
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* Referral Code Card */}
                    <View style={styles.codeCard}>
                        <View style={styles.codeHeader}>
                            <Text style={styles.codeTitle}>Your Referral Code</Text>
                            <View style={styles.premiumBadge}>
                                <Ionicons name="star" size={12} color="#FFD700" />
                                <Text style={styles.premiumBadgeText}>Earn ${referralReward}</Text>
                            </View>
                        </View>

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
                                    <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
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
                                <Ionicons name="share-social-outline" size={20} color="#1F2937" />
                                <Text style={styles.shareButtonText}>Share Referral Link</Text>
                                <Feather name="arrow-right" size={16} color="#1F2937" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Savings Trends / Rules */}
                        {/* <View style={styles.rulesCard}>
                            <Text style={styles.rulesTitle}>📋 Savings Trends</Text>
                            <View style={styles.rulesList}>
                                <View style={styles.ruleItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.ruleText}>Credits are valid for 12 months.</Text>
                                </View>
                                <View style={styles.ruleItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.ruleText}>One referral reward per new user.</Text>
                                </View>
                                <View style={styles.ruleItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.ruleText}>
                                        Friends you refer must purchase a subscription and complete their first purchase on DEALNUX for you to earn.
                                    </Text>
                                </View>
                                <View style={styles.ruleItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.ruleText}>1 credit earned equals $1.</Text>
                                </View>
                                <View style={styles.ruleItem}>
                                    <View style={styles.bulletPoint} />
                                    <Text style={styles.ruleText}>
                                        Referral points are redeemable only on eligible local DEALNUX products and cannot be used with external retailers.
                                    </Text>
                                </View>
                            </View>
                        </View> */}

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
                            <Text style={styles.sectionTitle}>HOW IT WORKS</Text>
                        </View>

                        <View style={styles.stepsContainer}>
                            {/* Step 1 */}
                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <View style={styles.stepIconWrapper}>
                                        <Ionicons name="share-outline" size={22} color="#2355B6" />
                                    </View>
                                    <View style={styles.stepTextContainer}>
                                        <Text style={styles.stepTitle}>Invite a friend</Text>
                                        <Text style={styles.stepDescription}>
                                            Share your unique link or code via text, email or social media.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Step 2 */}
                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <View style={styles.stepIconWrapper}>
                                        <Ionicons name="person-add-outline" size={22} color="#2355B6" />
                                    </View>
                                    <View style={styles.stepTextContainer}>
                                        <Text style={styles.stepTitle}>Your friend joins DEALNUX</Text>
                                        <Text style={styles.stepDescription}>
                                            Your friend signs up, purchases any of our subscription plans and completes the first purchase on DEALNUX.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Step 3 */}
                            <View style={[styles.stepCard, styles.stepCardLast]}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <View style={styles.stepIconWrapper}>
                                        <Ionicons name="cash-outline" size={22} color="#2355B6" />
                                    </View>
                                    <View style={styles.stepTextContainer}>
                                        <Text style={styles.stepTitle}>You earn credits</Text>
                                        <Text style={styles.stepDescription}>
                                            Credits are automatically applied to your wallet instantly.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Terms Section */}
                    <View style={styles.termsCard}>
                        <View style={styles.termsHeader}>
                            <Ionicons name="document-text-outline" size={20} color="#2355B6" />
                            <Text style={styles.termsTitle}>TERMS</Text>
                        </View>
                        <View style={styles.termsList}>
                            <View style={styles.termItem}>
                                <View style={styles.termBullet} />
                                <Text style={styles.termText}>Credits are valid for 12 months.</Text>
                            </View>
                            <View style={styles.termItem}>
                                <View style={styles.termBullet} />
                                <Text style={styles.termText}>One referral reward per new user.</Text>
                            </View>
                            <View style={styles.termItem}>
                                <View style={styles.termBullet} />
                                <Text style={styles.termText}>
                                    Friends you refer must purchase a subscription and complete their first purchase on DEALNUX for you to earn.
                                </Text>
                            </View>
                            <View style={styles.termItem}>
                                <View style={styles.termBullet} />
                                <Text style={styles.termText}>1 credit earned equals $1.</Text>
                            </View>
                            <View style={styles.termItem}>
                                <View style={styles.termBullet} />
                                <Text style={styles.termText}>
                                    Referral points are redeemable only on eligible local DEALNUX products and cannot be used with external retailers.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Balance Display */}
                    {!loading && userBalance > 0 && (
                        <View style={styles.balanceCard}>
                            <Ionicons name="wallet-outline" size={20} color="#2355B6" />
                            <Text style={styles.balanceCardText}>
                                Your current balance: <Text style={styles.balanceCardAmount}>{formatCurrency(userBalance)}</Text>
                            </Text>
                        </View>
                    )}
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
                        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
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
        paddingVertical: 32,
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
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,215,0,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFD700',
        textAlign: 'center',
        marginTop: 2,
    },
    heroAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: 12,
    },
    heroPerReferral: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
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
        marginTop: 8,
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
        marginBottom: 14,
    },
    codeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    premiumBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#92400E',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    codeBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 3,
        color: '#1F2937',
    },
    copyButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    copyGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    copyButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Share Button
    shareButton: {
        marginTop: 14,
        borderRadius: 12,
        overflow: 'hidden',
    },
    shareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    shareButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },

    // Rules Card
    rulesCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    rulesTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 10,
    },
    rulesList: {
        gap: 6,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bulletPoint: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#2355B6',
        marginTop: 7,
    },
    ruleText: {
        fontSize: 13,
        color: '#4B5563',
        flex: 1,
        lineHeight: 20,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 14,
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
        marginBottom: 14,
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
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    stepsContainer: {
        gap: 10,
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
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
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2355B6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        flexShrink: 0,
    },
    stepNumberText: {
        fontSize: 12,
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
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    stepTextContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    stepDescription: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 18,
        marginTop: 2,
    },

    // Terms Card
    termsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    termsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    termsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    termsList: {
        gap: 6,
    },
    termItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    termBullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#9CA3AF',
        marginTop: 7,
    },
    termText: {
        fontSize: 12,
        color: '#6B7280',
        flex: 1,
        lineHeight: 18,
    },

    // Balance Card
    balanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#EFF6FF',
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    balanceCardText: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
    },
    balanceCardAmount: {
        fontWeight: '700',
        color: '#2355B6',
    },

    // Toast
    toastContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        borderRadius: 14,
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
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    toastText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default ReferAndEarn;