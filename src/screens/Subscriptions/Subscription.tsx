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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";

import AppHeader from "../../components/AppHeader";
import BackButton from "../../components/BackButton";
import { AuthStackParamList } from "../../Navigation/types";
import { IPA_BASE, STRIPE_PUBLISHABLE_KEY } from "@env";

const { width } = Dimensions.get('window');
const API_BASE_URL = IPA_BASE
const PLANS_ENDPOINT = "payment/plans/";
const SUBSCRIBE_ENDPOINT = "payment/subscribe/";
const SUBSCRIPTION_STATUS_ENDPOINT = "payment/subscription/status/";

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

type SubscriptionStatus = {
  plan_name: string;
  price: number;
  renews_at: string;
  status: string;
  is_active: boolean;
  has_used_trial: boolean;
  days_remaining: number | null;
  clicks_left: number;
  features: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isMonthly = (plan_type: string) =>
  plan_type.includes("MONTHLY") || plan_type === "FREE";

const isYearly = (plan_type: string) => plan_type.includes("YEARLY");

const isFree = (plan_type: string) => plan_type === "FREE";

const planBadgeLabel = (plan_type: string) => {
  if (plan_type === "FREE") return "FREE";
  if (plan_type.includes("MONTHLY")) return "Monthly";
  if (plan_type.includes("YEARLY")) return "Yearly";
  return "";
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDaysRemaining = (dateString: string) => {
  if (!dateString) return null;
  const renewDate = new Date(dateString);
  const now = new Date();
  const diff = renewDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

// ─── Feature Row ──────────────────────────────────────────────────────────────
const Feature = ({ text, icon, blue }: { text: string; icon?: string; blue?: boolean }) => (
  <View style={styles.featureRow}>
    <View style={[styles.featureIcon, blue && styles.featureIconBlue]}>
      <Ionicons
        name={icon || "checkmark-done"}
        size={16}
        color={blue ? "#1D4ED8" : "#111827"}
      />
    </View>
    <Text style={[styles.featureText, blue && styles.featureTextBlue]}>{text}</Text>
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

// ─── Current Plan Card ──────────────────────────────────────────────────────
const CurrentPlanCard = ({ subscription }: { subscription: SubscriptionStatus | null }) => {
  if (!subscription) return null;

  const daysRemaining = getDaysRemaining(subscription.renews_at);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  return (
    <LinearGradient
      colors={['#EFF6FF', '#DBEAFE']}
      style={styles.currentPlanCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.currentPlanHeader}>
        <View style={styles.currentPlanBadge}>
          <Ionicons name="crown" size={16} color="#FFD700" />
          <Text style={styles.currentPlanBadgeText}>CURRENT PLAN</Text>
        </View>
        <View style={[
          styles.statusPill,
          subscription.is_active ? styles.statusActive : styles.statusInactive
        ]}>
          <View style={[
            styles.statusDot,
            subscription.is_active ? styles.statusDotActive : styles.statusDotInactive
          ]} />
          <Text style={[
            styles.statusText,
            subscription.is_active ? styles.statusTextActive : styles.statusTextInactive
          ]}>
            {subscription.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <Text style={styles.currentPlanName}>{subscription.plan_name}</Text>

      <View style={styles.currentPlanPriceRow}>
        <Text style={styles.currentPlanPrice}>${subscription.price.toFixed(2)}</Text>
        <Text style={styles.currentPlanPeriod}>/ month</Text>
      </View>

      <View style={styles.currentPlanStats}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="calendar-outline" size={16} color="#1D4ED8" />
          </View>
          <View>
            <Text style={styles.statLabel}>Renews on</Text>
            <Text style={styles.statValue}>{formatDate(subscription.renews_at)}</Text>
          </View>
        </View>

        {daysRemaining !== null && daysRemaining > 0 && (
          <View style={styles.statItem}>
            <View style={[styles.statIcon, isExpiringSoon && styles.statIconWarning]}>
              <Ionicons
                name="time-outline"
                size={16}
                color={isExpiringSoon ? "#DC2626" : "#1D4ED8"}
              />
            </View>
            <View>
              <Text style={styles.statLabel}>Days Remaining</Text>
              <Text style={[styles.statValue, isExpiringSoon && styles.statValueWarning]}>
                {daysRemaining} days
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Ionicons name="flash-outline" size={16} color="#1D4ED8" />
          </View>
          <View>
            <Text style={styles.statLabel}>Clicks Remaining</Text>
            <Text style={styles.statValue}>{subscription.clicks_left} / day</Text>
          </View>
        </View>
      </View>

      {subscription.features && subscription.features.length > 0 && (
        <View style={styles.currentPlanFeatures}>
          <Text style={styles.featuresTitle}>✨ What's Included</Text>
          {subscription.features.slice(0, 4).map((feature, index) => (
            <Feature key={index} text={feature} icon="checkmark-circle" blue />
          ))}
          {subscription.features.length > 4 && (
            <Text style={styles.moreFeatures}>+{subscription.features.length - 4} more features</Text>
          )}
        </View>
      )}

      {subscription.has_used_trial && (
        <View style={styles.trialUsedBadge}>
          <Ionicons name="information-circle" size={16} color="#6B7280" />
          <Text style={styles.trialUsedText}>Trial already used</Text>
        </View>
      )}
    </LinearGradient>
  );
};

// ─── Plan Card ────────────────────────────────────────────────────────────────
const PlanCard = ({
  plan,
  onSubscribe,
  subscribingId,
  isCurrentPlan,
  hasUsedTrial
}: {
  plan: Plan;
  onSubscribe: (plan: Plan) => void;
  subscribingId: number | null;
  isCurrentPlan: boolean;
  hasUsedTrial?: boolean;
}) => {
  const free = isFree(plan.plan_type);
  const yearly = isYearly(plan.plan_type);
  const badge = planBadgeLabel(plan.plan_type);
  const isLoading = subscribingId === plan.id;

  // Parse price
  const priceNum = parseFloat(plan.price);
  const monthlyEquivalent = yearly ? (priceNum / 12) : priceNum;
  const savings = yearly ? Math.round((1 - (priceNum / (monthlyEquivalent * 12))) * 100) : 0;

  // Check if trial is available
  const hasTrial = plan.trial_days > 0;
  const trialUsed = hasUsedTrial || false;
  const showTrial = hasTrial && !trialUsed && !isCurrentPlan;


  if (free) {
    return (
      <View style={[styles.card, isCurrentPlan && styles.currentCard]}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.planTitle}>{plan.name}</Text>
            {/* <Text style={styles.planSubtitle}>Free forever</Text> */}
          </View>
          {isCurrentPlan && (
            <View style={styles.activePill}>
              <Text style={styles.activeText}>✓ Active</Text>
            </View>
          )}
        </View>
        <Text style={styles.priceBig}>
          ${priceNum.toFixed(2)}
          <Text style={styles.pricePerMonth}>/ month</Text>
        </Text>
        {isCurrentPlan ? (
          <View style={styles.currentPlanBtn}>
            <Text style={styles.currentPlanText}>✓ Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onSubscribe(plan)}
            disabled={subscribingId !== null}
            activeOpacity={0.88}
            style={[
              styles.subscribeBtn,
              isMonthlyPlan ? styles.subscribeBtnMonthly : styles.subscribeBtnYearly,
              subscribingId !== null && { opacity: 0.6 }
            ]}
          >
            <LinearGradient
              colors={isMonthlyPlan ? ['#1D4ED8', '#2563EB'] : ['#D97706', '#F59E0B']}
              style={styles.subscribeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.subscribeBtnText}>
                    {showTrial
                      ? `Start ${plan.trial_days}-Day Trial`
                      : trialUsed
                        ? "Subscribe Now"
                        : hasTrial
                          ? `Start ${plan.trial_days}-Day Trial`
                          : "Subscribe Now"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
        <View style={styles.featuresList}>
          {plan.features.map((f, i) => (
            <Feature key={i} text={f} icon="checkmark" />
          ))}
        </View>
      </View>
    );
  }

  // Pro/Paid plans
  const isMonthlyPlan = isMonthly(plan.plan_type);

  return (
    <View style={[
      styles.proCard,
      isMonthlyPlan ? styles.monthlyProCard : styles.yearlyProCard,
      isCurrentPlan && styles.currentPlanBorder
    ]}>
      {/* Ribbon */}
      {!isCurrentPlan ? (
        <View style={[styles.ribbon, isMonthlyPlan ? styles.monthlyRibbon : styles.yearlyRibbon]}>
          <Text style={styles.ribbonText}>
            {isMonthlyPlan ? "🔥 POPULAR" : "⭐ BEST VALUE"}
          </Text>
        </View>
      ) : (
        <View style={[styles.ribbon, styles.currentRibbon]}>
          <Text style={styles.ribbonText}>✓ CURRENT</Text>
        </View>
      )}

      {/* Plan header */}
      <View style={styles.proHeader}>
        <View>
          <Text style={styles.proName}>{plan.name}</Text>
          <Text style={styles.proSubtitle}>
            {isMonthlyPlan ? 'Billed monthly' : 'Billed yearly'}
          </Text>
        </View>
        <View style={[styles.badgePill, isMonthlyPlan ? styles.monthlyBadgePill : styles.yearlyBadgePill]}>
          <Text style={[styles.badgeText, isMonthlyPlan ? styles.monthlyBadgeText : styles.yearlyBadgeText]}>
            {badge}
          </Text>
        </View>
      </View>

      {/* Price */}
      <View style={styles.proPriceContainer}>
        <Text style={styles.proPrice}>${priceNum.toFixed(2)}</Text>
        <Text style={styles.pricePer}>/ {isMonthlyPlan ? 'month' : 'year'}</Text>
      </View>

      {yearly && savings > 0 && (
        <View style={styles.savingsBadge}>
          <Ionicons name="pricetag" size={14} color="#15803D" />
          <Text style={styles.savingsText}>Save {savings}% vs monthly</Text>
        </View>
      )}

      {/* Subscribe button */}
      {isCurrentPlan ? (
        <View style={styles.currentPlanBtn}>
          <Text style={styles.currentPlanText}>✓ Current Plan</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => onSubscribe(plan)}
          disabled={subscribingId !== null}
          activeOpacity={0.88}
          style={[
            styles.subscribeBtn,
            isMonthlyPlan ? styles.subscribeBtnMonthly : styles.subscribeBtnYearly,
            subscribingId !== null && { opacity: 0.6 }
          ]}
        >
          <LinearGradient
            colors={isMonthlyPlan ? ['#1D4ED8', '#2563EB'] : ['#D97706', '#F59E0B']}
            style={styles.subscribeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.subscribeBtnText}>
                  {plan.trial_days > 0 ? `Start ${plan.trial_days}-Day Trial` : "Subscribe Now"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Features */}
      <View style={styles.proFeatures}>
        <Text style={styles.proFeaturesTitle}>✨ Features</Text>
        {plan.features.map((f, i) => (
          <Feature key={i} text={f} icon="checkmark-circle" blue={isMonthlyPlan} />
        ))}
      </View>

      {/* Clicks info */}
      <View style={styles.clicksRow}>
        <Ionicons name="flash" size={14} color="#6B7280" />
        <Text style={styles.clicksText}>{plan.clicks_per_day} retailer clicks per day</Text>
      </View>
    </View>
  );
};

// ─── Success Modal ────────────────────────────────────────────────────────────
const SuccessModal = ({
  visible,
  planName,
  onClose,
}: {
  visible: boolean;
  planName: string;
  onClose: () => void;
}) => {
  const isAndroid = Platform.OS === "android";

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.successOverlay}>
        <BlurView
          intensity={isAndroid ? 2 : 20}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successCard}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.successGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark-circle" size={40} color="#1D4ED8" />
              </View>
            </View>
            <Text style={styles.successTitle}>🎉 Subscription Active!</Text>
            <Text style={styles.successSub}>
              You're now subscribed to
            </Text>
            <Text style={styles.successPlanName}>{planName}</Text>
            <Text style={styles.successDesc}>
              Start exploring all premium features now!
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={onClose}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#1D4ED8', '#2563EB']}
                style={styles.successButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.successButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
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
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const [subscribingId, setSubscribingId] = useState<number | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successPlanName, setSuccessPlanName] = useState("");

  // ── Fetch Current Subscription Status ──────────────────────────────────────
  const fetchSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      const token = await AsyncStorage.getItem("vToken");
      if (!token) {
        setSubscription(null);
        return;
      }
      const res = await axios.get(`${API_BASE_URL}${SUBSCRIPTION_STATUS_ENDPOINT}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      console.log("📊 Subscription Status:", res.data);
      if (res.data?.success && res.data?.data) {
        setSubscription(res.data.data);
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      console.error("❌ Subscription status error:", err?.response?.data || err);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // ── Fetch plans ────────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchPlans();
    fetchSubscriptionStatus();
  }, []);

  // ── Filter plans by tab ────────────────────────────────────────────────────
  const filteredPlans = plans.filter((p) => {
    if (isFree(p.plan_type)) return true;
    if (tab === "monthly") return isMonthly(p.plan_type);
    return isYearly(p.plan_type);
  });

  // ── Check if plan is current ──────────────────────────────────────────────
  const isCurrentPlan = (plan: Plan) => {
    if (!subscription) return false;
    return subscription.plan_name.toLowerCase().includes(plan.name.toLowerCase()) ||
      plan.name.toLowerCase().includes(subscription.plan_name.toLowerCase());
  };

  // ── Subscribe flow ─────────────────────────────────────────────────────────
  const handleSubscribe = async (plan: Plan) => {
    try {
      setSubscribingId(plan.id);

      const token = await AsyncStorage.getItem("vToken");
      if (!token) {
        Alert.alert("Error", "Please login to continue.");
        return;
      }

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

      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === "Canceled") {
          // user closed
        } else {
          Alert.alert("Payment Failed", payError.message || "Payment could not be completed.");
        }
      } else {
        await fetchSubscriptionStatus();
        setSuccessPlanName(data.plan_name);
        setSuccessVisible(true);
      }
    } catch (err: any) {
      console.error("❌ Subscribe error:", err?.response?.data || err);

      // ✅ Check if error is about trial or active plan
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || "";

      if (errorMessage.includes("already used your free trial") ||
        errorMessage.includes("have an active plan")) {

        // ✅ Show user-friendly alert
        Alert.alert(
          "Trial Already Used",
          "You have already used your free trial or have an active subscription plan.\n\n" +
          "You can manage your subscription or upgrade to a different plan.",
          [
            {
              text: "Manage Subscription",
              onPress: () => {
                // Refresh subscription status
                fetchSubscriptionStatus();
              }
            },
            {
              text: "OK",
              style: "cancel"
            }
          ]
        );

      } else {
        // Show generic error
        Alert.alert(
          "Subscription Error",
          errorMessage || "Subscription failed. Please try again."
        );
      }
    } finally {
      setSubscribingId(null);
    }
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" as never }],
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <AppHeader
            left={() => <BackButton />}
            middle={() => (
              <Text style={styles.headerTitle}>Subscription Plans</Text>
            )}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Current Plan Section */}
          {!subscriptionLoading && subscription && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Current Plan</Text>
                <TouchableOpacity onPress={fetchSubscriptionStatus}>
                  <Ionicons name="refresh-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <CurrentPlanCard subscription={subscription} />
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Choose Your Plan</Text>
              <Text style={styles.sectionSubtitle}>Upgrade to unlock more features</Text>
            </>
          )}

          {/* Tab toggle */}
          <View style={styles.segmentWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setTab("monthly")}
              style={[styles.segmentBtn, tab === "monthly" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, tab === "monthly" && styles.segmentTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setTab("yearly")}
              style={[styles.segmentBtn, tab === "yearly" && styles.segmentBtnActive]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.segmentText, tab === "yearly" && styles.segmentTextActive]}>
                  Yearly
                </Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>Save 20%</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Loading or Plans */}
          {plansLoading || subscriptionLoading ? (
            <>
              <PlanSkeleton />
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
                isCurrentPlan={isCurrentPlan(plan)}
              />
            ))
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#9CA3AF" />
            <Text style={styles.footerText}>
              Secured by Stripe · Cancel anytime
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Success Modal */}
      <SuccessModal
        visible={successVisible}
        planName={successPlanName}
        onClose={handleSuccessClose}
      />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: -4,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },

  // Segment
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  discountPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 6,
  },
  discountText: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 10,
  },

  // Current Plan Card
  currentPlanCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  currentPlanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  currentPlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  currentPlanBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: "#15803D",
  },
  statusDotInactive: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#15803D",
  },
  statusTextInactive: {
    color: "#DC2626",
  },
  currentPlanName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  currentPlanPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  currentPlanPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  currentPlanPeriod: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  currentPlanStats: {
    marginTop: 14,
    gap: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  statIconWarning: {
    backgroundColor: "#FEE2E2",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  statValueWarning: {
    color: "#DC2626",
  },
  currentPlanFeatures: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  moreFeatures: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  trialUsedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  trialUsedText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Free plan card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  currentCard: {
    borderWidth: 2,
    borderColor: "#1D4ED8",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  planSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  activePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeText: {
    color: "#15803D",
    fontWeight: "600",
    fontSize: 12,
  },
  priceBig: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 8,
  },
  pricePerMonth: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  currentPlanBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  featuresList: {
    marginTop: 14,
  },

  // Pro / paid plan card
  proCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    position: "relative",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  monthlyProCard: {
    backgroundColor: "#F8FAFF",
    borderColor: "#1D4ED8",
  },
  yearlyProCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#D97706",
  },
  currentPlanBorder: {
    borderWidth: 3,
    borderColor: "#10B981",
  },
  ribbon: {
    position: "absolute",
    right: 0,
    top: 0,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomLeftRadius: 14,
  },
  monthlyRibbon: {
    backgroundColor: "#1D4ED8",
  },
  yearlyRibbon: {
    backgroundColor: "#D97706",
  },
  currentRibbon: {
    backgroundColor: "#10B981",
  },
  ribbonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },

  proHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4,
  },
  proName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  proSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  monthlyBadgePill: {
    backgroundColor: "#DBEAFE",
  },
  yearlyBadgePill: {
    backgroundColor: "#FEF3C7",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  monthlyBadgeText: {
    color: "#1D4ED8",
  },
  yearlyBadgeText: {
    color: "#92400E",
  },

  proPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  proPrice: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1F2937",
  },
  pricePer: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },

  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },

  subscribeBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 12,
  },
  subscribeBtnFree: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  subscribeBtnMonthly: {
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  subscribeBtnYearly: {
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  subscribeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  subscribeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  subscribeBtnTextFree: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "600",
  },

  proFeatures: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  proFeaturesTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  featureIconBlue: {
    backgroundColor: "#DBEAFE",
  },
  featureText: {
    fontSize: 13,
    color: "#4B5563",
    flex: 1,
  },
  featureTextBlue: {
    color: "#1F2937",
  },

  clicksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clicksText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  skeletonLine: {
    width: "70%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },

  // Success Modal
  successOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    overflow: "hidden",
  },
  successGradient: {
    padding: 32,
    alignItems: "center",
  },
  successIconOuter: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    padding: 12,
    marginBottom: 4,
  },
  successIconInner: {
    backgroundColor: "#DBEAFE",
    padding: 16,
    borderRadius: 999,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  successSub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  successPlanName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D4ED8",
    textAlign: "center",
    marginTop: 4,
  },
  successDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  successButton: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  successButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});