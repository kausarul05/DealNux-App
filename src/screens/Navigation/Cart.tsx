// Cart.tsx - With Shipping Address + Stripe Payment Sheet
import { CART_PRODUCT, CART_REMOVE, CART_UPDATE, IPA_BASE, STRIPE_PUBLISHABLE_KEY } from '@env'
import {
  MaterialIcons,
  Ionicons,
  Feather,
  FontAwesome5
} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native'
import axios from 'axios'
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
  TouchableOpacity,
  Animated,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { StripeProvider, useStripe } from '@stripe/stripe-react-native'

import { AuthStackParamList } from '../../Navigation/types'
import CartProductCard from '../../components/CartProductCard'
import { Images } from '../../constants'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const API_BASE_URL = IPA_BASE
const CHECKOUT_ENDPOINT = 'payment/checkout/'
const API_ENDPOINTS = { CART_UPDATE, CART_REMOVE }

// ─── Types ────────────────────────────────────────────────────────────────────
type CartListing = {
  id: number
  platform_name: string
  platform_code: string
  price: string
  currency: string
  original_price: string | null
  discount_percentage: string | null
  condition: string
  free_shipping: boolean
  shipping_cost: string
  total_price: number
  external_url: string
  is_available: boolean
}

type CartItem = {
  id: number
  product: number
  product_title: string
  product_image: string
  quantity: number
  listing: CartListing
}

type CartSummary = {
  total_platforms: number
  total_items: number
  total_price: number
  currency: string
}

type CartApiData = {
  summary: CartSummary
  platforms: Record<string, CartItem[]>
}

type CartUiItem = CartItem & {
  selectedQty: number
  _orderIndex?: number
}

type CartPlatformsState = Record<string, CartUiItem[]>

type CouponState = {
  expanded: boolean
  code: string
  applied: boolean
  applying: boolean
  message: string
  discountAmount: number
}

type CouponMapState = Record<string, CouponState>

type ShippingAddress = {
  first_name: string
  last_name: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  country: string
}

type CheckoutBreakdown = {
  subtotal: number
  shipping: number
  service_fee: number
  tax: number
  grand_total: number
}

type CheckoutResponse = {
  client_secret: string
  payment_intent_client_secret: string
  payment_id: number
  breakdown: CheckoutBreakdown
}

const DEFAULT_COUPON_STATE: CouponState = {
  expanded: false, code: '', applied: false,
  applying: false, message: '', discountAmount: 0,
}

const DEFAULT_SHIPPING: ShippingAddress = {
  first_name: '', last_name: '', address_line1: '',
  address_line2: '', city: '', state: '', zip_code: '', country: 'US',
}

const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#F3F4F6"/>
  <rect x="110" y="120" width="280" height="220" rx="22" fill="#E5E7EB"/>
  <circle cx="190" cy="200" r="28" fill="#CBD5E1"/>
  <path d="M135 305 L220 235 L280 285 L320 250 L365 305 Z" fill="#CBD5E1"/>
  <text x="50%" y="395" text-anchor="middle" fill="#94A3B8" font-size="30" font-family="Arial, sans-serif">No Image</text>
</svg>
`)}`

