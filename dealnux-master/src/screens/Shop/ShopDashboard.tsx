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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { Toast, useToast } from '../../components/useToost';
import { AuthStackParamList } from '../../Navigation/types';

const API_BASE_URL = IPA_BASE;

const TABS = ['PRODUCTS', 'ORDERS', 'HISTORY', 'COUPON'] as const;
type TabType = (typeof TABS)[number];

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

type OrderProduct = {
    id: number;
    buyer_email: string;
    seller_shop: string;
    seller_logo: string | null;
    category: number;
    category_name: string;
    title: string;
    description: string;
    brand: string;
    model_number: string;
    price: string;
    original_price: string;
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
    discount_percentage: number | null;
    listing_details?: {
        id: number;
        product: number;
        product_title: string;
        product_slug: string;
        platform: number;
        platform_name: string;
        platform_code: string;
        external_id: string;
        external_url: string;
        price: string;
        currency: string;
        original_price: string;
        discount_percentage: number | null;
        condition: string;
        seller_username: string;
        seller_rating: number | null;
        item_location: string;
        shipping_cost: string;
        free_shipping: boolean;
        estimated_delivery_days: number;
        returns_accepted: boolean;
        is_available: boolean;
        last_checked: string;
        total_price: number;
        created_at: string;
    };
    created_at: string;
};

