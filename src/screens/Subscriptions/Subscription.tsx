import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import { AuthStackParamList } from "../../Navigation/types";
import { IPA_BASE, STRIPE_PUBLISHABLE_KEY } from "@env";

const API_BASE_URL = IPA_BASE
const PLANS_ENDPOINT = "payment/plans/";
const SUBSCRIBE_ENDPOINT = "payment/subscribe/";

// ─── Types ────────────────────────────────────────────────────────────────────
type Plan = {
  id: number;
  name: string;
  plan_type: string;
  price: string;
  trial_days: number;
  clicks_per_day: number;
  price_alerts_limit: number;
  has_ai_optimization: boolean;
  has_barcode_scanning: boolean;
  features: string[];
};

type SubscribeResponse = {
  client_secret: string;
  payment_intent_client_secret: string;
  plan_name: string;
  amount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isMonthly = (plan_type: string) =>
  plan_type.includes("MONTHLY") || plan_type === "FREE";

const isYearly = (plan_type: string) => plan_type.includes("YEARLY");

const isFree = (plan_type: string) => plan_type === "FREE";

const planBadgeLabel = (plan_type: string) => {
  if (plan_type === "FREE") return "FREE";
  if (plan_type.includes("MONTHLY")) return "MONTHLY";
  if (plan_type.includes("YEARLY")) return "YEARLY";
  return "";
};

// ─── Feature Row ──────────────────────────────────────────────────────────────
const Feature = ({ text, blue }: { text: string; blue?: boolean }) => (
  <View style={styles.featureRow}>
    <Ionicons
      name="checkmark-done"
      size={20}
      color={blue ? "#1D4ED8" : "#111827"}
      style={{ marginRight: 10 }}
    />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const PlanSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, { width: "50%", marginTop: 10 }]} />
    <View style={[styles.skeletonLine, { width: "80%", marginTop: 20, height: 48 }]} />
    {[1, 2, 3].map((i) => (
      <View key={i} style={[styles.skeletonLine, { width: "90%", marginTop: 10, height: 14 }]} />
    ))}
  </View>
);

// ─── Plan Card ────────────────────────────────────────────────────────────────
const PlanCard = ({
  plan,
  onSubscribe,
  subscribingId,
}: {
  plan: Plan;
  onSubscribe: (plan: Plan) => void;
  subscribingId: number | null;
}) => {
  const free = isFree(plan.plan_type);
  const yearly = isYearly(plan.plan_type);
  const badge = planBadgeLabel(plan.plan_type);
  const isLoading = subscribingId === plan.id;

  if (free) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.planTitle}>{plan.name}</Text>
          <View style={styles.activePill}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>
        <Text style={styles.priceBig}>
          ${parseFloat(plan.price).toFixed(2)}
          {plan.trial_days > 0 && (
            <Text style={styles.trialNote}> · {plan.trial_days}-day trial</Text>
          )}
        </Text>
        <View style={styles.currentPlanBtn}>
          <Text style={styles.currentPlanText}>Current Plan</Text>
        </View>
        <View style={{ marginTop: 16 }}>
          {plan.features.map((f, i) => (
            <Feature key={i} text={f} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.proCard, yearly && styles.yearlyCard]}>
      {/* Ribbon */}
      <View style={[styles.ribbon, yearly && styles.yearlyRibbon]}>
        <Text style={styles.ribbonText}>{yearly ? "BEST VALUE" : "POPULAR"}</Text>
      </View>

      {/* Plan name */}
      <Text style={styles.proName} numberOfLines={1}>
        {plan.name}
      </Text>

      {/* Price */}
      <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4 }}>
        <Text style={styles.proPrice}>${parseFloat(plan.price).toFixed(2)}</Text>
        <Text style={styles.pricePer}>
          {" "}/ {yearly ? "year" : "month"}
        </Text>
      </View>

      {/* Badge */}
      <View style={[styles.badgePill, yearly && styles.yearlyBadgePill]}>
        <Text style={[styles.badgeText, yearly && { color: "#92400E" }]}>{badge}</Text>
      </View>

      {/* Upgrade button */}
      <TouchableOpacity
        onPress={() => onSubscribe(plan)}
        disabled={subscribingId !== null}
        activeOpacity={0.88}
        style={[styles.upgradeBtn, yearly && styles.yearlyUpgradeBtn, subscribingId !== null && { opacity: 0.6 }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.upgradeText}>
            {plan.trial_days > 0 ? `Start ${plan.trial_days}-Day Trial` : "Subscribe Now"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Features */}
      <View style={{ marginTop: 14 }}>
        {plan.features.map((f, i) => (
          <Feature key={i} text={f} blue />
        ))}
      </View>

      {/* Clicks info */}
      <View style={styles.clicksRow}>
        <Ionicons name="flash" size={14} color="#6B7280" />
        <Text style={styles.clicksText}>{plan.clicks_per_day} retailer clicks/day</Text>
      </View>
    </View>
  );
};