// ─── Shipping Address Modal ───────────────────────────────────────────────────
const ShippingAddressModal = ({
  visible, onClose, onContinue, loading,
}: {
  visible: boolean
  onClose: () => void
  onContinue: (address: ShippingAddress) => void
  loading: boolean
}) => {
  const [form, setForm] = useState<ShippingAddress>(DEFAULT_SHIPPING)
  const [errors, setErrors] = useState<Partial<ShippingAddress>>({})

  const set = (key: keyof ShippingAddress, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = (): boolean => {
    const e: Partial<ShippingAddress> = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim()) e.last_name = 'Required'
    if (!form.address_line1.trim()) e.address_line1 = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.state.trim()) e.state = 'Required'
    if (!form.zip_code.trim()) e.zip_code = 'Required'
    if (!form.country.trim()) e.country = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinue = () => { if (validate()) onContinue(form) }

  const Field = ({
    label, fieldKey, placeholder, half = false, keyboardType = 'default', autoCapitalize = 'words',
  }: {
    label: string; fieldKey: keyof ShippingAddress; placeholder: string
    half?: boolean; keyboardType?: any; autoCapitalize?: any
  }) => (
    <View style={[styles.fieldWrapper, half && { width: '48%' }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={form[fieldKey]}
        onChangeText={v => set(fieldKey, v)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.fieldInput, !!errors[fieldKey] && styles.fieldInputError]}
      />
      {!!errors[fieldKey] && <Text style={styles.fieldError}>{errors[fieldKey]}</Text>}
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '92%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Shipping Address</Text>
                <Text style={styles.modalSubtitle}>Where should we deliver?</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.row}>
                <Field label="First Name *" fieldKey="first_name" placeholder="John" half />
                <Field label="Last Name *" fieldKey="last_name" placeholder="Doe" half />
              </View>
              <Field label="Address Line 1 *" fieldKey="address_line1" placeholder="123 Main St" />
              <Field label="Address Line 2" fieldKey="address_line2" placeholder="Apt 4B (optional)" />
              <View style={styles.row}>
                <Field label="City *" fieldKey="city" placeholder="Chicago" half />
                <Field label="State *" fieldKey="state" placeholder="IL" half />
              </View>
              <View style={styles.row}>
                <Field label="ZIP Code *" fieldKey="zip_code" placeholder="60601" half keyboardType="numeric" autoCapitalize="none" />
                <Field label="Country *" fieldKey="country" placeholder="US" half autoCapitalize="characters" />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={handleContinue} disabled={loading} activeOpacity={0.85} style={styles.payButton}>
                <LinearGradient
                  colors={loading ? ['#94A3B8', '#64748B'] : ['#2355B6', '#1A4D8F']}
                  style={styles.payButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.payButtonContent}>
                      <Ionicons name="location-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.payButtonText}>Continue to Order Summary</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Payment Summary Modal ────────────────────────────────────────────────────
const PaymentSummaryModal = ({
  visible, onClose, onConfirmPayment, breakdown, currency,
  platformEntries, paymentLoading, shippingAddress,
}: {
  visible: boolean; onClose: () => void; onConfirmPayment: () => void
  breakdown: CheckoutBreakdown | null; currency: string
  platformEntries: [string, CartUiItem[]][]; paymentLoading: boolean
  shippingAddress: ShippingAddress | null
}) => {
  const fmt = (amount: number, cur = 'USD') => {
    const c = cur?.toUpperCase?.() || 'USD'
    return `${c === 'USD' ? '$' : `${c} `}${amount.toFixed(2)}`
  }

  const totalItems = platformEntries.reduce(
    (sum, [, items]) => sum + items.reduce((acc, i) => acc + i.selectedQty, 0), 0
  )

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '92%' }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Order Summary</Text>
              <Text style={styles.modalSubtitle}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} • {platformEntries.length}{' '}
                {platformEntries.length === 1 ? 'store' : 'stores'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            {/* Shipping address display */}
            {shippingAddress && (
              <View style={styles.addressCard}>
                <View style={styles.addressCardHeader}>
                  <Ionicons name="location" size={16} color="#2355B6" />
                  <Text style={styles.addressCardTitle}>Delivering To</Text>
                </View>
                <Text style={styles.addressName}>
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </Text>
                <Text style={styles.addressLine}>
                  {shippingAddress.address_line1}{shippingAddress.address_line2 ? `, ${shippingAddress.address_line2}` : ''}
                </Text>
                <Text style={styles.addressLine}>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip_code}
                </Text>
                <Text style={styles.addressLine}>{shippingAddress.country}</Text>
              </View>
            )}

            {/* Products */}
            {platformEntries.map(([platformName, items]) => (
              <View key={platformName} style={styles.platformSection}>
                <Text style={styles.platformLabel}>{platformName}</Text>
                {items.map(item => (
                  <View key={`${item.id}_${item.listing.id}`} style={styles.productRow}>
                    <Image
                      source={{ uri: item.product_image || PLACEHOLDER_IMAGE }}
                      style={styles.productThumb}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.productName} numberOfLines={2}>{item.product_title}</Text>
                      <Text style={styles.productQty}>Qty: {item.selectedQty}</Text>
                    </View>
                    <Text style={styles.productPrice}>
                      {fmt(
                        (Number(item.listing.total_price) || Number(item.listing.price) || 0) * item.selectedQty,
                        currency
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Breakdown */}
            {breakdown && (
              <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownValue}>{fmt(breakdown.subtotal, currency)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Shipping</Text>
                  <Text style={[styles.breakdownValue, breakdown.shipping === 0 && { color: '#16A34A' }]}>
                    {breakdown.shipping === 0 ? 'FREE' : fmt(breakdown.shipping, currency)}
                  </Text>
                </View>
                {breakdown.service_fee > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service Fee</Text>
                    <Text style={styles.breakdownValue}>{fmt(breakdown.service_fee, currency)}</Text>
                  </View>
                )}
                {breakdown.tax > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tax</Text>
                    <Text style={styles.breakdownValue}>{fmt(breakdown.tax, currency)}</Text>
                  </View>
                )}
                <View style={styles.divider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{fmt(breakdown.grand_total, currency)}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onConfirmPayment} disabled={paymentLoading} activeOpacity={0.85} style={styles.payButton}>
              <LinearGradient
                colors={paymentLoading ? ['#94A3B8', '#64748B'] : ['#2355B6', '#1A4D8F']}
                style={styles.payButtonGradient}
              >
                {paymentLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.payButtonContent}>
                    <Ionicons name="card-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.payButtonText}>
                      Pay {breakdown ? `$${breakdown.grand_total.toFixed(2)}` : 'Now'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.secureText}>🔒 Secured by Stripe</Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Sticky Bottom Bar ────────────────────────────────────────────────────────
const StickyBottomBar = ({
  onCheckout, disabled, bottomInset = 0,
}: {
  totalItems: number; totalPrice: number; currency: string
  onCheckout: () => void; disabled: boolean; bottomInset?: number
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start()
  }, [])
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] })

  return (
    <Animated.View style={{ transform: [{ translateY }], position: 'absolute', bottom: bottomInset, left: 0, right: 0, zIndex: 50 }}>
      <LinearGradient colors={['rgba(255,255,255,0)', '#FFFFFF', '#FFFFFF']} style={{ paddingTop: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
          <TouchableOpacity onPress={onCheckout} disabled={disabled} activeOpacity={0.8}>
            <LinearGradient colors={disabled ? ['#94A3B8', '#64748B'] : ['#2355B6', '#1A4D8F']} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <FontAwesome5 name="rocket" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  )
}

// ─── Skeleton & Empty ─────────────────────────────────────────────────────────
const SkeletonBlock = ({ height, width = '100%', rounded = 16 }: any) => (
  <View style={{ height, width, borderRadius: rounded, backgroundColor: '#E9EDF3' }} />
)

const CartSectionSkeleton = () => (
  <View style={{ borderRadius: 24, marginTop: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }}>
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' }}>
      <SkeletonBlock height={30} width={180} />
    </View>
    <View style={{ padding: 16 }}>
      {[1, 2].map(i => (
        <View key={i} style={{ borderWidth: 1, borderRadius: 24, padding: 16, marginTop: i > 1 ? 16 : 0, borderColor: '#EEF1F5', flexDirection: 'row' }}>
          <SkeletonBlock height={92} width={92} rounded={16} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <SkeletonBlock height={18} width="80%" rounded={6} />
            <View style={{ marginTop: 12 }}><SkeletonBlock height={14} width="45%" rounded={6} /></View>
          </View>
        </View>
      ))}
    </View>
  </View>
)

const EmptyCart = ({ onRefresh }: { onRefresh: () => void }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
    <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
      <Feather name="shopping-bag" size={56} color="#94A3B8" />
    </View>
    <Text style={{ fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>Your Cart is Empty</Text>
    <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 15, marginBottom: 32 }}>
      Looks like you haven't added any items to your cart yet.
    </Text>
    <TouchableOpacity onPress={onRefresh} style={{ backgroundColor: '#2355B6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 50, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name="refresh" size={20} color="#FFF" />
      <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Browse Products</Text>
    </TouchableOpacity>
  </View>
)

// ─── Main Inner Component ─────────────────────────────────────────────────────
const CartInner = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [cartData, setCartData] = useState<CartApiData | null>(null)
  const [platformItems, setPlatformItems] = useState<CartPlatformsState>({})
  const [qtyLoadingMap, setQtyLoadingMap] = useState<Record<string, boolean>>({})
  const [deleteLoadingMap, setDeleteLoadingMap] = useState<Record<string, boolean>>({})
  const [couponMap, setCouponMap] = useState<CouponMapState>({})
  const [scrollEnabled, setScrollEnabled] = useState(true)

  // Checkout flow
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [shippingModalVisible, setShippingModalVisible] = useState(false)
  const [summaryModalVisible, setSummaryModalVisible] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getPlatformLogo = (platformName?: string) => {
    const name = platformName?.toLowerCase()?.trim() ?? ''
    if (name.includes('amazon')) return Images.Amazon
    if (name.includes('walmart')) return Images.Wallmart
    if (name.includes('aliexpress')) return Images.Aliexpress
    if (name.includes('bestbuy') || name.includes('best buy')) return Images.BestBuy
    return null
  }

  const toNumber = (value: unknown, fallback = 0) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  const formatMoney = (amount: number, currency = 'USD') => {
    const c = currency?.toUpperCase?.() || 'USD'
    return `${c === 'USD' ? '$' : `${c} `}${amount.toFixed(2)}`
  }

  const getItemKey = (platformName: string, itemId: number, listingId: number) =>
    `${platformName}_${itemId}_${listingId}`

  const getPlatformKey = (platformName: string) => platformName.trim().toLowerCase()

  const getCouponState = (platformName: string): CouponState =>
    couponMap[getPlatformKey(platformName)] ?? DEFAULT_COUPON_STATE

  const updateCouponState = (platformName: string, updater: (prev: CouponState) => CouponState) => {
    const platformKey = getPlatformKey(platformName)
    setCouponMap(prev => ({ ...prev, [platformKey]: updater(prev[platformKey] ?? DEFAULT_COUPON_STATE) }))
  }

  const normalizeImageUrl = (imagePath?: string | null) => {
    if (!imagePath || !String(imagePath).trim()) return PLACEHOLDER_IMAGE
    const cleaned = String(imagePath).trim()
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:image')) return cleaned
    const base = String(API_BASE_URL || '').trim()
    if (!base) return PLACEHOLDER_IMAGE
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
    return `${normalizedBase}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`
  }

  const buildUiState = (data: CartApiData): CartPlatformsState => {
    const nextState: CartPlatformsState = {}
    Object.entries(data?.platforms ?? {}).forEach(([platformName, items]) => {
      nextState[platformName] = (items ?? []).map((item, index) => ({
        ...item,
        selectedQty: Math.max(1, toNumber(item.quantity, 1)),
        _orderIndex: index,
      }))
    })
    return nextState
  }

  // ── Fetch Cart ─────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const token = await AsyncStorage.getItem('vToken')
      if (!token) { setCartData(null); setPlatformItems({}); return }
      const res = await axios.get(`${API_BASE_URL}${CART_PRODUCT}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const apiData: CartApiData | null = res?.data?.data ?? null
      setCartData(apiData)
      setPlatformItems(apiData ? buildUiState(apiData) : {})
      if (apiData?.platforms) {
        setCouponMap(prev => {
          const next = { ...prev }
          Object.keys(apiData.platforms).forEach(name => {
            const key = getPlatformKey(name)
            if (!next[key]) next[key] = DEFAULT_COUPON_STATE
          })
          return next
        })
      }
    } catch (error) {
      console.error('cart fetch error', error)
      setCartData(null); setPlatformItems({})
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { fetchCart(true) }, [fetchCart]))

  const onRefresh = async () => {
    try { setRefreshing(true); await fetchCart(false) } catch { setRefreshing(false) }
  }

  // ── Computed (needs to be before buildCheckoutItems) ──────────────────────
  const platformEntries = useMemo(() =>
    Object.entries(platformItems ?? {}).sort(([, a], [, b]) => (a[0]?._orderIndex ?? 0) - (b[0]?._orderIndex ?? 0)),
    [platformItems]
  )

  // ── ✅ Build checkout body ─────────────────────────────────────────────────
  const buildCheckoutItems = () => {
    const items: { seller_product: number; quantity: number; coupon_code: string }[] = []
    platformEntries.forEach(([platformName, cartItems]) => {
      const couponCode = getCouponState(platformName).applied ? getCouponState(platformName).code : ''
      cartItems.forEach(item => {
        items.push({
          seller_product: item.product,
          quantity: item.selectedQty,
          coupon_code: couponCode,
        })
      })
    })
    return items
  }

  // ── ✅ Step 1: Open shipping modal ─────────────────────────────────────────
  const handleCheckout = () => setShippingModalVisible(true)

  // ── ✅ Step 2: Shipping done → hit checkout API ────────────────────────────
  const handleShippingSubmit = async (address: ShippingAddress) => {
    try {
      setCheckoutLoading(true)
      setShippingAddress(address)

      const token = await AsyncStorage.getItem('vToken')
      if (!token) { Alert.alert('Error', 'Please login to continue.'); return }

      const body = {
        items: buildCheckoutItems(),
        shipping_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_line1: address.address_line1,
          address_line2: address.address_line2,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
          country: address.country,
        },
      }

      console.log('📦 Checkout body:', JSON.stringify(body, null, 2))

      const res = await axios.post(`${API_BASE_URL}${CHECKOUT_ENDPOINT}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

      console.log('✅ Checkout response:', res.data)
      const data: CheckoutResponse = res.data

      if (!data.payment_intent_client_secret) {
        Alert.alert('Error', 'Could not initialize payment. Please try again.')
        return
      }

      setCheckoutData(data)
      setShippingModalVisible(false)
      await new Promise(resolve => setTimeout(resolve, 300))
      setSummaryModalVisible(true)

    } catch (error: any) {
      console.error('❌ Checkout error:', error?.response?.data || error)
      Alert.alert('Error', error?.response?.data?.message || 'Checkout failed. Please try again.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // ── ✅ Step 3: Stripe Payment Sheet ───────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!checkoutData?.payment_intent_client_secret) return
    try {
      setPaymentLoading(true)

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: checkoutData.payment_intent_client_secret,
        merchantDisplayName: 'DealNux',
        appearance: { colors: { primary: '#2355B6' } },
        returnURL: 'savvyshopper://payment-complete', 
      })

      if (initError) {
        Alert.alert('Payment Error', initError.message || 'Failed to initialize payment.')
        return
      }

      setSummaryModalVisible(false)
      await new Promise(resolve => setTimeout(resolve, 300))

      const { error: payError } = await presentPaymentSheet()

      if (payError) {
        if (payError.code === 'Canceled') {
          setSummaryModalVisible(true)
        } else {
          Alert.alert('Payment Failed', payError.message || 'Payment could not be completed.')
        }
      } else {
        // ✅ Clear payment state
        setCheckoutData(null)
        setShippingAddress(null)

        // ✅ Refresh cart so cleared items show immediately
        await fetchCart(false)

        Alert.alert(
          '🎉 Payment Successful!',
          'Your order has been placed successfully.',
          [{ text: 'OK', onPress: () => navigation.navigate('HomeTab') }]
        )
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  // ── Quantity & Delete ──────────────────────────────────────────────────────
  const updateLocalQty = (platformName: string, itemId: number, listingId: number, nextQty: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setPlatformItems(prev => {
      const updated = (prev[platformName] ?? []).map(item =>
        item.id === itemId && item.listing.id === listingId
          ? { ...item, selectedQty: Math.max(1, nextQty) }
          : item
      )
      return { ...prev, [platformName]: updated.sort((a, b) => (a._orderIndex ?? 0) - (b._orderIndex ?? 0)) }
    })
  }

  const cleanEmptyPlatforms = (prev: CartPlatformsState) => {
    const cleaned: CartPlatformsState = {}
    Object.entries(prev).forEach(([name, items]) => {
      if (items.length > 0) cleaned[name] = items.sort((a, b) => (a._orderIndex ?? 0) - (b._orderIndex ?? 0))
    })
    return cleaned
  }

  const handleDecreaseQuantity = async (platformName: string, item: CartUiItem) => {
    if (item.selectedQty <= 1) return
    const prev = item.selectedQty; const next = prev - 1
    updateLocalQty(platformName, item.id, item.listing.id, next)
    const key = getItemKey(platformName, item.id, item.listing.id)
    try {
      setQtyLoadingMap(p => ({ ...p, [key]: true }))
      const token = await AsyncStorage.getItem('vToken')
      if (!token) return
      const fd = new FormData(); fd.append('product', String(item.product)); fd.append('quantity', String(next))
      await axios.put(`${API_BASE_URL}${API_ENDPOINTS.CART_UPDATE}${item.id}/`, fd, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
      })
      await fetchCart(false)
    } catch { updateLocalQty(platformName, item.id, item.listing.id, prev) }
    finally { setQtyLoadingMap(p => ({ ...p, [key]: false })) }
  }

  const handleIncreaseQuantity = async (platformName: string, item: CartUiItem) => {
    const prev = item.selectedQty; const next = prev + 1
    updateLocalQty(platformName, item.id, item.listing.id, next)
    const key = getItemKey(platformName, item.id, item.listing.id)
    try {
      setQtyLoadingMap(p => ({ ...p, [key]: true }))
      const token = await AsyncStorage.getItem('vToken')
      if (!token) return
      const fd = new FormData(); fd.append('product', String(item.product)); fd.append('quantity', String(next))
      await axios.put(`${API_BASE_URL}${API_ENDPOINTS.CART_UPDATE}${item.id}/`, fd, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
      })
      await fetchCart(false)
    } catch { updateLocalQty(platformName, item.id, item.listing.id, prev) }
    finally { setQtyLoadingMap(p => ({ ...p, [key]: false })) }
  }

  const handleDeleteItem = async (platformName: string, item: CartUiItem) => {
    const key = getItemKey(platformName, item.id, item.listing.id)
    Alert.alert('Remove Item', 'Remove this item from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          setPlatformItems(prev => cleanEmptyPlatforms({
            ...prev,
            [platformName]: (prev[platformName] ?? []).filter(
              c => !(c.id === item.id && c.listing.id === item.listing.id)
            ),
          }))
          try {
            setDeleteLoadingMap(p => ({ ...p, [key]: true }))
            const token = await AsyncStorage.getItem('vToken')
            if (!token) return
            await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.CART_REMOVE}${item.id}/`, {
              headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            })
            await fetchCart(false)
          } catch { await fetchCart(false) }
          finally { setDeleteLoadingMap(p => ({ ...p, [key]: false })) }
        },
      },
    ])
  }

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const handleToggleCoupon = (name: string) =>
    updateCouponState(name, prev => ({ ...prev, expanded: !prev.expanded, message: prev.expanded ? '' : prev.message }))

  const handleCouponInput = (name: string, value: string) =>
    updateCouponState(name, prev => ({ ...prev, code: value, applied: false, message: '', discountAmount: 0 }))

  const handleApplyCoupon = async (name: string) => {
    const state = getCouponState(name)
    if (!state.code.trim()) {
      updateCouponState(name, prev => ({ ...prev, message: 'Please enter a coupon code.' }))
      return
    }
    updateCouponState(name, prev => ({ ...prev, applying: true, message: '' }))
    // TODO: connect coupon API
    updateCouponState(name, prev => ({
      ...prev, applying: false, applied: true,
      message: `✅ Coupon "${state.code}" applied!`, discountAmount: 0,
    }))
  }

  // ── More Computed ──────────────────────────────────────────────────────────
  const totalSelectedItems = useMemo(() =>
    platformEntries.reduce((sum, [, items]) => sum + items.reduce((acc, i) => acc + i.selectedQty, 0), 0),
    [platformEntries]
  )

  const currency = (cartData?.summary?.currency || 'USD').toUpperCase()

  const getPlatformSubtotal = (items: CartUiItem[]) =>
    items.reduce((sum, item) => sum + toNumber(item?.listing?.total_price ?? item?.listing?.price, 0) * item.selectedQty, 0)

  const grandTotal = useMemo(() =>
    platformEntries.reduce((sum, [, items]) => sum + getPlatformSubtotal(items), 0),
    [platformEntries]
  )

  const totalCouponDiscount = useMemo(() =>
    platformEntries.reduce((sum, [name]) => sum + toNumber(getCouponState(name).discountAmount, 0), 0),
    [platformEntries, couponMap]
  )

  const finalTotal = Math.max(0, toNumber(cartData?.summary?.total_price, grandTotal) - totalCouponDiscount)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2 }}
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#1F2937' }}>My Cart</Text>
              <Text style={{ color: '#64748B', fontSize: 13 }}>
                {totalSelectedItems} {totalSelectedItems === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="refresh" size={22} color="#2355B6" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 200, paddingTop: 4 }}
          scrollEnabled={scrollEnabled}
          nestedScrollEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2355B6']} tintColor="#2355B6" />}
        >
          {loading ? (
            <><CartSectionSkeleton /><CartSectionSkeleton /></>
          ) : platformEntries.length === 0 ? (
            <EmptyCart onRefresh={onRefresh} />
          ) : (
            <>
              {platformEntries.map(([platformName, items], sectionIndex) => {
                const platformLogo = getPlatformLogo(platformName)
                const platformSubtotal = getPlatformSubtotal(items)
                const couponState = getCouponState(platformName)
                const platformFinalSubtotal = Math.max(0, platformSubtotal - toNumber(couponState.discountAmount, 0))

                return (
                  <View key={platformName} style={{ borderRadius: 24, backgroundColor: '#FFFFFF', marginTop: sectionIndex > 0 ? 20 : 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    {/* Platform Header */}
                    <LinearGradient
                      colors={['#F8FAFC', '#FFFFFF']}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        {platformLogo
                          ? <Image source={platformLogo} style={{ width: 24, height: 24 }} resizeMode="contain" />
                          : <MaterialIcons name="storefront" size={22} color="#2355B6" />}
                      </View>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: '#1F2937', flex: 1 }}>{platformName}</Text>
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50 }}>
                        <Text style={{ color: '#2355B6', fontSize: 12, fontWeight: '600' }}>{items.length} items</Text>
                      </View>
                    </LinearGradient>

                    {/* Coupon */}
                    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                      <View style={{ borderRadius: 16, padding: 12, backgroundColor: '#FAFBFD', borderWidth: 1, borderColor: '#E7ECF3' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>🎫 Apply Coupon</Text>
                            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>Get extra discounts</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleToggleCoupon(platformName)}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: '#2355B6' }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                              {couponState.expanded ? 'Hide' : 'Apply'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {couponState.expanded && (
                          <View style={{ marginTop: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ flex: 1, borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D7DEEA' }}>
                                <FontAwesome5 name="tag" size={16} color="#94A3B8" />
                                <TextInput
                                  value={couponState.code}
                                  onChangeText={v => handleCouponInput(platformName, v)}
                                  placeholder="Enter coupon code"
                                  placeholderTextColor="#94A3B8"
                                  autoCapitalize="characters"
                                  style={{ flex: 1, marginLeft: 8, color: '#1F2937' }}
                                />
                              </View>
                              <TouchableOpacity
                                onPress={() => handleApplyCoupon(platformName)}
                                disabled={couponState.applying}
                                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1F2937', opacity: couponState.applying ? 0.7 : 1 }}
                              >
                                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
                                  {couponState.applying ? '...' : 'Apply'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {!!couponState.message && (
                              <Text style={{ marginTop: 8, fontSize: 13, color: couponState.applied ? '#16A34A' : '#DC2626' }}>
                                {couponState.message}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Items */}
                    <View style={{ padding: 12 }}>
                      {items.map((item, index) => {
                        const itemKey = getItemKey(platformName, item.id, item.listing.id)
                        return (
                          <View key={`${platformName}_${item.product}_${item.id}`}>
                            <CartProductCard
                              image={normalizeImageUrl(item.product_image) as any}
                              name={item.product_title}
                              price={toNumber(item.listing.total_price ?? item.listing.price, 0)}
                              originalPrice={toNumber(item.listing.original_price, 0)}
                              discount={item.listing.discount_percentage ? `-${Math.round(Number(item.listing.discount_percentage))}%` : ''}
                              quantity={item.selectedQty}
                              condition={item.listing.condition}
                              isAvailable={item.listing.is_available}
                              qtyLoading={!!qtyLoadingMap[itemKey]}
                              deleteLoading={!!deleteLoadingMap[itemKey]}
                              onIncrease={() => handleIncreaseQuantity(platformName, item)}
                              onDecrease={() => handleDecreaseQuantity(platformName, item)}
                              onDelete={() => handleDeleteItem(platformName, item)}
                              onSwipeStart={() => setScrollEnabled(false)}
                              onSwipeEnd={() => setScrollEnabled(true)}
                            />
                            {index < items.length - 1 && (
                              <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8, marginHorizontal: 8 }} />
                            )}
                          </View>
                        )
                      })}
                    </View>

                    {/* Platform Subtotal */}
                    <LinearGradient
                      colors={['#F8FAFC', '#F1F5F9']}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}
                    >
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>Subtotal</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {toNumber(couponState.discountAmount, 0) > 0 && (
                          <Text style={{ color: '#94A3B8', fontSize: 13, textDecorationLine: 'line-through' }}>
                            {formatMoney(platformSubtotal, currency)}
                          </Text>
                        )}
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#2355B6' }}>
                          {formatMoney(platformFinalSubtotal, currency)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                )
              })}
              <View style={{ height: 16 }} />
            </>
          )}
        </ScrollView>

        {/* Sticky Bottom Bar */}
        {!loading && platformEntries.length > 0 && (
          <StickyBottomBar
            totalItems={totalSelectedItems}
            totalPrice={finalTotal}
            currency={currency}
            onCheckout={handleCheckout}
            disabled={checkoutLoading || platformEntries.length === 0}
            bottomInset={75}
          />
        )}

        {/* Loading overlay */}
        {checkoutLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2355B6" />
              <Text style={styles.loadingText}>Preparing your order...</Text>
            </View>
          </View>
        )}
      </View>

      {/* ✅ Step 1 — Shipping Address Modal */}
      <ShippingAddressModal
        visible={shippingModalVisible}
        onClose={() => setShippingModalVisible(false)}
        onContinue={handleShippingSubmit}
        loading={checkoutLoading}
      />

      {/* ✅ Step 2 — Order Summary + Pay Modal */}
      <PaymentSummaryModal
        visible={summaryModalVisible}
        onClose={() => setSummaryModalVisible(false)}
        onConfirmPayment={handleConfirmPayment}
        breakdown={checkoutData?.breakdown ?? null}
        currency={currency}
        platformEntries={platformEntries}
        paymentLoading={paymentLoading}
        shippingAddress={shippingAddress}
      />
    </SafeAreaView>
  )
}

// ─── Root Export ──────────────────────────────────────────────────────────────
const Cart = () => (
  <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
    <CartInner />
  </StripeProvider>
)

export default Cart

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  loadingBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, elevation: 10 },
  loadingText: { fontSize: 15, color: '#374151', fontWeight: '600', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldWrapper: { marginTop: 14, width: '100%' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#FFFFFF' },
  fieldInputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: 4 },
  addressCard: { marginHorizontal: 20, marginTop: 16, padding: 14, backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  addressCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  addressCardTitle: { fontSize: 13, fontWeight: '700', color: '#2355B6' },
  addressName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  addressLine: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  platformSection: { paddingHorizontal: 20, paddingTop: 16 },
  platformLabel: { fontSize: 12, fontWeight: '700', color: '#2355B6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F3F4F6' },
  productName: { fontSize: 13, color: '#1F2937', fontWeight: '500', lineHeight: 18 },
  productQty: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 8 },
  breakdownContainer: { marginHorizontal: 20, marginTop: 8, marginBottom: 8, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 14, color: '#6B7280' },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: '#2355B6' },
  modalFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', alignItems: 'center' },
  payButton: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  payButtonGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  payButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  secureText: { fontSize: 12, color: '#94A3B8', marginTop: 10 },
})