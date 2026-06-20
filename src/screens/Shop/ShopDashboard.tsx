import {
    CREATE_COUPON,
    IPA_BASE,
    SHOP_COUPONS,
    SHOP_DETAILS,
    SHOP_ORDERS,
    SHOP_PRODUCT,
} from '@env';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    NavigationProp,
    useFocusEffect,
    useNavigation,
} from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
    RefreshControl,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { Toast, useToast } from '../../components/useToost';
import { AuthStackParamList } from '../../Navigation/types';

const API_BASE_URL = IPA_BASE;

// ─── Tab Types ────────────────────────────────────────────────────────────────
type TabType = 
    | 'Overview' 
    | 'Products' 
    | 'Orders' 
    | 'Shipping' 
    | 'Payouts' 
    | 'Seller Document' 
    | 'Profile' 
    | 'Coupons';

const TABS: TabType[] = [
    'Overview',
    'Products',
    'Orders',
    'Shipping',
    'Payouts',
    'Seller Document',
    'Profile',
    'Coupons'
];

// ─── Types ────────────────────────────────────────────────────────────────────
type ShopDetails = {
    id: number;
    user_email: string;
    user_name: string;
    shop_name: string;
    shop_description: string;
    shop_logo: string | null;
    phone_number: string;
    bank_name: string;
    bank_account_number: string;
    total_products: number;
    total_orders: number;
    total_earnings: string;
    is_active: boolean;
    created_at: string;
};

type OverviewData = {
    shop_name: string;
    stats: {
        total_products: number;
        total_units_in_stock: number;
        active_orders: number;
        needs_action: number;
        this_month_earnings: number;
        total_earned: number;
        total_reviews: number;
        average_rating: number;
    };
};

type ProductItem = {
    id: number;
    seller: number;
    seller_shop: string;
    category: string;
    category_name: string;
    title: string;
    description: string;
    brand: string;
    model_number: string;
    price: string;
    original_price: string | null;
    currency: string;
    quantity: number;
    condition: string;
    main_image: string | null;
    images: string[];
    free_shipping: boolean;
    shipping_cost: string;
    estimated_delivery_days: number;
    returns_accepted: boolean;
    return_period_days: number;
    status: string;
    status_display: string;
    admin_note: string;
    discount_percentage: number | null;
    linked_product: number | null;
    linked_listing: number | null;
    created_at: string;
    updated_at: string;
};

type OrderItem = {
    id: number;
    buyer_email: string;
    seller_shop: string;
    seller_product: any | null;
    listing: number | null;
    quantity: number;
    unit_price: string;
    total_price: string;
    currency: string;
    shipping_address: string;
    status: string;
    status_display: string;
    tracking_number: string;
    note: string;
    created_at: string;
    updated_at: string;
};

type ShippingData = {
    local_pickup: {
        active: boolean;
        address_street: string | null;
        address_city: string | null;
        address_state: string | null;
        address_zip: string | null;
        hours_start: string | null;
        hours_end: string | null;
        available_days: string[];
    };
    local_delivery: {
        active: boolean;
        radius: number;
        fee: number;
        timeframe: string | null;
    };
    standard_shipping: {
        active: boolean;
        processing_time: string;
        preferred_couriers: string[];
    };
};

type PayoutsData = {
    available_balance: number;
    pending_balance: number;
    total_withdrawn: number;
    total_earned: number;
    payout_history: any[];
};

type SellerDocument = {
    id: number;
    user_email: string;
    status: string;
    status_display: string;
    trade_name: string;
    legal_business_type: string;
    business_reg_number: string;
    contact_full_name: string;
    job_title: string;
    contact_email: string;
    contact_phone: string;
    display_categories: string[];
    estimated_sku_count: string;
    min_price: string;
    max_price: string;
    product_conditions: string[];
    owns_inventory: boolean;
    fulfillment_methods: string[];
    shipping_regions: string[];
    return_policy_description: string;
    return_policy_document: string;
    agreed_to_compliance: boolean;
    agreed_to_prohibited_items: boolean;
    has_prior_experience: boolean;
    experience_description: string;
    government_id: string;
    business_license: string;
    utility_bill: string;
    digital_signature: string;
    admin_note: string | null;
    created_at: string;
    updated_at: string;
};

type ProfileData = {
    id: number;
    shop_name: string;
    shop_logo: string | null;
    shop_description: string;
    pending_balance: string;
    available_balance: string;
    total_earnings: string;
    total_withdrawn: string;
    local_pickup_active: boolean;
    pickup_address_street: string | null;
    pickup_address_city: string | null;
    pickup_address_state: string | null;
    pickup_address_zip: string | null;
    pickup_hours_start: string | null;
    pickup_hours_end: string | null;
    pickup_available_days: string[];
    local_delivery_active: boolean;
    delivery_radius: number;
    delivery_fee: string;
    delivery_timeframe: string | null;
    standard_shipping_active: boolean;
    order_processing_time: string;
    preferred_couriers: string[];
    stripe_account_id: string;
    stripe_onboarding_completed: boolean;
    total_products: number;
    total_orders: number;
    seller_score: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    user: number;
};