// ─── Success Modal ────────────────────────────────────────────────────────────
const SuccessModal = ({
  visible,
  planName,
}: {
  visible: boolean;
  planName: string;
}) => {
  const isAndroid = Platform.OS === "android";
  const [spinnerRotation, setSpinnerRotation] = useState(0);

  useEffect(() => {
    if (!visible) { setSpinnerRotation(0); return; }
    const t = setInterval(() => setSpinnerRotation((p) => (p + 45) % 360), 150);
    return () => clearInterval(t);
  }, [visible]);

  const dots = [
    { angle: 0, size: 12, opacity: 1 },
    { angle: 45, size: 11, opacity: 0.9 },
    { angle: 90, size: 10, opacity: 0.8 },
    { angle: 135, size: 9, opacity: 0.6 },
    { angle: 180, size: 8, opacity: 0.4 },
    { angle: 225, size: 7, opacity: 0.3 },
    { angle: 270, size: 6, opacity: 0.2 },
    { angle: 315, size: 6, opacity: 0.1 },
  ];

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={isAndroid ? 2 : 15}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="card" size={30} color="#1D4ED8" />
              </View>
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSub}>
              You're now subscribed to{"\n"}
              <Text style={{ fontWeight: "700", color: "#1D4ED8" }}>{planName}</Text>
            </Text>
            <View style={styles.spinnerWrap}>
              {dots.map((dot, i) => {
                const angle = (dot.angle + spinnerRotation) * (Math.PI / 180);
                const r = 20;
                return (
                  <View
                    key={i}
                    style={{
                      position: "absolute",
                      width: dot.size,
                      height: dot.size,
                      borderRadius: dot.size / 2,
                      backgroundColor: "#2355B6",
                      opacity: dot.opacity,
                      transform: [
                        { translateX: Math.cos(angle) * r },
                        { translateY: Math.sin(angle) * r },
                      ],
                    }}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Inner Component ──────────────────────────────────────────────────────────
const SubscriptionInner = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");

  const [subscribingId, setSubscribingId] = useState<number | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successPlanName, setSuccessPlanName] = useState("");

  // ── Fetch plans ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const token = await AsyncStorage.getItem("vToken");
        const res = await axios.get(`${API_BASE_URL}${PLANS_ENDPOINT}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setPlans(res.data?.data ?? []);
      } catch (err: any) {
        console.error("❌ Plans fetch error:", err?.response?.data || err);
        Alert.alert("Error", "Failed to load subscription plans.");
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // ── Filter plans by tab ────────────────────────────────────────────────────
  const filteredPlans = plans.filter((p) => {
    if (isFree(p.plan_type)) return true;
    if (tab === "monthly") return isMonthly(p.plan_type);
    return isYearly(p.plan_type);
  });

  // ── Subscribe flow ─────────────────────────────────────────────────────────
  const handleSubscribe = async (plan: Plan) => {
    try {
      setSubscribingId(plan.id);

      const token = await AsyncStorage.getItem("vToken");
      if (!token) {
        Alert.alert("Error", "Please login to continue.");
        return;
      }

      // Step 1 — hit subscribe API
      const res = await axios.post(
        `${API_BASE_URL}${SUBSCRIBE_ENDPOINT}`,
        { plan_id: plan.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Subscribe response:", res.data);
      const data: SubscribeResponse = res.data;

      if (!data.payment_intent_client_secret) {
        Alert.alert("Error", "Could not initialize payment. Please try again.");
        return;
      }

      // Step 2 — init Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.payment_intent_client_secret,
        merchantDisplayName: "DealNux",
        appearance: { colors: { primary: "#1D4ED8" } },
        returnURL: "savvyshopper://payment-complete",
      });

      if (initError) {
        console.error("❌ initPaymentSheet error:", initError);
        Alert.alert("Payment Error", initError.message || "Failed to initialize payment.");
        return;
      }

      // Step 3 — present Payment Sheet
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === "Canceled") {
          // user closed — do nothing
        } else {
          Alert.alert("Payment Failed", payError.message || "Payment could not be completed.");
        }
      } else {
        // ✅ Success
        setSuccessPlanName(data.plan_name);
        setSuccessVisible(true);

        // Auto-close after 3s and go home
        setTimeout(() => {
          setSuccessVisible(false);
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" as never }],
          });
        }, 3000);
      }
    } catch (err: any) {
      console.error("❌ Subscribe error:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.message || "Subscription failed. Please try again.");
    } finally {
      setSubscribingId(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9FB" }}>
      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppHeader
            left={() => <BackButton />}
            middle={() => (
              <Text style={{ fontSize: 18, fontWeight: "600" }}>Subscription Plans</Text>
            )}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Tab toggle */}
          <View style={styles.segmentWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setTab("monthly")}
              style={[styles.segmentBtn, tab === "monthly" && styles.segmentBtnActive]}
            >
              <Text style={styles.segmentText}>Monthly</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setTab("yearly")}
              style={[styles.segmentBtn, tab === "yearly" && styles.segmentBtnActive]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.segmentText, { marginRight: 8 }]}>Yearly</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>Save more</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Plans */}
          {plansLoading ? (
            <>
              <PlanSkeleton />
              <PlanSkeleton />
            </>
          ) : (
            filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSubscribe={handleSubscribe}
                subscribingId={subscribingId}
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Success Modal */}
      <SuccessModal visible={successVisible} planName={successPlanName} />
    </SafeAreaView>
  );
};

// ─── Root Export ──────────────────────────────────────────────────────────────
const Subscription = () => (
  <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
    <SubscriptionInner />
  </StripeProvider>
);

export default Subscription;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    padding: 5,
    marginBottom: 16,
    marginTop: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  segmentText: { fontSize: 15, fontWeight: "800", color: "#111827" },
  discountPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  discountText: { color: "#15803D", fontWeight: "900", fontSize: 12 },

  // Free plan card
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  activePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeText: { color: "#15803D", fontWeight: "900", fontSize: 13 },
  priceBig: { fontSize: 20, fontWeight: "900", color: "#2D2D2D", marginTop: 6 },
  trialNote: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  currentPlanBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  currentPlanText: { fontSize: 15, fontWeight: "800", color: "#64748B" },

  // Pro / paid plan card
  proCard: {
    backgroundColor: "#E9EEF9",
    borderRadius: 26,
    padding: 22,
    borderWidth: 2,
    borderColor: "#1D4ED8",
    position: "relative",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  yearlyCard: {
    backgroundColor: "#FEF9EC",
    borderColor: "#D97706",
  },
  ribbon: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
  },
  yearlyRibbon: { backgroundColor: "#D97706" },
  ribbonText: { color: "#fff", fontWeight: "900", fontSize: 13, letterSpacing: 0.4 },

  proName: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 4, marginBottom: 4 },
  proPrice: { fontSize: 26, fontWeight: "900", color: "#2D2D2D" },
  pricePer: { fontSize: 14, fontWeight: "500", color: "#6B7280" },

  badgePill: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 14,
    marginTop: 6,
  },
  yearlyBadgePill: { backgroundColor: "#FEF3C7" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#1D4ED8", letterSpacing: 0.5 },

  upgradeBtn: {
    backgroundColor: "#1D4ED8",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  yearlyUpgradeBtn: {
    backgroundColor: "#D97706",
    shadowColor: "#D97706",
  },
  upgradeText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  featureText: { fontSize: 14, fontWeight: "500", color: "#2D2D2D", flex: 1 },

  clicksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
  },
  clicksText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  // Skeleton
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  skeletonLine: {
    width: "70%",
    height: 20,
    borderRadius: 8,
    backgroundColor: "#E9EDF3",
  },

  // Success modal
  successOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 32,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
  },
  successIconOuter: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    padding: 16,
    marginBottom: 8,
  },
  successIconInner: {
    backgroundColor: "#DBEAFE",
    padding: 18,
    borderRadius: 999,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  successSub: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  spinnerWrap: {
    width: 64,
    height: 64,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});