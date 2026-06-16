import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import { AuthStackParamList } from "../../Navigation/types";

type PlanType = "monthly" | "yearly";



const Feature = ({ text, blue }: { text: string; blue?: boolean }) => (
    <View style={styles.featureRow}>
        <Ionicons
            name="checkmark-done"
            size={22}
            color={blue ? "#1D4ED8" : "#111827"}
            style={{ marginRight: 12 }}
        />
        <Text style={styles.featureText}>{text}</Text>
    </View>
);


const PaymentMethodModal = ({
    visible,
    onClose,
    onAddCard,
    onConfirm,
}: {
    visible: boolean;
    onClose: () => void;
    onAddCard: () => void;
    onConfirm: () => void;
}) => {
    return (
        <Modal transparent visible={visible} animationType="fade">
            {/* overlay */}
            <Pressable onPress={onClose} className="flex-1 bg-black/40" />

            {/* bottom sheet */}
            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] px-6 pt-4 pb-7">
                <View className="w-[70px] h-[6px] rounded-full bg-[#E5E7EB] self-center mb-4" />

                <Text className="text-xl font-bold text-[#2D2D2D] text-center mb-4">
                    Payment Method
                </Text>

                <View className="h-[1px] bg-[#EEF0F3] mb-4" />

                {/* method row */}
                <TouchableOpacity activeOpacity={0.85} className="bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between shadow-sm my-5">
                    <View className="flex-row items-center">
                        <View className="w-11 h-11 rounded-xl bg-[#4F46E5] items-center justify-center mr-4">
                            <Ionicons name="logo-buffer" size={20} color="#fff" />
                        </View>
                        <Text className="text-3xl font-bold text-[#111827]">strapi</Text>
                    </View>

                    <Ionicons name="radio-button-on" size={22} color="#1D4ED8" />
                </TouchableOpacity>

                {/* add new card */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={onAddCard}
                    className="mt-5 border-2 border-[#1D4ED8] rounded-2xl py-4 flex-row items-center justify-center my-5"
                >
                    <Text className="text-xl font-bold text-[#1D4ED8] mr-3">
                        Add New Card
                    </Text>
                    <Ionicons name="add" size={24} color="#1D4ED8" />
                </TouchableOpacity>

                {/* confirm */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={onConfirm}
                    className="mt-5 bg-[#1D4ED8] rounded-2xl py-5 items-center shadow-lg"
                >
                    <Text className="text-white text-xl font-bold">
                        Confirm and Pay
                    </Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const Subscription = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const [planType, setPlanType] = useState<PlanType>("monthly");
    const isAndroid = Platform.OS === 'android';
    const [payOpen, setPayOpen] = useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [timer, setTimer] = useState(60);
    const [spinnerRotation, setSpinnerRotation] = useState(0);

    useEffect(() => {
        if (!showSuccessModal) return;

        const t = setTimeout(() => {
            setShowSuccessModal(false);
            navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" as never }],
            });
        }, 3000);

        return () => clearTimeout(t);
    }, [showSuccessModal]);

    useEffect(() => {
        let spinnerInterval: NodeJS.Timeout | undefined;

        if (showSuccessModal) {
            spinnerInterval = setInterval(() => {
                setSpinnerRotation((prev) => (prev + 45) % 360);
            }, 150);
        } else {
            setSpinnerRotation(0);
        }

        return () => {
            if (spinnerInterval) clearInterval(spinnerInterval);
        };
    }, [showSuccessModal]);

    const spinnerDots = [
        { angle: 0, size: 12, opacity: 1 },
        { angle: 45, size: 11, opacity: 0.9 },
        { angle: 90, size: 10, opacity: 0.8 },
        { angle: 135, size: 9, opacity: 0.6 },
        { angle: 180, size: 8, opacity: 0.4 },
        { angle: 225, size: 7, opacity: 0.3 },
        { angle: 270, size: 6, opacity: 0.2 },
        { angle: 315, size: 6, opacity: 0.1 },
    ];
    const proPrice = planType === "monthly" ? "$4.99 / month" : "$49.99 / year";
    const proRibbon = planType === "monthly" ? "MOST POPULAR" : "BEST VALUE";
    const trialText = planType === "monthly" ? "Free trial (7 days)" : "Free trial (14 days)";

    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5">
                <View className='flex-row items-center gap-4' >
                    <AppHeader left={() => <BackButton />} middle={() => <Text className='text-lg font-semibold'>Subscription Plans</Text>} />

                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Segmented tabs */}
                    <View style={styles.segmentWrap}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setPlanType("monthly")}
                            style={[styles.segmentBtn, planType === "monthly" && styles.segmentBtnActive]}
                        >
                            <Text style={styles.segmentText}>Monthly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setPlanType("yearly")}
                            style={[styles.segmentBtn, planType === "yearly" && styles.segmentBtnActive]}
                        >
                            {/* ✅ NO gap (crash fix) */}
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Text style={[styles.segmentText, { marginRight: 10 }]}>Yearly</Text>

                                <View style={styles.discountPill}>
                                    <Text style={styles.discountText}>-16.52%</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Free Plan Card */}
                    <View style={styles.card}>
                        <View style={styles.cardTopRow}>
                            <Text style={styles.planTitle}>Free Plan</Text>
                            <View style={styles.activePill}>
                                <Text style={styles.activeText}>Active</Text>
                            </View>
                        </View>

                        <Text style={styles.priceBig}>$0.00</Text>

                        <View style={styles.currentPlanBtn}>
                            <Text style={styles.currentPlanText}>Current Plan</Text>
                        </View>

                        <View style={{ marginTop: 18 }}>
                            <Feature text="5 Price Alerts" />
                            <Feature text="Basic Tracking" />
                            <Feature text="Ad-supported" />
                        </View>
                    </View>

                    {/* PRO Plan Card */}
                    <View style={styles.proCard}>
                        <View style={styles.ribbon}>
                            <Text style={styles.ribbonText}>{proRibbon}</Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 12 }}>
                            <Text style={styles.brandBlue}>DEAL</Text>
                            <Text style={styles.brandGold}>NUX</Text>
                            <Text style={styles.brandDark}> PRO</Text>
                        </View>

                        <Text style={styles.proPrice}>{proPrice}</Text>

                        <TouchableOpacity onPress={() => setPayOpen(true)} activeOpacity={0.9} style={styles.upgradeBtn}>
                            <Text style={styles.upgradeText}>Upgrade Now</Text>
                        </TouchableOpacity>

                        <View style={{ marginTop: 16 }}>
                            <Feature text={trialText} blue />
                            <Feature text="Unlimited Price Alerts" blue />
                            <Feature text="Advanced AI Optimization" blue />
                            <Feature text="Ad-free Experience" blue />
                            <Feature text="Priority Support" blue />
                            <Feature text="Ad-supported" blue />
                        </View>
                    </View>

                    <View style={{ height: 30, marginBottom:25}} />
                </ScrollView>
            </View>

            <PaymentMethodModal
                visible={payOpen}
                onClose={() => setPayOpen(false)}
                onAddCard={() => {

                    setPayOpen(false);
                }}
                onConfirm={() => {

                    setShowSuccessModal(true);
                    setPayOpen(false);
                }}
            />
            <Modal
                transparent={true}
                animationType="fade"
                visible={showSuccessModal}
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={StyleSheet.absoluteFill}>
                    {/* Blur */}
                    <BlurView intensity={isAndroid ? 2 : 15}
                                            experimentalBlurMethod="dimezisBlurView"
                                            style={[StyleSheet.absoluteFill,]} />

                    {/* Extra dim layer to make Android look closer to iOS */}
                    <View className='flex-1 items-center justify-center bg-[rgba(0,0,0,0.8)]'>

                        {/* Content */}
                        <View className="flex-1 justify-center items-center px-10">
                            <View className="w-full max-w-[400px]">
                                <View className="bg-white rounded-3xl p-10 items-center shadow-2xl">
                                    <View className="bg-[#1d4fd817] rounded-full  mt-6 p-4">
                                        <View className=" bg-[#1d4fd82c] p-5 rounded-full">
                                            <Ionicons name="card" size={30} color="#1D4ED8" />
                                        </View>
                                    </View>

                                    <Text className="text-3xl font-bold text-center mt-8 mb-8">
                                        Payment Successfully
                                    </Text>

                                    <Text className="text-xl text-[#636F85] text-center mb-8 leading-6">

                                        Your payment has been done {'\n'} successfully.
                                    </Text>

                                    {/* Spinner */}
                                    <View className="w-16 h-16 my-8 items-center justify-center">
                                        {spinnerDots.map((dot, index) => {
                                            const angle = (dot.angle + spinnerRotation) * (Math.PI / 180);
                                            const radius = 20;
                                            const x = Math.cos(angle) * radius;
                                            const y = Math.sin(angle) * radius;

                                            return (
                                                <View
                                                    key={index}
                                                    style={{
                                                        position: 'absolute',
                                                        width: dot.size,
                                                        height: dot.size,
                                                        borderRadius: dot.size / 2,
                                                        backgroundColor: '#2355B6',
                                                        opacity: dot.opacity,
                                                        transform: [{ translateX: x }, { translateY: y }],
                                                    }}
                                                />
                                            );
                                        })}
                                    </View>


                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Subscription;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#F9F9FB" },
    container: { paddingHorizontal: 20, paddingBottom: 10 },

    // ✅ removed gap, used marginRight



    segmentWrap: {
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 18,
        padding: 5,
        marginBottom: 12,
    },
    segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    segmentBtnActive: {
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    segmentText: { fontSize: 16, fontWeight: "800", color: "#111827" },

    discountPill: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    discountText: { color: "#15803D", fontWeight: "900", fontSize: 14 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 2,
        marginBottom: 18,
    },
    cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    planTitle: { fontSize: 18, fontWeight: "500", color: "#111827" },
    activePill: { backgroundColor: "#DCFCE7", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
    activeText: { color: "#15803D", fontWeight: "900", fontSize: 14 },
    priceBig: { fontSize: 20, fontWeight: "900", color: "#2D2D2D", marginTop: 6 },
    currentPlanBtn: { backgroundColor: "#F1F5F9", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
    currentPlanText: { fontSize: 16, fontWeight: "800", color: "#64748B" },

    proCard: {
        backgroundColor: "#E9EEF9",
        borderRadius: 26,
        padding: 22,
        borderWidth: 2,
        borderColor: "#1D4ED8",
        position: "relative",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 2,
    },
    ribbon: { position: "absolute", right: 0, top: 0, backgroundColor: "#1D4ED8", paddingHorizontal: 16, paddingVertical: 10, borderBottomLeftRadius: 18 },
    ribbonText: { color: "#fff", fontWeight: "900", fontSize: 18, letterSpacing: 0.5 },

    brandBlue: { fontSize: 18, fontWeight: "900", color: "#1D4ED8", letterSpacing: 1 },
    brandGold: { fontSize: 18, fontWeight: "900", color: "#FBBF24", letterSpacing: 1 },
    brandDark: { fontSize: 18, fontWeight: "900", color: "#111827", letterSpacing: 1 },

    proPrice: { fontSize: 26, fontWeight: "900", color: "#2D2D2D", marginBottom: 8 },
    upgradeBtn: {
        backgroundColor: "#1D4ED8",
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    upgradeText: { color: "#fff", fontSize: 16, fontWeight: "900" },

    featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
    featureText: { fontSize: 16, fontWeight: "500", color: "#2D2D2D" },
});