type OrderItem = {
    id: number;
    buyer_email: string;
    seller_shop: string;
    seller_product: OrderProduct | null;
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

const buildImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_BASE_URL}${path}`;
};

const ensureArray = <T,>(value: unknown): T[] => {
    return Array.isArray(value) ? (value as T[]) : [];
};

const getProductStatusStyle = (status: string) => {
    if (status === 'APPROVED') {
        return { bg: '#EAF7EF', fg: '#2E9B63' };
    }
    if (status === 'REJECTED') {
        return { bg: '#FDECEC', fg: '#E24A4A' };
    }
    if (status === 'PENDING') {
        return { bg: '#FEF6E7', fg: '#C27A2C' };
    }
    return { bg: '#EEF2FF', fg: '#4F46E5' };
};

const getOrderStatusStyle = (status: string) => {
    if (status === 'CONFIRMED') {
        return { bg: '#EAF7EF', fg: '#2E9B63' };
    }
    if (status === 'PENDING') {
        return { bg: '#FEF6E7', fg: '#C27A2C' };
    }
    if (status === 'CANCELLED') {
        return { bg: '#FDECEC', fg: '#E24A4A' };
    }
    return { bg: '#EEF2FF', fg: '#4F46E5' };
};

const getCouponStatusStyle = (item: CouponItem) => {
    if (item.is_valid && item.is_active) {
        return { bg: '#EAF7EF', fg: '#2E9B63', text: 'Active' };
    }
    return { bg: '#FDECEC', fg: '#E24A4A', text: 'Inactive' };
};

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

const ShopDashboard = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<TabType>('PRODUCTS');
    const [loading, setLoading] = useState(false);
    const [couponLoading, setCouponLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [couponCount, setCouponCount] = useState(0);

    const [couponModalVisible, setCouponModalVisible] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [couponActive, setCouponActive] = useState(true);
    const [expiresAt, setExpiresAt] = useState('');

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
            const [shopRes, productRes, ordersRes, couponsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}${SHOP_DETAILS}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}${SHOP_PRODUCT}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}${SHOP_ORDERS}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_BASE_URL}${SHOP_COUPONS}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            setShopDetails(shopRes?.data?.data ?? null);

            // products response: { data: { products: [] } }
            const productList =
                productRes?.data?.data?.products ??
                productRes?.data?.products ??
                productRes?.data?.data ??
                [];

            setProducts(ensureArray<ProductItem>(productList));

            // orders response unknown, so safe fallback
            const orderList =
                ordersRes?.data?.data?.orders ??
                ordersRes?.data?.orders ??
                ordersRes?.data?.data ??
                ordersRes?.data?.results ??
                ordersRes?.data ??
                [];

            setOrders(ensureArray<OrderItem>(orderList));

            // coupons response: []
            const couponList = couponsRes?.data;
            const safeCoupons = ensureArray<CouponItem>(couponList);

            setCoupons(safeCoupons);
            setCouponCount(safeCoupons.length);
        } catch (err: any) {
            console.error('Error loading shop dashboard:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load shop data');
            setProducts([]);
            setOrders([]);
            setCoupons([]);
            setCouponCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const stats = useMemo(() => {
        const safeProducts = ensureArray<ProductItem>(products);
        const safeOrders = ensureArray<OrderItem>(orders);
        const safeCoupons = ensureArray<CouponItem>(coupons);

        const approved = safeProducts.filter((item) => item.status === 'APPROVED').length;
        const pending = safeProducts.filter((item) => item.status === 'PENDING').length;
        const rejected = safeProducts.filter((item) => item.status === 'REJECTED').length;

        return {
            totalProducts: safeProducts.length,
            totalOrders: safeOrders.length,
            totalCoupons: couponCount || safeCoupons.length,
            approved,
            pending,
            rejected,
        };
    }, [products, orders, coupons, couponCount]);

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
            toast.show({
                message: 'Token missing',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!couponCode.trim()) {
            toast.show({
                message: 'Please enter coupon code.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!discountValue.trim()) {
            toast.show({
                message: 'Please enter discount value.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!minOrderAmount.trim()) {
            toast.show({
                message: 'Please enter minimum order amount.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!maxUses.trim()) {
            toast.show({
                message: 'Please enter max uses.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!expiresAt.trim()) {
            toast.show({
                message: 'Please enter expiry date time.',
                type: 'error',
                style: 'top',
            });
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

            toast.show({
                message: 'Coupon created successfully',
                type: 'success',
                style: 'top',
            });

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
                {/* Main background gradient */}
                <LinearGradient
                    colors={['#1E2F73', '#2946A6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 20, paddingVertical: 24, position: 'relative' }}
                >
                    {/* Top soft wave */}
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

                    {/* Bottom overlay area */}
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

                    <Text
                        style={{
                            color: '#B9C7FF',
                            fontSize: 12,
                            fontWeight: '600',
                            marginBottom: 14,
                            letterSpacing: 1,
                        }}
                    >
                        SELLER DASHBOARD
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>
                                {shopDetails?.shop_name || 'My Shop'}
                            </Text>

                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: 14,
                                    marginTop: 10,
                                    lineHeight: 20,
                                }}
                            >
                                {shopDetails?.shop_description ||
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
                                        {stats.totalProducts} Products
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
                                {shopDetails?.shop_logo ? (
                                    <Image
                                        source={{ uri: shopDetails.shop_logo }}
                                        style={{ width: 68, height: 68, borderRadius: 18 }}
                                    />
                                ) : (
                                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>
                                        {shopDetails?.shop_name?.charAt(0)?.toUpperCase() || 'M'}
                                    </Text>
                                )}
                            </LinearGradient>

                            <MaterialIcons
                                name="edit-square"
                                size={22}
                                color="white"
                                className='absolute right-0 bottom-14'
                            />
                        </Pressable>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-5"
                contentContainerStyle={{ paddingRight: 20 }}
            >
                {TABS.map((tab) => {
                    const active = activeTab === tab;
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-full mr-3 ${active ? 'bg-[#1F56D8]' : 'bg-white border border-[#D6DAE2]'
                                }`}
                        >
                            <Text className={`text-[15px] font-semibold ${active ? 'text-white' : 'text-[#7B8190]'}`}>
                                {tab}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {!!errorMsg && (
                <Text className="mt-3 text-[13px] text-[#E24A4A]">
                    {errorMsg}
                </Text>
            )}

            <View className="h-4" />
        </View>
    );

    const renderProduct = ({ item }: { item: ProductItem }) => {
        const badge = getProductStatusStyle(item.status);

        return (
            <View

                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                }}
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
                                ${item.price}{' '}
                                <Text className="text-[#8A92A3] font-medium">
                                    / {item.currency?.toUpperCase()}
                                </Text>
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
                    <Pressable onPress={() => (navigation as any).navigate("EditProduct", {
                        productId: item.id
                    })} className='bg-blue-200 py-2 px-4 rounded-full'>
                        <Text className="text-[13px] font-medium text-[#1F56D8]"> Edit & Update</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    const renderOrder = ({ item }: { item: OrderItem }) => {
        const badge = getOrderStatusStyle(item.status);
        const product = item.seller_product;

        return (
            <View
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                }}
            >
                <View className="p-5">
                    <View className="flex-row">
                        <Image
                            source={{ uri: buildImageUrl(product?.main_image) }}
                            className="w-[78px] h-[78px] rounded-2xl bg-[#EEF2F7]"
                            resizeMode="cover"
                        />

                        <View className="flex-1 ml-4 justify-center">
                            <Text
                                className="text-[18px] font-semibold text-[#111827]"
                                numberOfLines={2}
                            >
                                {product?.title || 'Product'}
                            </Text>

                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Buyer Email: {item?.buyer_email}
                            </Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Quantity: {item?.quantity}
                            </Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Shipping Address: {item?.shipping_address}
                            </Text>

                            <Text className="text-[16px] text-[#111827] font-bold mt-2">
                                Price: ${item.total_price}{' '}
                                <Text className="text-[#8A92A3] font-medium">
                                    / {item.currency?.toUpperCase()}
                                </Text>
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="h-[1px] bg-[#E6E9EF]" />

                <View className="px-5 py-4 flex-row items-center justify-between">
                    <View
                        className="flex-row items-center px-4 py-2 rounded-full"
                        style={{ backgroundColor: badge.bg }}
                    >
                        <Text className="text-[13px] font-medium" style={{ color: badge.fg }}>
                            {item.status_display}
                        </Text>
                    </View>

                    <Text className="text-[#7A8192] text-[13px]">
                        Order #{item.id}
                    </Text>
                </View>
            </View>
        );
    };

    const renderCoupon = ({ item }: { item: CouponItem }) => {
        const badge = getCouponStatusStyle(item);

        return (
            <View
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                }}
            >
                <View className="p-5">
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                            <Text className="text-[19px] font-bold text-[#111827]">
                                {item.code}
                            </Text>

                            <Text className="text-[14px] text-[#7A8192] mt-2">
                                Type: {item.discount_type}
                            </Text>

                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Discount: {item.discount_value}
                            </Text>

                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Min Order: ${item.min_order_amount}
                            </Text>

                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Uses: {item.used_count}/{item.max_uses}
                            </Text>

                            <Text className="text-[14px] text-[#7A8192] mt-1">
                                Expires: {item.expires_at}
                            </Text>
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

    const renderHistory = () => (
        <View>
            <View className="flex-row flex-wrap justify-between">
                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Total Products</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        {stats.totalProducts}
                    </Text>
                </View>

                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Total Orders</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        {orders.length || shopDetails?.total_orders || 0}
                    </Text>
                </View>

                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Total Earnings</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        ${shopDetails?.total_earnings ?? '0.00'}
                    </Text>
                </View>

                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Coupons</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        {stats.totalCoupons}
                    </Text>
                </View>

                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Approved</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        {stats.approved}
                    </Text>
                </View>

                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Pending</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        {stats.pending}
                    </Text>
                </View>

                <View className="bg-white rounded-3xl p-5 mb-4 w-[48.5%]">
                    <Text className="text-[#7A8192] text-[14px]">Rejected</Text>
                    <Text className="text-[#111827] text-[24px] font-extrabold mt-2">
                        {stats.rejected}
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderCouponTop = () => (
        <View className="mb-4">
            <View className="bg-white rounded-3xl p-5 mb-4">
                <Text className="text-[#7A8192] text-[14px]">Total Coupons</Text>
                <Text className="text-[#111827] text-[26px] font-extrabold mt-2">
                    {couponCount}
                </Text>
            </View>

            <Pressable
                className="bg-[#1F56D8] rounded-2xl py-4 items-center justify-center"
                onPress={() => setCouponModalVisible(true)}
            >
                <Text className="text-white text-[16px] font-bold">Create Coupon</Text>
            </Pressable>
        </View>
    );

    const renderProductsTab = () => (
        <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProduct}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={renderHeader}
            onRefresh={loadData}
            refreshing={loading}
            ListEmptyComponent={
                !loading ? (
                    <Text className="text-center text-[#7A8192] mt-10">
                        No products found.
                    </Text>
                ) : null
            }
        />
    );

    const renderOrdersTab = () => (
        <FlatList
            data={orders}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderOrder}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={renderHeader}
            onRefresh={loadData}
            refreshing={loading}
            ListEmptyComponent={
                !loading ? (
                    <Text className="text-center text-[#7A8192] mt-10">
                        No orders found.
                    </Text>
                ) : null
            }
        />
    );

    const renderHistoryTab = () => (
        <FlatList
            data={[{ id: 'history' }]}
            keyExtractor={(item) => item.id}
            renderItem={() => renderHistory()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={renderHeader}
            onRefresh={loadData}
            refreshing={loading}
        />
    );

    const renderCouponTab = () => (
        <FlatList
            data={coupons}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCoupon}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={
                <View>
                    {renderHeader()}
                    {renderCouponTop()}
                </View>
            }
            onRefresh={loadData}
            refreshing={loading}
            ListEmptyComponent={
                !loading ? (
                    <Text className="text-center text-[#7A8192] mt-10">
                        No coupons found.
                    </Text>
                ) : null
            }
        />
    );

    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <StatusBar style="auto" />
            <View className="px-5 flex-1">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold">My Shop</Text>
                </View>

                {activeTab === 'PRODUCTS' && renderProductsTab()}
                {activeTab === 'ORDERS' && renderOrdersTab()}
                {activeTab === 'HISTORY' && renderHistoryTab()}
                {activeTab === 'COUPON' && renderCouponTab()}

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
                        if (activeTab === 'COUPON') {
                            setCouponModalVisible(true);
                            return;
                        }
                        navigation.navigate('AddProduct');
                    }}
                >
                    <Ionicons
                        name={activeTab === 'COUPON' ? 'pricetag-outline' : 'add'}
                        size={28}
                        color="#fff"
                    />
                </Pressable>

                <Modal
                    visible={couponModalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setCouponModalVisible(false)}
                >
                    <View className="flex-1 bg-black/40 justify-end">
                        <View className="bg-[#F9F9FB] rounded-t-3xl px-5 pt-5 pb-8 max-h-[90%]">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-[20px] font-bold text-[#111827]">
                                    Create Coupon
                                </Text>
                                <Pressable onPress={() => setCouponModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#111827" />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <FieldLabel>Coupon Code *</FieldLabel>
                                <BoxInput
                                    value={couponCode}
                                    onChangeText={setCouponCode}
                                    placeholder="SAVE20"
                                />

                                <FieldLabel>Discount Type *</FieldLabel>
                                <View className="flex-row mb-4">
                                    <Pressable
                                        onPress={() => setDiscountType('PERCENTAGE')}
                                        className={`px-4 py-3 rounded-full mr-3 ${discountType === 'PERCENTAGE'
                                            ? 'bg-[#1F56D8]'
                                            : 'bg-white border border-[#D6DAE2]'
                                            }`}
                                    >
                                        <Text className={discountType === 'PERCENTAGE' ? 'text-white font-semibold' : 'text-[#7B8190] font-semibold'}>
                                            PERCENTAGE
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => setDiscountType('FIXED')}
                                        className={`px-4 py-3 rounded-full ${discountType === 'FIXED'
                                            ? 'bg-[#1F56D8]'
                                            : 'bg-white border border-[#D6DAE2]'
                                            }`}
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
                                    <Text className="text-[16px] font-semibold text-[#111827]">
                                        Active Coupon
                                    </Text>
                                    <Switch value={couponActive} onValueChange={setCouponActive} />
                                </View>

                                <Pressable
                                    className={`rounded-2xl py-4 items-center justify-center ${couponLoading ? 'bg-[#7EA2F2]' : 'bg-[#1F56D8]'
                                        }`}
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