type CouponItem = {
    id: number;
    seller_shop: string;
    code: string;
    discount_type: 'PERCENTAGE' | 'FIXED' | string;
    discount_value: string;
    min_order_amount: string;
    max_uses: number;
    used_count: number;
    is_active: boolean;
    expires_at: string;
    is_valid: boolean;
    created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_BASE_URL}${path}`;
};

const ensureArray = <T,>(value: unknown): T[] => {
    return Array.isArray(value) ? (value as T[]) : [];
};

const getStatusStyle = (status: string) => {
    const statusMap: Record<string, { bg: string; fg: string }> = {
        APPROVED: { bg: '#EAF7EF', fg: '#2E9B63' },
        REJECTED: { bg: '#FDECEC', fg: '#E24A4A' },
        PENDING: { bg: '#FEF6E7', fg: '#C27A2C' },
        CONFIRMED: { bg: '#EAF7EF', fg: '#2E9B63' },
        CANCELLED: { bg: '#FDECEC', fg: '#E24A4A' },
        ACTIVE: { bg: '#EAF7EF', fg: '#2E9B63' },
        INACTIVE: { bg: '#FDECEC', fg: '#E24A4A' },
        COMPLETED: { bg: '#EAF7EF', fg: '#2E9B63' },
        SHIPPED: { bg: '#EAF7EF', fg: '#2E9B63' },
        DELIVERED: { bg: '#EAF7EF', fg: '#2E9B63' },
    };
    return statusMap[status] || { bg: '#EEF2FF', fg: '#4F46E5' };
};

// ─── Components ──────────────────────────────────────────────────────────────
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <Text className="text-[15px] font-semibold text-[#6B7280] mb-2">
        {children}
    </Text>
);

const BoxInput = ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
}: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'numeric';
}) => (
    <View className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4">
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            className="text-[16px] text-[#111827]"
        />
    </View>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const ShopDashboard = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<TabType>('Overview');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // State for each tab
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [shipping, setShipping] = useState<ShippingData | null>(null);
    const [payouts, setPayouts] = useState<PayoutsData | null>(null);
    const [sellerDocument, setSellerDocument] = useState<SellerDocument | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [couponCount, setCouponCount] = useState(0);

    // Coupon modal state
    const [couponModalVisible, setCouponModalVisible] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [couponActive, setCouponActive] = useState(true);
    const [expiresAt, setExpiresAt] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);

    // ─── Data Loading ──────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');

        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            setErrorMsg('Token missing');
            setLoading(false);
            return;
        }

        try {
            // Load all data in parallel
            const [
                overviewRes,
                productsRes,
                ordersRes,
                shippingRes,
                payoutsRes,
                sellerDocRes,
                profileRes,
                couponsRes,
            ] = await Promise.all([
                axios.get(`${API_BASE_URL}store/seller-profiles/dashboard/overview/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}${SHOP_PRODUCT}?page=1`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}${SHOP_ORDERS}?page=1`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}store/seller-profiles/dashboard/shipping/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}store/seller-profiles/dashboard/payouts/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}store/seller-requests/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}store/seller-profiles/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}${SHOP_COUPONS}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            // Set data
            setOverview(overviewRes?.data?.data ?? null);

            const productList =
                productsRes?.data?.data?.products ??
                productsRes?.data?.data ??
                [];
            setProducts(ensureArray<ProductItem>(productList));

            const orderList =
                ordersRes?.data?.data?.results ??
                ordersRes?.data?.data ??
                [];
            setOrders(ensureArray<OrderItem>(orderList));

            setShipping(shippingRes?.data?.data ?? null);
            setPayouts(payoutsRes?.data?.data ?? null);

            // Seller document (first item in array)
            const docs = ensureArray<SellerDocument>(sellerDocRes?.data);
            setSellerDocument(docs.length > 0 ? docs[0] : null);

            // Profile (first item in array)
            const profiles = ensureArray<ProfileData>(profileRes?.data);
            setProfile(profiles.length > 0 ? profiles[0] : null);

            const couponList = ensureArray<CouponItem>(couponsRes?.data);
            setCoupons(couponList);
            setCouponCount(couponList.length);
        } catch (err: any) {
            console.error('Error loading shop dashboard:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load shop data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // ─── Coupon Functions ─────────────────────────────────────────────────────
    const resetCouponForm = () => {
        setCouponCode('');
        setDiscountType('PERCENTAGE');
        setDiscountValue('');
        setMinOrderAmount('');
        setMaxUses('');
        setCouponActive(true);
        setExpiresAt('');
    };

    const handleCreateCoupon = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' });
            return;
        }

        if (!couponCode.trim()) {
            toast.show({ message: 'Please enter coupon code.', type: 'error', style: 'top' });
            return;
        }
        if (!discountValue.trim()) {
            toast.show({ message: 'Please enter discount value.', type: 'error', style: 'top' });
            return;
        }
        if (!minOrderAmount.trim()) {
            toast.show({ message: 'Please enter minimum order amount.', type: 'error', style: 'top' });
            return;
        }
        if (!maxUses.trim()) {
            toast.show({ message: 'Please enter max uses.', type: 'error', style: 'top' });
            return;
        }
        if (!expiresAt.trim()) {
            toast.show({ message: 'Please enter expiry date time.', type: 'error', style: 'top' });
            return;
        }

        try {
            setCouponLoading(true);

            const body = {
                code: couponCode.trim(),
                discount_type: discountType,
                discount_value: discountValue.trim(),
                min_order_amount: minOrderAmount.trim(),
                max_uses: maxUses.trim(),
                is_active: couponActive ? 'true' : 'false',
                expires_at: expiresAt.trim(),
            };

            await axios.post(`${API_BASE_URL}${CREATE_COUPON}`, body, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            toast.show({ message: 'Coupon created successfully', type: 'success', style: 'top' });

            setCouponModalVisible(false);
            resetCouponForm();
            loadData();
        } catch (error: any) {
            console.error('Create coupon error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Coupon create failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setCouponLoading(false);
        }
    };

    // ─── Render Functions ─────────────────────────────────────────────────────

    // ── Header ──
    const renderHeader = () => (
        <View>
            <View
                className="rounded-3xl mt-4 overflow-hidden"
                style={{
                    backgroundColor: '#203A8F',
                    shadowColor: '#000',
                    shadowOpacity: 0.14,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 4,
                }}
            >
                <LinearGradient
                    colors={['#1E2F73', '#2946A6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 20, paddingVertical: 24, position: 'relative' }}
                >
                    <View
                        style={{
                            position: 'absolute',
                            top: 60,
                            left: -40,
                            width: 220,
                            height: 80,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderRadius: 999,
                            transform: [{ rotate: '8deg' }],
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            top: 70,
                            right: -30,
                            width: 250,
                            height: 90,
                            backgroundColor: 'rgba(255,255,255,0.07)',
                            borderRadius: 999,
                            transform: [{ rotate: '-8deg' }],
                        }}
                    />
                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 110,
                            backgroundColor: 'rgba(255,255,255,0.10)',
                            borderTopLeftRadius: 120,
                            borderTopRightRadius: 120,
                        }}
                    />

                    <Text style={{ color: '#B9C7FF', fontSize: 12, fontWeight: '600', marginBottom: 14, letterSpacing: 1 }}>
                        SELLER DASHBOARD
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>
                                {overview?.shop_name || profile?.shop_name || 'My Shop'}
                            </Text>
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: 14,
                                    marginTop: 10,
                                    lineHeight: 20,
                                }}
                            >
                                {profile?.shop_description ||
                                    'Manage your products, track inventory, and grow your business with ease.'}
                            </Text>
                            <View style={{ flexDirection: 'row', marginTop: 18, gap: 10 }}>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.10)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.15)',
                                        borderRadius: 999,
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Feather name="box" size={16} color="white" />
                                    <Text style={{ color: 'white', marginLeft: 8, fontWeight: '700' }}>
                                        {overview?.stats?.total_products ?? profile?.total_products ?? 0} Products
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <Pressable style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <LinearGradient
                                colors={['#7C3AED', '#8B5CF6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    width: 68,
                                    height: 68,
                                    borderRadius: 18,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.18)',
                                }}
                            >
                                {profile?.shop_logo ? (
                                    <Image
                                        source={{ uri: profile.shop_logo }}
                                        style={{ width: 68, height: 68, borderRadius: 18 }}
                                    />
                                ) : (
                                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>
                                        {(overview?.shop_name || profile?.shop_name || 'M')?.charAt(0)?.toUpperCase()}
                                    </Text>
                                )}
                            </LinearGradient>
                            <MaterialIcons
                                name="edit-square"
                                size={22}
                                color="white"
                                style={{ position: 'absolute', right: 0, bottom: -2 }}
                            />
                        </Pressable>
                    </View>
                </LinearGradient>
            </View>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-5"
                contentContainerStyle={{ paddingRight: 20 }}
            >
                {TABS.map((tab) => {
                    const active = activeTab === tab;
                    const isActive = activeTab === tab;
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-full mr-3 ${isActive ? 'bg-[#1F56D8]' : 'bg-white border border-[#D6DAE2]'
                                }`}
                        >
                            <Text className={`text-[15px] font-semibold ${isActive ? 'text-white' : 'text-[#7B8190]'}`}>
                                {tab}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {!!errorMsg && (
                <Text className="mt-3 text-[13px] text-[#E24A4A]">{errorMsg}</Text>
            )}

            <View className="h-4" />
        </View>
    );

    // ── Stat Card ──
    const StatCard = ({ label, value, icon, color = '#2355B6' }: { label: string; value: string | number; icon?: string; color?: string }) => (
        <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
            {icon && (
                <View className="mb-2">
                    <Feather name={icon as any} size={20} color={color} />
                </View>
            )}
            <Text className="text-[#7A8192] text-[14px]">{label}</Text>
            <Text className="text-[#111827] text-[24px] font-extrabold mt-2">{value}</Text>
        </View>
    );

    // ── Overview Tab ──
    const renderOverview = () => {
        const stats = overview?.stats;

        return (
            <View className="flex-row flex-wrap justify-between">
                <StatCard label="Total Products" value={stats?.total_products ?? 0} icon="box" />
                <StatCard label="Units in Stock" value={stats?.total_units_in_stock ?? 0} icon="package" />
                <StatCard label="Active Orders" value={stats?.active_orders ?? 0} icon="shopping-bag" />
                <StatCard label="Needs Action" value={stats?.needs_action ?? 0} icon="alert-circle" color="#EF4444" />
                <StatCard label="This Month Earnings" value={`$${stats?.this_month_earnings?.toFixed(2) ?? '0.00'}`} icon="trending-up" color="#16A34A" />
                <StatCard label="Total Earned" value={`$${stats?.total_earned?.toFixed(2) ?? '0.00'}`} icon="dollar-sign" color="#16A34A" />
                <StatCard label="Total Reviews" value={stats?.total_reviews ?? 0} icon="star" color="#F59E0B" />
                <StatCard label="Average Rating" value={stats?.average_rating?.toFixed(1) ?? '0.0'} icon="thumbs-up" color="#F59E0B" />
            </View>
        );
    };

    // ── Products Tab ──
    const renderProduct = ({ item }: { item: ProductItem }) => {
        const badge = getStatusStyle(item.status);

        return (
            <View
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}
            >
                <View className="p-5">
                    <View className="flex-row">
                        <Image
                            source={{ uri: buildImageUrl(item.main_image) }}
                            className="w-[78px] h-[78px] rounded-2xl bg-[#EEF2F7]"
                            resizeMode="cover"
                        />
                        <View className="flex-1 ml-4">
                            <Text className="text-[18px] font-semibold text-[#111827]" numberOfLines={2}>
                                {item.title}
                            </Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                {item.brand} • {item.category_name}
                            </Text>
                            <Text className="text-[15px] text-[#111827] font-bold mt-2">
                                ${item.price} <Text className="text-[#8A92A3] font-medium">/ {item.currency?.toUpperCase()}</Text>
                            </Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Qty: {item.quantity} • Condition: {item.condition}
                            </Text>
                        </View>
                    </View>
                </View>
                <View className="h-[1px] bg-[#E6E9EF]" />
                <View className="px-5 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: badge.bg }}>
                        <Text className="text-[13px] font-medium" style={{ color: badge.fg }}>
                            {item.status_display}
                        </Text>
                    </View>
                    <Pressable onPress={() => (navigation as any).navigate("EditProduct", { productId: item.id })} className='bg-blue-200 py-2 px-4 rounded-full'>
                        <Text className="text-[13px] font-medium text-[#1F56D8]">Edit & Update</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    const renderProducts = () => (
        <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProduct}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
            ListEmptyComponent={
                !loading ? (
                    <Text className="text-center text-[#7A8192] mt-10">No products found.</Text>
                ) : null
            }
        />
    );

    // ── Orders Tab ──
    const renderOrder = ({ item }: { item: OrderItem }) => {
        const badge = getStatusStyle(item.status);

        return (
            <View
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}
            >
                <View className="p-5">
                    <View className="flex-row">
                        <Image
                            source={{ uri: buildImageUrl(item.seller_product?.main_image) }}
                            className="w-[78px] h-[78px] rounded-2xl bg-[#EEF2F7]"
                            resizeMode="cover"
                        />
                        <View className="flex-1 ml-4 justify-center">
                            <Text className="text-[18px] font-semibold text-[#111827]" numberOfLines={2}>
                                {item.seller_product?.title || 'Product'}
                            </Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">Buyer: {item?.buyer_email}</Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">Qty: {item?.quantity}</Text>
                            <Text className="text-[16px] text-[#111827] font-bold mt-2">
                                ${item.total_price} <Text className="text-[#8A92A3] font-medium">/ {item.currency?.toUpperCase()}</Text>
                            </Text>
                        </View>
                    </View>
                </View>
                <View className="h-[1px] bg-[#E6E9EF]" />
                <View className="px-5 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: badge.bg }}>
                        <Text className="text-[13px] font-medium" style={{ color: badge.fg }}>
                            {item.status_display}
                        </Text>
                    </View>
                    <Text className="text-[#7A8192] text-[13px]">Order #{item.id}</Text>
                </View>
            </View>
        );
    };

    const renderOrders = () => (
        <FlatList
            data={orders}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderOrder}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
            ListEmptyComponent={
                !loading ? (
                    <Text className="text-center text-[#7A8192] mt-10">No orders found.</Text>
                ) : null
            }
        />
    );

    // ── Shipping Tab ──
    const renderShipping = () => {
        if (!shipping) return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#1F56D8" />
                <Text className="text-[#7A8192] mt-4">Loading shipping details...</Text>
            </View>
        );

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Local Pickup */}
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[18px] font-bold text-[#111827]">Local Pickup</Text>
                        <View className={`px-3 py-1 rounded-full ${shipping.local_pickup.active ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Text className={`text-[12px] font-semibold ${shipping.local_pickup.active ? 'text-green-700' : 'text-red-700'}`}>
                                {shipping.local_pickup.active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    {shipping.local_pickup.active && (
                        <View>
                            <Text className="text-[14px] text-[#7A8192]">Address: {shipping.local_pickup.address_street || 'N/A'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">City: {shipping.local_pickup.address_city || 'N/A'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">State: {shipping.local_pickup.address_state || 'N/A'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">Zip: {shipping.local_pickup.address_zip || 'N/A'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">Hours: {shipping.local_pickup.hours_start || 'N/A'} - {shipping.local_pickup.hours_end || 'N/A'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">Days: {shipping.local_pickup.available_days?.join(', ') || 'N/A'}</Text>
                        </View>
                    )}
                </View>

                {/* Local Delivery */}
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[18px] font-bold text-[#111827]">Local Delivery</Text>
                        <View className={`px-3 py-1 rounded-full ${shipping.local_delivery.active ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Text className={`text-[12px] font-semibold ${shipping.local_delivery.active ? 'text-green-700' : 'text-red-700'}`}>
                                {shipping.local_delivery.active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    {shipping.local_delivery.active && (
                        <View>
                            <Text className="text-[14px] text-[#7A8192]">Radius: {shipping.local_delivery.radius} miles</Text>
                            <Text className="text-[14px] text-[#7A8192]">Fee: ${shipping.local_delivery.fee?.toFixed(2) || '0.00'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">Timeframe: {shipping.local_delivery.timeframe || 'N/A'}</Text>
                        </View>
                    )}
                </View>

                {/* Standard Shipping */}
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[18px] font-bold text-[#111827]">Standard Shipping</Text>
                        <View className={`px-3 py-1 rounded-full ${shipping.standard_shipping.active ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Text className={`text-[12px] font-semibold ${shipping.standard_shipping.active ? 'text-green-700' : 'text-red-700'}`}>
                                {shipping.standard_shipping.active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    {shipping.standard_shipping.active && (
                        <View>
                            <Text className="text-[14px] text-[#7A8192]">Processing Time: {shipping.standard_shipping.processing_time || 'N/A'}</Text>
                            <Text className="text-[14px] text-[#7A8192]">Preferred Couriers: {shipping.standard_shipping.preferred_couriers?.join(', ') || 'N/A'}</Text>
                        </View>
                    )}
                </View>

                <Pressable
                    className="bg-[#1F56D8] rounded-2xl py-4 items-center justify-center"
                    onPress={() => navigation.navigate('EditShipping' as any)}
                >
                    <Text className="text-white text-[16px] font-bold">Edit Shipping Settings</Text>
                </Pressable>
            </ScrollView>
        );
    };

    // ── Payouts Tab ──
    const renderPayouts = () => {
        if (!payouts) return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#1F56D8" />
                <Text className="text-[#7A8192] mt-4">Loading payouts...</Text>
            </View>
        );

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="flex-row flex-wrap justify-between">
                    <StatCard label="Available Balance" value={`$${payouts.available_balance?.toFixed(2) ?? '0.00'}`} icon="wallet" color="#16A34A" />
                    <StatCard label="Pending Balance" value={`$${payouts.pending_balance?.toFixed(2) ?? '0.00'}`} icon="clock" color="#F59E0B" />
                    <StatCard label="Total Withdrawn" value={`$${payouts.total_withdrawn?.toFixed(2) ?? '0.00'}`} icon="arrow-up" color="#EF4444" />
                    <StatCard label="Total Earned" value={`$${payouts.total_earned?.toFixed(2) ?? '0.00'}`} icon="dollar-sign" color="#16A34A" />
                </View>

                {payouts.payout_history && payouts.payout_history.length > 0 ? (
                    <View className="bg-white rounded-3xl p-5 mt-2" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <Text className="text-[18px] font-bold text-[#111827] mb-4">Payout History</Text>
                        {payouts.payout_history.map((item: any, index: number) => (
                            <View key={index} className="flex-row justify-between py-3 border-b border-[#E5E7EB] last:border-0">
                                <Text className="text-[14px] text-[#7A8192]">{item.date || 'N/A'}</Text>
                                <Text className="text-[14px] font-semibold text-[#111827]">${item.amount?.toFixed(2) || '0.00'}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="bg-white rounded-3xl p-5 mt-2 items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <Text className="text-[#7A8192] text-[14px]">No payout history yet.</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // ── Seller Document Tab ──
    const renderSellerDocument = () => {
        if (!sellerDocument) return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#1F56D8" />
                <Text className="text-[#7A8192] mt-4">Loading seller documents...</Text>
            </View>
        );

        const status = getStatusStyle(sellerDocument.status);

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[18px] font-bold text-[#111827]">Application Status</Text>
                        <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: status.bg }}>
                            <Text className="text-[13px] font-medium" style={{ color: status.fg }}>
                                {sellerDocument.status_display}
                            </Text>
                        </View>
                    </View>

                    <View className="border-t border-[#E5E7EB] pt-4">
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Trade Name</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{sellerDocument.trade_name}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Legal Type</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{sellerDocument.legal_business_type}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Reg Number</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{sellerDocument.business_reg_number}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Categories</Text>
                            <Text className="text-[14px] font-medium text-[#111827] text-right flex-1 ml-4">{sellerDocument.display_categories?.join(', ') || 'N/A'}</Text>
                        </View>
                        <View className="flex-row justify-between py-2">
                            <Text className="text-[14px] text-[#7A8192]">SKU Count</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{sellerDocument.estimated_sku_count}</Text>
                        </View>
                    </View>
                </View>

                {/* Documents Links */}
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <Text className="text-[18px] font-bold text-[#111827] mb-4">Documents</Text>
                    {sellerDocument.government_id && (
                        <Pressable onPress={() => Linking.openURL(sellerDocument.government_id)} className="flex-row items-center justify-between py-3 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Government ID</Text>
                            <Feather name="external-link" size={18} color="#1F56D8" />
                        </Pressable>
                    )}
                    {sellerDocument.business_license && (
                        <Pressable onPress={() => Linking.openURL(sellerDocument.business_license)} className="flex-row items-center justify-between py-3 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Business License</Text>
                            <Feather name="external-link" size={18} color="#1F56D8" />
                        </Pressable>
                    )}
                    {sellerDocument.utility_bill && (
                        <Pressable onPress={() => Linking.openURL(sellerDocument.utility_bill)} className="flex-row items-center justify-between py-3 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Utility Bill</Text>
                            <Feather name="external-link" size={18} color="#1F56D8" />
                        </Pressable>
                    )}
                    {sellerDocument.return_policy_document && (
                        <Pressable onPress={() => Linking.openURL(sellerDocument.return_policy_document)} className="flex-row items-center justify-between py-3">
                            <Text className="text-[14px] text-[#7A8192]">Return Policy Document</Text>
                            <Feather name="external-link" size={18} color="#1F56D8" />
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        );
    };

    // ── Profile Tab ──
    const renderProfile = () => {
        if (!profile) return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#1F56D8" />
                <Text className="text-[#7A8192] mt-4">Loading profile...</Text>
            </View>
        );

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <View className="items-center mb-4">
                        <View className="w-24 h-24 rounded-full bg-[#EFF6FF] items-center justify-center mb-3">
                            {profile.shop_logo ? (
                                <Image source={{ uri: profile.shop_logo }} className="w-24 h-24 rounded-full" />
                            ) : (
                                <Text className="text-4xl font-bold text-[#1F56D8]">
                                    {profile.shop_name?.charAt(0)?.toUpperCase() || 'S'}
                                </Text>
                            )}
                        </View>
                        <Text className="text-[22px] font-bold text-[#111827]">{profile.shop_name}</Text>
                        <Text className="text-[14px] text-[#7A8192] text-center mt-1">{profile.shop_description || 'No description'}</Text>
                        <View className={`px-3 py-1 rounded-full mt-2 ${profile.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Text className={`text-[12px] font-semibold ${profile.is_active ? 'text-green-700' : 'text-red-700'}`}>
                                {profile.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>

                    <View className="border-t border-[#E5E7EB] pt-4">
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Total Products</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{profile.total_products}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Total Orders</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{profile.total_orders}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Seller Score</Text>
                            <Text className="text-[14px] font-medium text-[#111827]">{profile.seller_score}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-[#E5E7EB]">
                            <Text className="text-[14px] text-[#7A8192]">Available Balance</Text>
                            <Text className="text-[14px] font-medium text-[#16A34A]">${profile.available_balance}</Text>
                        </View>
                        <View className="flex-row justify-between py-2">
                            <Text className="text-[14px] text-[#7A8192]">Total Earnings</Text>
                            <Text className="text-[14px] font-medium text-[#16A34A]">${profile.total_earnings}</Text>
                        </View>
                    </View>
                </View>

                <Pressable
                    className="bg-[#1F56D8] rounded-2xl py-4 items-center justify-center"
                    onPress={() => navigation.navigate('EditShopProfile' as any)}
                >
                    <Text className="text-white text-[16px] font-bold">Edit Profile</Text>
                </Pressable>
            </ScrollView>
        );
    };

    // ── Coupons Tab ──
    const renderCoupon = ({ item }: { item: CouponItem }) => {
        const isValid = item.is_valid && item.is_active;
        const badge = isValid ? { bg: '#EAF7EF', fg: '#2E9B63', text: 'Active' } : { bg: '#FDECEC', fg: '#E24A4A', text: 'Inactive' };

        return (
            <View
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}
            >
                <View className="p-5">
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                            <Text className="text-[19px] font-bold text-[#111827]">{item.code}</Text>
                            <Text className="text-[14px] text-[#7A8192] mt-2">Type: {item.discount_type}</Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">Discount: {item.discount_value}</Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">Min Order: ${item.min_order_amount}</Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">Uses: {item.used_count}/{item.max_uses}</Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">Expires: {item.expires_at}</Text>
                        </View>
                        <View className="px-4 py-2 rounded-full" style={{ backgroundColor: badge.bg }}>
                            <Text className="text-[13px] font-medium" style={{ color: badge.fg }}>
                                {badge.text}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderCoupons = () => (
        <FlatList
            data={coupons}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCoupon}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={
                <View>
                    <View className="bg-white rounded-3xl p-5 mb-4">
                        <Text className="text-[#7A8192] text-[14px]">Total Coupons</Text>
                        <Text className="text-[#111827] text-[26px] font-extrabold mt-2">{couponCount}</Text>
                    </View>
                    <Pressable
                        className="bg-[#1F56D8] rounded-2xl py-4 items-center justify-center mb-4"
                        onPress={() => setCouponModalVisible(true)}
                    >
                        <Text className="text-white text-[16px] font-bold">Create Coupon</Text>
                    </Pressable>
                </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
            ListEmptyComponent={
                !loading ? (
                    <Text className="text-center text-[#7A8192] mt-10">No coupons found.</Text>
                ) : null
            }
        />
    );

    // ─── FAB Button ────────────────────────────────────────────────────────────
    const renderFAB = () => {
        const isCouponTab = activeTab === 'Coupons';
        const isProductsTab = activeTab === 'Products';

        if (!isCouponTab && !isProductsTab) return null;

        return (
            <Pressable
                className="absolute bottom-8 right-6 w-[62px] h-[62px] rounded-full items-center justify-center bg-[#2F6CF6]"
                style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 10,
                }}
                onPress={() => {
                    if (isCouponTab) {
                        setCouponModalVisible(true);
                    } else if (isProductsTab) {
                        navigation.navigate('AddProduct');
                    }
                }}
            >
                <Ionicons
                    name={isCouponTab ? 'pricetag-outline' : 'add'}
                    size={28}
                    color="#fff"
                />
            </Pressable>
        );
    };

    // ─── Render Main ──────────────────────────────────────────────────────────
    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View className="flex-1 items-center justify-center py-20">
                    <ActivityIndicator size="large" color="#1F56D8" />
                    <Text className="text-[#7A8192] mt-4">Loading...</Text>
                </View>
            );
        }

        switch (activeTab) {
            case 'Overview':
                return (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
                    >
                        {renderHeader()}
                        {renderOverview()}
                    </ScrollView>
                );
            case 'Products':
                return (
                    <View className="flex-1">
                        {renderHeader()}
                        {renderProducts()}
                    </View>
                );
            case 'Orders':
                return (
                    <View className="flex-1">
                        {renderHeader()}
                        {renderOrders()}
                    </View>
                );
            case 'Shipping':
                return (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
                    >
                        {renderHeader()}
                        {renderShipping()}
                    </ScrollView>
                );
            case 'Payouts':
                return (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
                    >
                        {renderHeader()}
                        {renderPayouts()}
                    </ScrollView>
                );
            case 'Seller Document':
                return (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
                    >
                        {renderHeader()}
                        {renderSellerDocument()}
                    </ScrollView>
                );
            case 'Profile':
                return (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
                    >
                        {renderHeader()}
                        {renderProfile()}
                    </ScrollView>
                );
            case 'Coupons':
                return (
                    <View className="flex-1">
                        {renderHeader()}
                        {renderCoupons()}
                    </View>
                );
            default:
                return null;
        }
    };

    // ─── Main Render ──────────────────────────────────────────────────────────
    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <StatusBar style="auto" />
            <View className="px-5 flex-1">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold">My Shop</Text>
                </View>

                {renderContent()}
                {renderFAB()}

                {/* Coupon Modal */}
                <Modal
                    visible={couponModalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setCouponModalVisible(false)}
                >
                    <View className="flex-1 bg-black/40 justify-end">
                        <View className="bg-[#F9F9FB] rounded-t-3xl px-5 pt-5 pb-8 max-h-[90%]">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-[20px] font-bold text-[#111827]">Create Coupon</Text>
                                <Pressable onPress={() => setCouponModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#111827" />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <FieldLabel>Coupon Code *</FieldLabel>
                                <BoxInput value={couponCode} onChangeText={setCouponCode} placeholder="SAVE20" />

                                <FieldLabel>Discount Type *</FieldLabel>
                                <View className="flex-row mb-4">
                                    <Pressable
                                        onPress={() => setDiscountType('PERCENTAGE')}
                                        className={`px-4 py-3 rounded-full mr-3 ${discountType === 'PERCENTAGE' ? 'bg-[#1F56D8]' : 'bg-white border border-[#D6DAE2]'}`}
                                    >
                                        <Text className={discountType === 'PERCENTAGE' ? 'text-white font-semibold' : 'text-[#7B8190] font-semibold'}>
                                            PERCENTAGE
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => setDiscountType('FIXED')}
                                        className={`px-4 py-3 rounded-full ${discountType === 'FIXED' ? 'bg-[#1F56D8]' : 'bg-white border border-[#D6DAE2]'}`}
                                    >
                                        <Text className={discountType === 'FIXED' ? 'text-white font-semibold' : 'text-[#7B8190] font-semibold'}>
                                            FIXED
                                        </Text>
                                    </Pressable>
                                </View>

                                <FieldLabel>Discount Value *</FieldLabel>
                                <BoxInput
                                    value={discountValue}
                                    onChangeText={(t) => setDiscountValue(t.replace(/[^0-9.]/g, ''))}
                                    placeholder="20"
                                    keyboardType="numeric"
                                />

                                <FieldLabel>Minimum Order Amount *</FieldLabel>
                                <BoxInput
                                    value={minOrderAmount}
                                    onChangeText={(t) => setMinOrderAmount(t.replace(/[^0-9.]/g, ''))}
                                    placeholder="1000"
                                    keyboardType="numeric"
                                />

                                <FieldLabel>Max Uses *</FieldLabel>
                                <BoxInput
                                    value={maxUses}
                                    onChangeText={(t) => setMaxUses(t.replace(/[^0-9]/g, ''))}
                                    placeholder="100"
                                    keyboardType="numeric"
                                />

                                <FieldLabel>Expires At *</FieldLabel>
                                <BoxInput
                                    value={expiresAt}
                                    onChangeText={setExpiresAt}
                                    placeholder="2026-12-31 23:59:59"
                                />

                                <View className="bg-white rounded-2xl px-4 py-4 mb-5 flex-row items-center justify-between">
                                    <Text className="text-[16px] font-semibold text-[#111827]">Active Coupon</Text>
                                    <Switch value={couponActive} onValueChange={setCouponActive} />
                                </View>

                                <Pressable
                                    className={`rounded-2xl py-4 items-center justify-center ${couponLoading ? 'bg-[#7EA2F2]' : 'bg-[#1F56D8]'}`}
                                    onPress={handleCreateCoupon}
                                    disabled={couponLoading}
                                >
                                    <Text className="text-white text-[16px] font-bold">
                                        {couponLoading ? 'Creating...' : 'Create Coupon'}
                                    </Text>
                                </Pressable>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                <Toast
                    style={toast.style}
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    fadeAnim={toast.fadeAnim}
                    buttons={toast.buttons}
                    onHide={toast.hide}
                />
            </View>
        </SafeAreaView>
    );
};

export default ShopDashboard;