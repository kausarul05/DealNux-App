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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
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
    courier_name?: string;
    status: string;
    status_display: string;
    tracking_number: string;
    note: string;
    created_at: string;
    updated_at: string;
    shipping_cost?: string;
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

// ─── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DELIVERY_TIMEFRAMES = ['Same Day', 'Next Day', '1-2 Days', '2-3 Days', '3-5 Days'];
const PROCESSING_TIMES = ['1-2 Business Days', '2-3 Business Days', '3-5 Business Days', '5-7 Business Days'];
const COURIERS = ['FedEx', 'UPS', 'USPS', 'DHL', 'Amazon Logistics'];
const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

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

const AddTrackingModal = ({
    visible,
    onClose,
    orderId,
    onSave,
    isUpdating,
}: {
    visible: boolean;
    onClose: () => void;
    orderId: number;
    onSave: (orderId: number, courier: string, tracking: string) => void;
    isUpdating: boolean;
}) => {
    const [selectedCourier, setSelectedCourier] = useState('');
    const [customCourier, setCustomCourier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierModalOpen, setCourierModalOpen] = useState(false);
    const [showOtherInput, setShowOtherInput] = useState(false);

    const COURIER_OPTIONS = [
        'FedEx',
        'UPS',
        'USPS',
        'DHL',
        'Amazon Logistics',
        'OnTrac',
        'Other'
    ];

    const handleCourierSelect = (courier: string) => {
        setSelectedCourier(courier);
        setCourierModalOpen(false);
        if (courier === 'Other') {
            setShowOtherInput(true);
            setCustomCourier('');
        } else {
            setShowOtherInput(false);
            setCustomCourier('');
        }
    };

    const handleSave = () => {
        const finalCourier = selectedCourier === 'Other' ? customCourier.trim() : selectedCourier;
        if (!finalCourier || !trackingNumber.trim()) {
            Alert.alert('Error', 'Please select courier and enter tracking number.');
            return;
        }
        onSave(orderId, finalCourier, trackingNumber.trim());
        setSelectedCourier('');
        setCustomCourier('');
        setTrackingNumber('');
        setShowOtherInput(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl p-5 pb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[20px] font-bold text-[#111827]">Add Tracking</Text>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                            <Ionicons name="close" size={22} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-[14px] text-[#6B7280] mb-4">Add tracking details for Order #{orderId}</Text>

                    {/* Courier Dropdown */}
                    <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">COURIER / CARRIER *</Text>
                    <TouchableOpacity
                        onPress={() => setCourierModalOpen(true)}
                        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
                    >
                        <Text className={selectedCourier ? 'text-[16px] text-[#111827]' : 'text-[16px] text-[#9CA3AF]'}>
                            {selectedCourier === 'Other' ? customCourier || 'Other...' : selectedCourier || 'Select courier...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    {/* Custom Courier Input (shown when "Other" is selected) */}
                    {showOtherInput && (
                        <View className="mb-3">
                            <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">ENTER COURIER NAME *</Text>
                            <TextInput
                                value={customCourier}
                                onChangeText={setCustomCourier}
                                placeholder="Enter courier name"
                                placeholderTextColor="#9CA3AF"
                                className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[16px] text-[#111827]"
                            />
                        </View>
                    )}

                    {/* Tracking Number */}
                    <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">TRACKING NUMBER *</Text>
                    <TextInput
                        value={trackingNumber}
                        onChangeText={setTrackingNumber}
                        placeholder="Enter tracking number"
                        placeholderTextColor="#9CA3AF"
                        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827]"
                    />

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isUpdating}
                        className={`bg-[#2355B6] rounded-xl py-3.5 items-center justify-center ${isUpdating ? 'opacity-70' : ''}`}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-[15px]">Save Tracking</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Courier Selection Modal */}
            <Modal
                visible={courierModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCourierModalOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setCourierModalOpen(false)}
                >
                    <Pressable className="bg-white rounded-t-2xl p-5 max-h-[50%]" onPress={() => { }}>
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-[18px] font-bold text-[#111827]">Select Courier</Text>
                            <TouchableOpacity onPress={() => setCourierModalOpen(false)}>
                                <Ionicons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {COURIER_OPTIONS.map((courier) => (
                                <Pressable
                                    key={courier}
                                    onPress={() => handleCourierSelect(courier)}
                                    className="py-4 border-b border-[#E5E7EB] flex-row items-center justify-between"
                                >
                                    <Text className="text-[16px] text-[#111827]">{courier}</Text>
                                    {selectedCourier === courier && (
                                        <Ionicons name="checkmark-circle" size={22} color="#2355B6" />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </Modal>
    );
};

// ─── Update Tracking Modal ─────────────────────────────────────────────────
const UpdateTrackingModal = ({
    visible,
    onClose,
    order,
    onUpdate,
    isUpdating,
}: {
    visible: boolean;
    onClose: () => void;
    order: OrderItem | null;
    onUpdate: (orderId: number, courier: string, tracking: string) => void;
    isUpdating: boolean;
}) => {
    const [selectedCourier, setSelectedCourier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierModalOpen, setCourierModalOpen] = useState(false);

    const COURIER_OPTIONS = [
        'FedEx',
        'UPS',
        'USPS',
        'DHL',
        'Amazon Logistics',
        'OnTrac',
        'Other'
    ];

    useEffect(() => {
        if (visible && order) {
            setSelectedCourier(order.courier_name || '');
            setTrackingNumber(order.tracking_number || '');
        }
    }, [visible, order]);

    const handleUpdate = () => {
        if (!selectedCourier.trim() || !trackingNumber.trim()) {
            Alert.alert('Error', 'Please select courier and enter tracking number.');
            return;
        }
        onUpdate(order?.id || 0, selectedCourier.trim(), trackingNumber.trim());
        onClose();
    };

    if (!order) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl p-5 pb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[20px] font-bold text-[#111827]">Update Tracking</Text>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                            <Ionicons name="close" size={22} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-[14px] text-[#6B7280] mb-4">Update tracking details for Order #{order.id}</Text>

                    {/* Current Tracking Info */}
                    <View className="bg-[#F8FAFC] rounded-xl p-3 mb-4 border border-[#E5E7EB]">
                        <Text className="text-[12px] text-[#6B7280]">Current Tracking</Text>
                        <Text className="text-[14px] font-semibold text-[#111827] mt-1">
                            {order.courier_name || 'N/A'} · {order.tracking_number || 'N/A'}
                        </Text>
                    </View>

                    {/* Courier Dropdown */}
                    <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">COURIER / CARRIER *</Text>
                    <TouchableOpacity
                        onPress={() => setCourierModalOpen(true)}
                        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
                    >
                        <Text className={selectedCourier ? 'text-[16px] text-[#111827]' : 'text-[16px] text-[#9CA3AF]'}>
                            {selectedCourier || 'Select courier...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    {/* Tracking Number */}
                    <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">TRACKING NUMBER *</Text>
                    <TextInput
                        value={trackingNumber}
                        onChangeText={setTrackingNumber}
                        placeholder="Enter tracking number"
                        placeholderTextColor="#9CA3AF"
                        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827]"
                    />

                    {/* Update Button */}
                    <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={isUpdating}
                        className={`bg-[#F59E0B] rounded-xl py-3.5 items-center justify-center ${isUpdating ? 'opacity-70' : ''}`}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-[15px]">Update Tracking</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Courier Selection Modal */}
            <Modal
                visible={courierModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCourierModalOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setCourierModalOpen(false)}
                >
                    <Pressable className="bg-white rounded-t-2xl p-5 max-h-[50%]" onPress={() => { }}>
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-[18px] font-bold text-[#111827]">Select Courier</Text>
                            <TouchableOpacity onPress={() => setCourierModalOpen(false)}>
                                <Ionicons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {COURIER_OPTIONS.map((courier) => (
                                <Pressable
                                    key={courier}
                                    onPress={() => {
                                        setSelectedCourier(courier);
                                        setCourierModalOpen(false);
                                    }}
                                    className="py-4 border-b border-[#E5E7EB] flex-row items-center justify-between"
                                >
                                    <Text className="text-[16px] text-[#111827]">{courier}</Text>
                                    {selectedCourier === courier && (
                                        <Ionicons name="checkmark-circle" size={22} color="#2355B6" />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </Modal>
    );
};

// ─── Order Details Modal ────────────────────────────────────────────────────
const OrderDetailsModal = ({
    visible,
    onClose,
    order,
    onUpdateStatus,
    onAddTracking,
    onUpdateTracking,
}: {
    visible: boolean;
    onClose: () => void;
    order: OrderItem | null;
    onUpdateStatus: (orderId: number, status: string) => void;
    onAddTracking: (orderId: number, courier: string, tracking: string) => void;
    onUpdateTracking: (orderId: number, courier: string, tracking: string) => void;
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [addTrackingModalVisible, setAddTrackingModalVisible] = useState(false);
    const [updateTrackingModalVisible, setUpdateTrackingModalVisible] = useState(false);

    if (!order) return null;

    const badge = getStatusStyle(order.status);
    const isPending = order.status === 'PENDING' || order.status === 'CONFIRMED';
    const isAccepted = order.status === 'ACCEPTED';
    const isShipped = order.status === 'SHIPPED' || order.status === 'DELIVERED';
    const hasTracking = order.tracking_number && order.tracking_number.length > 0;

    const parseShippingAddress = (addressString: string) => {
        try {
            if (!addressString) return null;
            const parsed = typeof addressString === 'string' ? JSON.parse(addressString) : addressString;
            return parsed;
        } catch (error) {
            console.error('Error parsing shipping address:', error);
            return null;
        }
    };

    const handleAcceptOrder = async () => {
        setIsUpdating(true);
        await onUpdateStatus(order.id, 'ACCEPTED');
        setIsUpdating(false);
    };

    const handleMarkShipped = async () => {
        setIsUpdating(true);
        await onUpdateStatus(order.id, 'SHIPPED');
        setIsUpdating(false);
    };

    const handleAddTracking = async (orderId: number, courier: string, tracking: string) => {
        setIsUpdating(true);
        await onAddTracking(orderId, courier, tracking);
        setIsUpdating(false);
    };

    const handleUpdateTracking = async (orderId: number, courier: string, tracking: string) => {
        setIsUpdating(true);
        await onUpdateTracking(orderId, courier, tracking);
        setIsUpdating(false);
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

    const formatPrice = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return num.toFixed(2);
    };

    const itemTotal = parseFloat(order.total_price) || 0;
    const shippingFee = order.shipping_cost ? parseFloat(order.shipping_cost) : 0;
    const serviceFee = itemTotal * 0.08;
    const orderTotal = itemTotal + shippingFee + serviceFee;

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <View className="flex-1 bg-black/50 justify-end mb-0">
                    <View className="bg-white rounded-t-3xl max-h-[96%]">
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
                            <View>
                                <Text className="text-[20px] font-bold text-[#111827]">Order #{order.id}</Text>
                                <Text className="text-[12px] text-[#9CA3AF]">Placed {formatDate(order.created_at)} · {order.buyer_email}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center">
                                <Ionicons name="close" size={22} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-5 pt-4 pb-8" showsVerticalScrollIndicator={false}>
                            {/* Status Badge */}
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: badge.bg }}>
                                    <Text className="text-[13px] font-medium" style={{ color: badge.fg }}>
                                        {order.status_display || order.status}
                                    </Text>
                                </View>
                                {hasTracking && (
                                    <View className="flex-row items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                                        <Ionicons name="cube-outline" size={14} color="#2355B6" />
                                        <Text className="text-[11px] text-[#2355B6] font-medium">Tracked</Text>
                                    </View>
                                )}
                            </View>

                            {/* Product Section */}
                            <View className="bg-[#F8FAFC] rounded-xl p-4 mb-4 border border-[#E5E7EB]">
                                <Text className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">PRODUCT</Text>
                                <View className="flex-row">
                                    <Image
                                        source={{ uri: buildImageUrl(order.seller_product?.main_image) }}
                                        className="w-20 h-20 rounded-xl bg-[#EEF2F7]"
                                        resizeMode="cover"
                                    />
                                    <View className="flex-1 ml-4">
                                        <Text className="text-[15px] font-semibold text-[#111827]" numberOfLines={2}>
                                            {order.seller_product?.title || 'Product'}
                                        </Text>
                                        <Text className="text-[13px] text-[#6B7280] mt-1">
                                            Qty: {order.quantity} · ${formatPrice(order.unit_price)} each
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Pricing Section */}
                            <View className="bg-[#F8FAFC] rounded-xl p-4 mb-4 border border-[#E5E7EB]">
                                <Text className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">PRICING</Text>
                                <View className="flex-row justify-between py-1.5">
                                    <Text className="text-[14px] text-[#6B7280]">Item Total</Text>
                                    <Text className="text-[14px] font-semibold text-[#111827]">${formatPrice(itemTotal)}</Text>
                                </View>
                                <View className="flex-row justify-between py-1.5">
                                    <Text className="text-[14px] text-[#6B7280]">Shipping Fee</Text>
                                    <Text className="text-[14px] font-semibold text-[#16A34A]">Free</Text>
                                </View>
                                <View className="flex-row justify-between py-1.5 border-t border-[#E5E7EB] mt-1 pt-2">
                                    <Text className="text-[14px] text-[#6B7280]">Service Fee</Text>
                                    <Text className="text-[14px] font-semibold text-[#111827]">${formatPrice(serviceFee)}</Text>
                                </View>
                                <View className="flex-row justify-between py-1.5 border-t border-[#E5E7EB] mt-1 pt-2">
                                    <Text className="text-[16px] font-bold text-[#111827]">Order Total</Text>
                                    <Text className="text-[18px] font-bold text-[#2355B6]">${formatPrice(orderTotal)}</Text>
                                </View>
                            </View>

                            {/* Shipping Info */}
                            <View className="bg-[#F8FAFC] rounded-xl p-4 mb-4 border border-[#E5E7EB]">
                                <Text className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">SHIPPING</Text>
                                <Text className="text-[13px] text-[#6B7280]">Address:</Text>
                                <View className="mt-1">
                                    {(() => {
                                        const address = parseShippingAddress(order.shipping_address);
                                        if (address) {
                                            return (
                                                <>
                                                    {(address.first_name || address.last_name) && (
                                                        <Text className="text-[14px] text-[#111827] font-medium">
                                                            {address.first_name || ''} {address.last_name || ''}
                                                        </Text>
                                                    )}
                                                    {address.address_line1 && (
                                                        <Text className="text-[14px] text-[#111827] font-medium">
                                                            {address.address_line1}
                                                        </Text>
                                                    )}
                                                    {address.address_line2 && (
                                                        <Text className="text-[14px] text-[#111827] font-medium">
                                                            {address.address_line2}
                                                        </Text>
                                                    )}
                                                    {(address.city || address.state || address.zip_code) && (
                                                        <Text className="text-[14px] text-[#111827] font-medium">
                                                            {address.city || ''}, {address.state || ''} {address.zip_code || ''}
                                                        </Text>
                                                    )}
                                                    {address.country && (
                                                        <Text className="text-[14px] text-[#111827] font-medium">
                                                            {address.country}
                                                        </Text>
                                                    )}
                                                </>
                                            );
                                        }
                                        return <Text className="text-[14px] text-[#111827] font-medium">N/A</Text>;
                                    })()}
                                </View>

                                {hasTracking && (
                                    <View className="mt-3 pt-3 border-t border-[#E5E7EB]">
                                        <Text className="text-[13px] text-[#6B7280]">Courier:</Text>
                                        <Text className="text-[14px] text-[#111827] font-medium mt-0.5">{order.courier_name || 'N/A'}</Text>
                                        <Text className="text-[13px] text-[#6B7280] mt-2">Tracking No:</Text>
                                        <Text className="text-[14px] text-[#2355B6] font-medium mt-0.5">{order.tracking_number}</Text>
                                    </View>
                                )}
                            </View>

                            {/* ─── Action Buttons ─── */}

                            {/* Step 1: Accept Button */}
                            {isPending && (
                                <TouchableOpacity
                                    onPress={handleAcceptOrder}
                                    disabled={isUpdating}
                                    className={`bg-[#16A34A] rounded-xl py-3.5 items-center justify-center mb-3 ${isUpdating ? 'opacity-70' : ''}`}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-semibold text-[15px]">Accept Order</Text>
                                    )}
                                </TouchableOpacity>
                            )}

                            {/* Step 2: Add Tracking Button */}
                            {isAccepted && !hasTracking && (
                                <TouchableOpacity
                                    onPress={() => setAddTrackingModalVisible(true)}
                                    className="bg-[#2355B6] rounded-xl py-3.5 items-center justify-center mb-3 flex-row gap-2"
                                >
                                    <Ionicons name="cube-outline" size={20} color="white" />
                                    <Text className="text-white font-semibold text-[15px]">Add Tracking</Text>
                                </TouchableOpacity>
                            )}

                            {/* Step 3: Update Tracking Button */}
                            {hasTracking && (
                                <TouchableOpacity
                                    onPress={() => setUpdateTrackingModalVisible(true)}
                                    className="bg-[#F59E0B] rounded-xl py-3.5 items-center justify-center mb-3 flex-row gap-2"
                                >
                                    {/* <Ionicons name="pencil-outline" size={20} color="white" /> */}
                                    <Text className="text-white font-semibold text-[15px]">Update Tracking</Text>
                                </TouchableOpacity>
                            )}

                            {/* Step 4: Mark as Shipped */}
                            {hasTracking && !isShipped && (
                                <TouchableOpacity
                                    onPress={handleMarkShipped}
                                    disabled={isUpdating}
                                    className={`bg-[#7C3AED] rounded-xl py-3.5 items-center justify-center mb-3 ${isUpdating ? 'opacity-70' : ''}`}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-semibold text-[15px]">🚚 Mark as Shipped</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </ScrollView>

                        {/* Close Button */}
                        {/* <View className="px-5 py-4 border-t border-[#E5E7EB]">
                            <TouchableOpacity
                                onPress={onClose}
                                className="bg-[#F3F4F6] rounded-xl py-3 items-center justify-center"
                            >
                                <Text className="text-[#6B7280] font-semibold">Close</Text>
                            </TouchableOpacity>
                        </View> */}
                    </View>
                </View>
            </Modal>

            {/* Add Tracking Modal */}
            <AddTrackingModal
                visible={addTrackingModalVisible}
                onClose={() => setAddTrackingModalVisible(false)}
                orderId={order.id}
                onSave={handleAddTracking}
                isUpdating={isUpdating}
            />

            {/* Update Tracking Modal */}
            <UpdateTrackingModal
                visible={updateTrackingModalVisible}
                onClose={() => setUpdateTrackingModalVisible(false)}
                order={order}
                onUpdate={handleUpdateTracking}
                isUpdating={isUpdating}
            />
        </>
    );
};


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

    // ─── Stripe Connect State ──────────────────────────────────────────────────
    const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
    const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState('');
    const [stripeModalVisible, setStripeModalVisible] = useState(false);
    const [stripeAccountId, setStripeAccountId] = useState('');
    const [stripeOnboardingCompleted, setStripeOnboardingCompleted] = useState(false);

    // ─── Shipping Tab State ──────────────────────────────────────────────────
    const [pickupActive, setPickupActive] = useState(false);
    const [pickupStreet, setPickupStreet] = useState('');
    const [pickupCity, setPickupCity] = useState('');
    const [pickupState, setPickupState] = useState('');
    const [pickupZip, setPickupZip] = useState('');
    const [pickupHoursStart, setPickupHoursStart] = useState('');
    const [pickupHoursEnd, setPickupHoursEnd] = useState('');
    const [pickupDays, setPickupDays] = useState<string[]>([]);

    const [deliveryActive, setDeliveryActive] = useState(false);
    const [deliveryRadius, setDeliveryRadius] = useState(5);
    const [deliveryFee, setDeliveryFee] = useState('');
    const [deliveryTimeframe, setDeliveryTimeframe] = useState('');

    const [shippingActive, setShippingActive] = useState(true);
    const [processingTime, setProcessingTime] = useState('');
    const [selectedCouriers, setSelectedCouriers] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // ─── Edit Profile Modal States ────────────────────────────────────────────
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editTab, setEditTab] = useState<'branding' | 'shipping' | 'legal'>('branding');

    // Branding
    const [shopName, setShopName] = useState('');
    const [shopDescription, setShopDescription] = useState('');
    const [shopLogo, setShopLogo] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<any>(null);

    // Shipping (Edit)
    const [editPickupActive, setEditPickupActive] = useState(false);
    const [editPickupStreet, setEditPickupStreet] = useState('');
    const [editPickupCity, setEditPickupCity] = useState('');
    const [editPickupState, setEditPickupState] = useState('');
    const [editPickupZip, setEditPickupZip] = useState('');
    const [editPickupHoursStart, setEditPickupHoursStart] = useState('');
    const [editPickupHoursEnd, setEditPickupHoursEnd] = useState('');
    const [editPickupDays, setEditPickupDays] = useState<string[]>([]);
    const [editDeliveryActive, setEditDeliveryActive] = useState(false);
    const [editDeliveryRadius, setEditDeliveryRadius] = useState(5);
    const [editDeliveryFee, setEditDeliveryFee] = useState('');
    const [editDeliveryTimeframe, setEditDeliveryTimeframe] = useState('');

    // Legal & Verification
    const [legalFullName, setLegalFullName] = useState('');
    const [businessRegNumber, setBusinessRegNumber] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [governmentId, setGovernmentId] = useState<any>(null);
    const [businessLicense, setBusinessLicense] = useState<any>(null);
    const [utilityBill, setUtilityBill] = useState<any>(null);

    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
    const [orderModalVisible, setOrderModalVisible] = useState(false);

    // ─── Pagination State ──────────────────────────────────────────────────────
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersHasNextPage, setOrdersHasNextPage] = useState(false);
    const [ordersHasPreviousPage, setOrdersHasPreviousPage] = useState(false);
    const [ordersTotalCount, setOrdersTotalCount] = useState(0);
    const [ordersTotalPages, setOrdersTotalPages] = useState(1);
    const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
    const [ordersPerPage, setOrdersPerPage] = useState(10);

    const [editingLoading, setEditingLoading] = useState(false);

    // ─── Stripe Connect Functions ──────────────────────────────────────────────
    const handleConnectStripe = async () => {
        try {
            setStripeConnectLoading(true);
            const token = await AsyncStorage.getItem('vToken');

            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}payment/seller/connect/`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('Stripe Connect response:', response.data);

            if (response.data?.success) {
                const onboardingUrl = response.data?.data?.onboarding_url;
                const accountId = response.data?.data?.stripe_account_id;

                if (onboardingUrl) {
                    setStripeOnboardingUrl(onboardingUrl);
                    setStripeAccountId(accountId);
                    setStripeModalVisible(true);

                    toast.show({
                        message: 'Redirecting to Stripe onboarding...',
                        type: 'info',
                        style: 'top',
                    });
                } else {
                    toast.show({
                        message: response.data?.message || 'Failed to get onboarding link',
                        type: 'error',
                        style: 'top',
                    });
                }
            } else {
                toast.show({
                    message: response.data?.message || 'Failed to connect Stripe',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Stripe Connect error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to connect Stripe',
                type: 'error',
                style: 'top',
            });
        } finally {
            setStripeConnectLoading(false);
        }
    };

    const handleStripeOnboardingComplete = () => {
        setStripeModalVisible(false);
        setStripeOnboardingCompleted(true);
        toast.show({
            message: 'Stripe account connected successfully!',
            type: 'success',
            style: 'top',
        });
        loadData();
    };

    const handleManageBank = async () => {
        if (stripeOnboardingUrl) {
            setStripeModalVisible(true);
        } else {
            await handleConnectStripe();
        }
    };

    const handleUpdateOrderStatus = async (orderId: number, status: string) => {
        try {
            const token = await AsyncStorage.getItem('vToken');
            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}store/orders/${orderId}/update-status/`,
                { status },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data?.success) {
                toast.show({
                    message: `Order #${orderId} ${status} successfully!`,
                    type: 'success',
                    style: 'top',
                });
                loadData(); // Refresh data
                setOrderModalVisible(false);
            } else {
                toast.show({
                    message: response.data?.message || 'Failed to update order status',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Update status error:', error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to update order status',
                type: 'error',
                style: 'top',
            });
        }
    };

    // ─── Add Tracking ─────────────────────────────────────────────────────────────
    const handleAddTracking = async (orderId: number, courierName: string, trackingNumber: string) => {
        try {
            const token = await AsyncStorage.getItem('vToken');
            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            // Check if tracking already exists
            const existingOrder = orders.find(o => o.id === orderId);
            const isUpdate = existingOrder?.tracking_number && existingOrder.tracking_number.length > 0;

            const url = isUpdate
                ? `${API_BASE_URL}store/orders/${orderId}/add-tracking/`
                : `${API_BASE_URL}store/orders/${orderId}/add-tracking/`;

            const method = isUpdate ? 'patch' : 'post';

            const response = await axios({
                method,
                url,
                data: {
                    courier_name: courierName,
                    tracking_number: trackingNumber,
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (response.data?.success) {
                toast.show({
                    message: `Tracking added for Order #${orderId}!`,
                    type: 'success',
                    style: 'top',
                });
                loadData(); // Refresh data
                setOrderModalVisible(false);
            } else {
                toast.show({
                    message: response.data?.message || 'Failed to add tracking',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Add tracking error:', error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to add tracking',
                type: 'error',
                style: 'top',
            });
        }
    };

    const handleUpdateTracking = async (orderId: number, courierName: string, trackingNumber: string) => {
        try {
            const token = await AsyncStorage.getItem('vToken');
            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const response = await axios.patch(
                `${API_BASE_URL}store/orders/${orderId}/add-tracking/`,
                {
                    courier_name: courierName,
                    tracking_number: trackingNumber,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data?.success) {
                toast.show({
                    message: `Tracking updated for Order #${orderId}!`,
                    type: 'success',
                    style: 'top',
                });
                loadData();
                setOrderModalVisible(false);
            } else {
                toast.show({
                    message: response.data?.message || 'Failed to update tracking',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Update tracking error:', error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to update tracking',
                type: 'error',
                style: 'top',
            });
        }
    };

    // ─── Pagination Component ────────────────────────────────────────────────────
    const PaginationControls = () => {
        const maxVisiblePages = 5;
        let startPage = Math.max(1, ordersPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(ordersTotalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        const pageNumbers = [];
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <View className="py-4 px-4">
                {/* Page info */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-[13px] text-[#6B7280]">
                        Showing {orders.length} of {ordersTotalCount} orders
                    </Text>
                    <Text className="text-[13px] text-[#6B7280]">
                        Page {ordersPage} of {ordersTotalPages}
                    </Text>
                </View>

                {/* Pagination buttons */}
                <View className="flex-row items-center justify-center gap-1 flex-wrap">
                    {/* Previous button */}
                    <TouchableOpacity
                        onPress={goToPreviousPage}
                        disabled={!ordersHasPreviousPage || ordersLoadingMore}
                        className={`px-3 py-2 rounded-lg ${ordersHasPreviousPage ? 'bg-[#1F56D8]' : 'bg-[#E5E7EB]'}`}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={18}
                            color={ordersHasPreviousPage ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>

                    {/* Page numbers */}
                    {startPage > 1 && (
                        <>
                            <TouchableOpacity
                                onPress={() => goToPage(1)}
                                className="px-3 py-2 rounded-lg bg-[#F3F4F6]"
                            >
                                <Text className="text-[14px] text-[#6B7280]">1</Text>
                            </TouchableOpacity>
                            {startPage > 2 && (
                                <Text className="text-[14px] text-[#9CA3AF] px-1">...</Text>
                            )}
                        </>
                    )}

                    {pageNumbers.map((num) => (
                        <TouchableOpacity
                            key={num}
                            onPress={() => goToPage(num)}
                            className={`px-3 py-2 rounded-lg ${num === ordersPage ? 'bg-[#1F56D8]' : 'bg-[#F3F4F6]'}`}
                        >
                            <Text
                                className={`text-[14px] ${num === ordersPage ? 'text-white font-bold' : 'text-[#6B7280]'}`}
                            >
                                {num}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {endPage < ordersTotalPages && (
                        <>
                            {endPage < ordersTotalPages - 1 && (
                                <Text className="text-[14px] text-[#9CA3AF] px-1">...</Text>
                            )}
                            <TouchableOpacity
                                onPress={() => goToPage(ordersTotalPages)}
                                className="px-3 py-2 rounded-lg bg-[#F3F4F6]"
                            >
                                <Text className="text-[14px] text-[#6B7280]">{ordersTotalPages}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Next button */}
                    <TouchableOpacity
                        onPress={goToNextPage}
                        disabled={!ordersHasNextPage || ordersLoadingMore}
                        className={`px-3 py-2 rounded-lg ${ordersHasNextPage ? 'bg-[#1F56D8]' : 'bg-[#E5E7EB]'}`}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={ordersHasNextPage ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Loading indicator */}
                {ordersLoadingMore && (
                    <View className="items-center mt-2">
                        <ActivityIndicator size="small" color="#1F56D8" />
                    </View>
                )}
            </View>
        );
    };


    const handleWebViewNavigation = (navState: any) => {
        // Check if the user has completed onboarding
        // Stripe redirects to a success URL or the merchant's return URL
        if (navState.url && navState.url.includes('return')) {
            handleStripeOnboardingComplete();
        }
        // Also check for stripe.com/connect/setup/complete patterns
        if (navState.url && navState.url.includes('complete')) {
            handleStripeOnboardingComplete();
        }
    };

    // ─── Data Loading ──────────────────────────────────────────────────────────
    const loadData = useCallback(async (page = 1, append = false) => {
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
                axios.get(`${API_BASE_URL}${SHOP_ORDERS}?page=${page}`, {
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

            // ─── Handle Orders with Pagination ──────────────────────────────────────
            let ordersData = ordersRes?.data?.data || ordersRes?.data || {};
            let orderList = [];
            let pagination = {};

            if (Array.isArray(ordersData)) {
                orderList = ordersData;
                pagination = ordersRes?.data?.pagination || {};
            } else if (ordersData?.results) {
                orderList = ordersData.results;
                pagination = ordersData?.pagination || ordersRes?.data?.pagination || {};
            } else {
                orderList = ordersData || [];
                pagination = ordersRes?.data?.pagination || {};
            }

            console.log('📦 Orders Response:', {
                orderListLength: orderList.length,
                pagination: pagination,
            });

            // ✅ Set orders
            setOrders(ensureArray<OrderItem>(orderList));

            // ✅ Set pagination state
            const currentPage = pagination?.current_page || page;
            const totalCount = pagination?.total_count || orderList.length || 0;
            const totalPages = pagination?.total_pages || Math.ceil(totalCount / ordersPerPage) || 1;

            setOrdersPage(currentPage);
            setOrdersHasNextPage(pagination?.has_next || currentPage < totalPages);
            setOrdersHasPreviousPage(pagination?.has_previous || currentPage > 1);
            setOrdersTotalCount(totalCount);
            setOrdersTotalPages(totalPages);

            console.log('📊 Pagination State:', {
                currentPage,
                totalCount,
                totalPages,
                hasNext: pagination?.has_next,
                hasPrevious: pagination?.has_previous,
            });

            // ... rest of the data loading
            const shippingData = shippingRes?.data?.data;
            if (shippingData) {
                setShipping(shippingData);
                setPickupActive(shippingData.local_pickup?.active || false);
                setPickupStreet(shippingData.local_pickup?.address_street || '');
                setPickupCity(shippingData.local_pickup?.address_city || '');
                setPickupState(shippingData.local_pickup?.address_state || '');
                setPickupZip(shippingData.local_pickup?.address_zip || '');
                setPickupHoursStart(shippingData.local_pickup?.hours_start || '');
                setPickupHoursEnd(shippingData.local_pickup?.hours_end || '');
                setPickupDays(shippingData.local_pickup?.available_days || []);
                setDeliveryActive(shippingData.local_delivery?.active || false);
                setDeliveryRadius(shippingData.local_delivery?.radius || 5);
                setDeliveryFee(shippingData.local_delivery?.fee?.toString() || '0');
                setDeliveryTimeframe(shippingData.local_delivery?.timeframe || '');
                setShippingActive(shippingData.standard_shipping?.active !== false);
                setProcessingTime(shippingData.standard_shipping?.processing_time || '1-2 Business Days');
                setSelectedCouriers(shippingData.standard_shipping?.preferred_couriers || []);
            }

            setPayouts(payoutsRes?.data?.data ?? null);

            const docs = ensureArray<SellerDocument>(sellerDocRes?.data);
            setSellerDocument(docs.length > 0 ? docs[0] : null);

            const profiles = ensureArray<ProfileData>(profileRes?.data);
            if (profiles.length > 0) {
                const p = profiles[0];
                setProfile(p);
                setStripeAccountId(p.stripe_account_id || '');
                setStripeOnboardingCompleted(p.stripe_onboarding_completed || false);
                setShopName(p.shop_name || '');
                setShopDescription(p.shop_description || '');
                setShopLogo(p.shop_logo || null);
                setEditPickupActive(p.local_pickup_active || false);
                setEditPickupStreet(p.pickup_address_street || '');
                setEditPickupCity(p.pickup_address_city || '');
                setEditPickupState(p.pickup_address_state || '');
                setEditPickupZip(p.pickup_address_zip || '');
                setEditPickupHoursStart(p.pickup_hours_start || '');
                setEditPickupHoursEnd(p.pickup_hours_end || '');
                setEditPickupDays(p.pickup_available_days || []);
                setEditDeliveryActive(p.local_delivery_active || false);
                setEditDeliveryRadius(p.delivery_radius || 5);
                setEditDeliveryFee(p.delivery_fee || '0');
                setEditDeliveryTimeframe(p.delivery_timeframe || '');
                setLegalFullName(p.user?.full_name || '');
                setBusinessRegNumber(p.business_reg_number || '');
                setBusinessAddress(p.business_address || '');
            }

            const couponList = ensureArray<CouponItem>(couponsRes?.data);
            setCoupons(couponList);
            setCouponCount(couponList.length);

        } catch (err: any) {
            console.error('Error loading shop dashboard:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load shop data');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setOrdersLoadingMore(false);
        }
    }, [ordersPerPage]);

    const goToPage = useCallback((page: number) => {
        if (page < 1 || page > ordersTotalPages || page === ordersPage) return;
        setOrdersLoadingMore(true);
        loadData(page, false);
    }, [ordersTotalPages, ordersPage, loadData]);

    const goToNextPage = useCallback(() => {
        if (ordersHasNextPage) {
            goToPage(ordersPage + 1);
        }
    }, [ordersHasNextPage, ordersPage, goToPage]);

    const goToPreviousPage = useCallback(() => {
        if (ordersHasPreviousPage) {
            goToPage(ordersPage - 1);
        }
    }, [ordersHasPreviousPage, ordersPage, goToPage]);

    const loadMoreOrders = useCallback(() => {
        if (!ordersHasNextPage || ordersLoadingMore || loading) {
            console.log('⚠️ Cannot load more:', { ordersHasNextPage, ordersLoadingMore, loading });
            return;
        }
        console.log('📄 Loading more orders, page:', ordersPage + 1);
        setOrdersLoadingMore(true);
        loadData(ordersPage + 1, true);
    }, [ordersHasNextPage, ordersLoadingMore, loading, ordersPage, loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            // Reset pagination state
            setOrdersPage(1);
            setOrdersHasNextPage(false);
            setOrdersHasPreviousPage(false);
            setOrdersTotalCount(0);
            setOrdersTotalPages(1);
            // Reload data from page 1
            await loadData(1, false);
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setRefreshing(false);
        }
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

    // ─── Save Shipping Function ──────────────────────────────────────────────
    const handleSaveShipping = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem('vToken');

            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const payload = {
                local_pickup: {
                    active: pickupActive,
                    address_street: pickupStreet,
                    address_city: pickupCity,
                    address_state: pickupState,
                    address_zip: pickupZip,
                    hours_start: pickupHoursStart,
                    hours_end: pickupHoursEnd,
                    available_days: pickupDays,
                },
                local_delivery: {
                    active: deliveryActive,
                    radius: deliveryRadius,
                    fee: parseFloat(deliveryFee) || 0,
                    timeframe: deliveryTimeframe,
                },
                standard_shipping: {
                    active: shippingActive,
                    processing_time: processingTime,
                    preferred_couriers: selectedCouriers,
                },
            };

            const response = await axios.patch(
                `${API_BASE_URL}store/seller-profiles/dashboard/shipping/`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                }
            );

            if (response?.data?.success) {
                toast.show({
                    message: 'Shipping settings updated successfully!',
                    type: 'success',
                    style: 'top',
                });
                await loadData();
            } else {
                toast.show({
                    message: response?.data?.message || 'Failed to update shipping settings',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Error saving shipping:', error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to save shipping settings',
                type: 'error',
                style: 'top',
            });
        } finally {
            setSaving(false);
        }
    };

    // ─── Edit Profile Functions ──────────────────────────────────────────────
    const pickLogo = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                toast.show({ message: 'Gallery permission denied', type: 'error', style: 'top' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
                aspect: [1, 1],
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                setShopLogo(asset.uri);
                setLogoFile(asset);
            }
        } catch (error) {
            toast.show({ message: 'Failed to pick image', type: 'error', style: 'top' });
        }
    };

    const pickDocument = async (type: 'government' | 'license' | 'utility') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];
                if (type === 'government') setGovernmentId(asset);
                else if (type === 'license') setBusinessLicense(asset);
                else setUtilityBill(asset);
            }
        } catch (error) {
            toast.show({ message: 'Failed to pick document', type: 'error', style: 'top' });
        }
    };

    const handleSaveProfile = async () => {
        try {
            setEditingLoading(true);
            const token = await AsyncStorage.getItem('vToken');

            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const formData = new FormData();

            // Branding
            formData.append('shop_name', shopName);
            formData.append('shop_description', shopDescription);

            // Shipping
            formData.append('local_pickup_active', String(editPickupActive));
            formData.append('pickup_address_street', editPickupStreet);
            formData.append('pickup_address_city', editPickupCity);
            formData.append('pickup_address_state', editPickupState);
            formData.append('pickup_address_zip', editPickupZip);
            formData.append('pickup_hours_start', editPickupHoursStart);
            formData.append('pickup_hours_end', editPickupHoursEnd);
            formData.append('pickup_available_days', JSON.stringify(editPickupDays));
            formData.append('local_delivery_active', String(editDeliveryActive));
            formData.append('delivery_radius', String(editDeliveryRadius));
            formData.append('delivery_fee', editDeliveryFee);
            formData.append('delivery_timeframe', editDeliveryTimeframe);

            // Legal
            formData.append('full_name', legalFullName);
            formData.append('business_reg_number', businessRegNumber);
            formData.append('business_address', businessAddress);

            // Logo
            if (logoFile) {
                formData.append('shop_logo', {
                    uri: logoFile.uri,
                    type: logoFile.mimeType || 'image/jpeg',
                    name: logoFile.fileName || 'shop_logo.jpg',
                } as any);
            }

            // Documents
            if (governmentId) {
                formData.append('government_id', {
                    uri: governmentId.uri,
                    type: governmentId.mimeType || 'image/jpeg',
                    name: governmentId.fileName || 'government_id.jpg',
                } as any);
            }
            if (businessLicense) {
                formData.append('business_license', {
                    uri: businessLicense.uri,
                    type: businessLicense.mimeType || 'image/jpeg',
                    name: businessLicense.fileName || 'business_license.jpg',
                } as any);
            }
            if (utilityBill) {
                formData.append('utility_bill', {
                    uri: utilityBill.uri,
                    type: utilityBill.mimeType || 'image/jpeg',
                    name: utilityBill.fileName || 'utility_bill.jpg',
                } as any);
            }

            const response = await axios.patch(
                `${API_BASE_URL}store/seller-profiles/${profile?.id}/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                        Accept: 'application/json',
                    },
                }
            );

            if (response?.data) {
                toast.show({
                    message: 'Profile updated successfully!',
                    type: 'success',
                    style: 'top',
                });
                setEditModalVisible(false);
                loadData();
            } else {
                toast.show({
                    message: response?.data?.message || 'Failed to update profile',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Error saving profile:', error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to save profile',
                type: 'error',
                style: 'top',
            });
        } finally {
            setEditingLoading(false);
        }
    };

    // ── Render Functions ──────────────────────────────────────────────────────
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
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    setSelectedOrder(item);
                    setOrderModalVisible(true);
                }}
            >
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
                                {item.status_display || item.status}
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            {item.tracking_number && (
                                <View className="flex-row items-center gap-1">
                                    <Ionicons name="cube-outline" size={16} color="#2355B6" />
                                    <Text className="text-[11px] text-[#2355B6] font-medium">Track</Text>
                                </View>
                            )}
                            <Text className="text-[#7A8192] text-[13px]">Order #{item.id}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
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
                    <View className="items-center justify-center py-10">
                        <Text className="text-center text-[#7A8192] mt-10">No orders found.</Text>
                    </View>
                ) : null
            }
            ListFooterComponent={
                orders.length > 0 && !loading ? (
                    <PaginationControls />
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

        const togglePickupDay = (day: string) => {
            if (pickupDays.includes(day)) {
                setPickupDays(pickupDays.filter(d => d !== day));
            } else {
                setPickupDays([...pickupDays, day]);
            }
        };

        const toggleCourier = (courier: string) => {
            if (selectedCouriers.includes(courier)) {
                setSelectedCouriers(selectedCouriers.filter(c => c !== courier));
            } else {
                setSelectedCouriers([...selectedCouriers, courier]);
            }
        };

        return (
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1F56D8']} />}
            >
                <View className="mt-4">
                    {/* ─── Local Pickup ─── */}
                    <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-2">
                                <Feather name="map-pin" size={20} color="#2355B6" />
                                <Text className="text-[18px] font-bold text-[#111827]">Local Pickup</Text>
                            </View>
                            <Switch
                                value={pickupActive}
                                onValueChange={setPickupActive}
                                trackColor={{ false: '#D1D5DB', true: '#2355B6' }}
                            />
                        </View>
                        <Text className="text-[14px] text-[#6B7280] mb-4">
                            Buyers come to your location to collect orders
                        </Text>

                        {pickupActive && (
                            <View>
                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">PICKUP ADDRESS *</Text>
                                <TextInput
                                    value={pickupStreet}
                                    onChangeText={setPickupStreet}
                                    placeholder="Street address"
                                    placeholderTextColor="#9CA3AF"
                                    className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 mb-3 text-[16px] text-[#111827]"
                                />
                                <View className="flex-row gap-3 mb-3">
                                    <TextInput
                                        value={pickupCity}
                                        onChangeText={setPickupCity}
                                        placeholder="City"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[16px] text-[#111827]"
                                    />
                                    <TextInput
                                        value={pickupState}
                                        onChangeText={setPickupState}
                                        placeholder="State"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[16px] text-[#111827]"
                                    />
                                    <TextInput
                                        value={pickupZip}
                                        onChangeText={setPickupZip}
                                        placeholder="ZIP"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[16px] text-[#111827]"
                                    />
                                </View>

                                <Text className="text-[14px] font-semibold text-[#374151] mb-2 mt-2">PICKUP HOURS</Text>
                                <View className="flex-row gap-3 mb-3">
                                    <View className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3">
                                        <TextInput
                                            value={pickupHoursStart}
                                            onChangeText={setPickupHoursStart}
                                            placeholder="--:--"
                                            placeholderTextColor="#9CA3AF"
                                            className="text-[16px] text-[#111827]"
                                        />
                                    </View>
                                    <Text className="text-[#6B7280] text-[16px] self-center">to</Text>
                                    <View className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3">
                                        <TextInput
                                            value={pickupHoursEnd}
                                            onChangeText={setPickupHoursEnd}
                                            placeholder="--:--"
                                            placeholderTextColor="#9CA3AF"
                                            className="text-[16px] text-[#111827]"
                                        />
                                    </View>
                                </View>

                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">AVAILABLE DAYS</Text>
                                <View className="flex-row flex-wrap gap-2 mb-2">
                                    {DAYS.map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            onPress={() => togglePickupDay(day)}
                                            className={`px-4 py-2 rounded-full border ${pickupDays.includes(day) ? 'bg-[#2355B6] border-[#2355B6]' : 'bg-white border-[#E5E7EB]'}`}
                                        >
                                            <Text className={pickupDays.includes(day) ? 'text-white font-medium' : 'text-[#6B7280]'}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ─── Local Delivery ─── */}
                    <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-2">
                                <Feather name="truck" size={20} color="#2355B6" />
                                <Text className="text-[18px] font-bold text-[#111827]">Local Delivery</Text>
                            </View>
                            <Switch
                                value={deliveryActive}
                                onValueChange={setDeliveryActive}
                                trackColor={{ false: '#D1D5DB', true: '#2355B6' }}
                            />
                        </View>
                        <Text className="text-[14px] text-[#6B7280] mb-4">
                            You deliver directly to buyers in your area
                        </Text>

                        {deliveryActive && (
                            <View>
                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">DELIVERY RADIUS: {deliveryRadius} miles</Text>
                                <View className="flex-row flex-wrap gap-2 mb-4">
                                    {RADIUS_OPTIONS.map((radius) => (
                                        <TouchableOpacity
                                            key={radius}
                                            onPress={() => setDeliveryRadius(radius)}
                                            className={`px-4 py-2 rounded-full border ${deliveryRadius === radius ? 'bg-[#2355B6] border-[#2355B6]' : 'bg-white border-[#E5E7EB]'}`}
                                        >
                                            <Text className={deliveryRadius === radius ? 'text-white font-medium' : 'text-[#6B7280]'}>
                                                {radius} mile{radius > 1 ? 's' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">DELIVERY FEE ($)</Text>
                                <View className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 mb-3">
                                    <View className="flex-row items-center">
                                        <Text className="text-[#6B7280] font-semibold mr-2">$</Text>
                                        <TextInput
                                            value={deliveryFee}
                                            onChangeText={setDeliveryFee}
                                            placeholder="0"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="numeric"
                                            className="flex-1 text-[16px] text-[#111827]"
                                        />
                                    </View>
                                </View>
                                <Text className="text-[12px] text-[#9CA3AF] -mt-2 mb-3">Enter 0 for free local delivery</Text>

                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">DELIVERY TIMEFRAME</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {DELIVERY_TIMEFRAMES.map((timeframe) => (
                                        <TouchableOpacity
                                            key={timeframe}
                                            onPress={() => setDeliveryTimeframe(timeframe)}
                                            className={`px-4 py-2 rounded-full border ${deliveryTimeframe === timeframe ? 'bg-[#2355B6] border-[#2355B6]' : 'bg-white border-[#E5E7EB]'}`}
                                        >
                                            <Text className={deliveryTimeframe === timeframe ? 'text-white font-medium' : 'text-[#6B7280]'}>
                                                {timeframe}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ─── Standard Shipping ─── */}
                    <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-2">
                                <Feather name="package" size={20} color="#2355B6" />
                                <Text className="text-[18px] font-bold text-[#111827]">Standard Shipping</Text>
                            </View>
                            <Switch
                                value={shippingActive}
                                onValueChange={setShippingActive}
                                trackColor={{ false: '#D1D5DB', true: '#2355B6' }}
                            />
                        </View>
                        <Text className="text-[14px] text-[#6B7280] mb-4">
                            Ship via courier to buyers nationwide
                        </Text>

                        {shippingActive && (
                            <View>
                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">ORDER PROCESSING TIME</Text>
                                <View className="flex-row flex-wrap gap-2 mb-4">
                                    {PROCESSING_TIMES.map((time) => (
                                        <TouchableOpacity
                                            key={time}
                                            onPress={() => setProcessingTime(time)}
                                            className={`px-4 py-2 rounded-full border ${processingTime === time ? 'bg-[#2355B6] border-[#2355B6]' : 'bg-white border-[#E5E7EB]'}`}
                                        >
                                            <Text className={processingTime === time ? 'text-white font-medium' : 'text-[#6B7280]'}>
                                                {time}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text className="text-[14px] font-semibold text-[#374151] mb-2">PREFERRED COURIERS</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {COURIERS.map((courier) => (
                                        <TouchableOpacity
                                            key={courier}
                                            onPress={() => toggleCourier(courier)}
                                            className={`px-4 py-2 rounded-full border ${selectedCouriers.includes(courier) ? 'bg-[#2355B6] border-[#2355B6]' : 'bg-white border-[#E5E7EB]'}`}
                                        >
                                            <Text className={selectedCouriers.includes(courier) ? 'text-white font-medium' : 'text-[#6B7280]'}>
                                                {courier}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ─── Save Button ─── */}
                    <TouchableOpacity
                        onPress={handleSaveShipping}
                        disabled={saving}
                        className="bg-[#1F56D8] rounded-2xl py-4 items-center justify-center mb-6"
                        style={{ opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white text-[16px] font-bold">Save Shipping Settings</Text>
                        )}
                    </TouchableOpacity>
                </View>
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

        const hasStripeAccount = !!stripeAccountId;
        const isOnboardingComplete = stripeOnboardingCompleted;

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* ─── Stripe Connect Card ─── */}
                <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                            <Feather name="credit-card" size={20} color="#2355B6" />
                            <Text className="text-[18px] font-bold text-[#111827]">Payment (Stripe)</Text>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${hasStripeAccount ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <Text className={`text-[12px] font-semibold ${hasStripeAccount ? 'text-green-700' : 'text-yellow-700'}`}>
                                {hasStripeAccount ? (isOnboardingComplete ? 'Active' : 'Pending') : 'Not Connected'}
                            </Text>
                        </View>
                    </View>

                    {hasStripeAccount ? (
                        <View>
                            <Text className="text-[14px] text-[#6B7280]">ACCOUNT: {stripeAccountId}</Text>
                            <View className="flex-row items-center mt-1">
                                <Text className="text-[14px] text-[#6B7280] mr-2">ONBOARDING:</Text>
                                <Text className={`text-[14px] font-semibold ${isOnboardingComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                                    {isOnboardingComplete ? '✓ Complete' : '⚠️ Incomplete'}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text className="text-[14px] text-[#6B7280] mb-3">
                                Link your bank account via Stripe Connect to start receiving payouts directly.
                                Takes less than 2 minutes.
                            </Text>
                            <TouchableOpacity
                                onPress={handleConnectStripe}
                                disabled={stripeConnectLoading}
                                className={`bg-[#2355B6] rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 ${stripeConnectLoading ? 'opacity-70' : ''}`}
                            >
                                {stripeConnectLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="link-outline" size={20} color="#FFFFFF" />
                                        <Text className="text-white font-semibold">Connect Stripe Account</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ─── Balance Cards ─── */}
                <View className="flex-row flex-wrap justify-between">
                    <StatCard label="Available Balance" value={`$${payouts.available_balance?.toFixed(2) ?? '0.00'}`} icon="wallet" color="#16A34A" />
                    <StatCard label="Pending Balance" value={`$${payouts.pending_balance?.toFixed(2) ?? '0.00'}`} icon="clock" color="#F59E0B" />
                    <StatCard label="Total Earned" value={`$${payouts.total_earned?.toFixed(2) ?? '0.00'}`} icon="dollar-sign" color="#16A34A" />
                    <StatCard label="Total Withdrawn" value={`$${payouts.total_withdrawn?.toFixed(2) ?? '0.00'}`} icon="arrow-up" color="#EF4444" />
                </View>

                {/* ─── Withdraw Section ─── */}
                <View className="bg-white rounded-3xl p-5 mt-2" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                    <Text className="text-[16px] font-bold text-[#111827] mb-3">Withdraw Your Earnings</Text>
                    <Text className="text-[13px] text-[#6B7280] mb-4">
                        Payouts are processed via Stripe Connect directly to your linked bank account. Minimum payout is $10.00.
                    </Text>

                    {hasStripeAccount && isOnboardingComplete ? (
                        <TouchableOpacity
                            onPress={handleManageBank}
                            className="bg-[#2355B6] rounded-xl py-3 px-4 flex-row items-center justify-center gap-2"
                        >
                            <Ionicons name="bank-outline" size={20} color="#FFFFFF" />
                            <Text className="text-white font-semibold">Manage Bank</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleConnectStripe}
                            disabled={stripeConnectLoading}
                            className={`bg-[#E5E7EB] rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 ${stripeConnectLoading ? 'opacity-70' : ''}`}
                        >
                            {stripeConnectLoading ? (
                                <ActivityIndicator size="small" color="#6B7280" />
                            ) : (
                                <>
                                    <Ionicons name="link-outline" size={20} color="#6B7280" />
                                    <Text className="text-[#6B7280] font-semibold">Connect Stripe First</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* ─── Payout History ─── */}
                {payouts.payout_history && payouts.payout_history.length > 0 ? (
                    <View className="bg-white rounded-3xl p-5 mt-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <Text className="text-[18px] font-bold text-[#111827] mb-4">Payout History</Text>
                        {payouts.payout_history.map((item: any, index: number) => (
                            <View key={index} className="flex-row justify-between py-3 border-b border-[#E5E7EB] last:border-0">
                                <Text className="text-[14px] text-[#7A8192]">{item.date || 'N/A'}</Text>
                                <Text className="text-[14px] font-semibold text-[#111827]">${item.amount?.toFixed(2) || '0.00'}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="bg-white rounded-3xl p-5 mt-4 items-center" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                        <Text className="text-[#7A8192] text-[14px]">No payout history yet.</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // ─── Seller Document Tab ──
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
                        {/* Payout Summary */}
                        <View className="flex-row flex-wrap justify-between mb-4">
                            <View className="w-[48%] bg-[#F8FAFC] rounded-xl p-3">
                                <Text className="text-[12px] text-[#7A8192]">Available Balance</Text>
                                <Text className="text-[18px] font-bold text-[#16A34A]">${profile.available_balance}</Text>
                            </View>
                            <View className="w-[48%] bg-[#F8FAFC] rounded-xl p-3">
                                <Text className="text-[12px] text-[#7A8192]">Pending Balance</Text>
                                <Text className="text-[18px] font-bold text-[#F59E0B]">${profile.pending_balance}</Text>
                            </View>
                            <View className="w-[48%] bg-[#F8FAFC] rounded-xl p-3 mt-2">
                                <Text className="text-[12px] text-[#7A8192]">Total Earned</Text>
                                <Text className="text-[18px] font-bold text-[#16A34A]">${profile.total_earnings}</Text>
                            </View>
                            <View className="w-[48%] bg-[#F8FAFC] rounded-xl p-3 mt-2">
                                <Text className="text-[12px] text-[#7A8192]">Total Withdrawn</Text>
                                <Text className="text-[18px] font-bold text-[#EF4444]">${profile.total_withdrawn}</Text>
                            </View>
                        </View>

                        {/* Local Pickup */}
                        <View className="bg-[#F8FAFC] rounded-xl p-3 mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center gap-2">
                                    <Feather name="map-pin" size={16} color="#2355B6" />
                                    <Text className="text-[16px] font-semibold text-[#111827]">Local Pickup</Text>
                                </View>
                                <View className={`px-3 py-1 rounded-full ${profile.local_pickup_active ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Text className={`text-[12px] font-semibold ${profile.local_pickup_active ? 'text-green-700' : 'text-red-700'}`}>
                                        {profile.local_pickup_active ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>
                            {profile.local_pickup_active && (
                                <View>
                                    <Text className="text-[14px] text-[#6B7280]">ADDRESS: {profile.pickup_address_street}, {profile.pickup_address_city}, {profile.pickup_address_zip}</Text>
                                    <Text className="text-[14px] text-[#6B7280]">HOURS: {profile.pickup_hours_start} – {profile.pickup_hours_end}</Text>
                                    <Text className="text-[14px] text-[#6B7280]">DAYS: {profile.pickup_available_days?.join(', ')}</Text>
                                </View>
                            )}
                        </View>

                        {/* Local Delivery */}
                        <View className="bg-[#F8FAFC] rounded-xl p-3 mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center gap-2">
                                    <Feather name="truck" size={16} color="#2355B6" />
                                    <Text className="text-[16px] font-semibold text-[#111827]">Local Delivery</Text>
                                </View>
                                <View className={`px-3 py-1 rounded-full ${profile.local_delivery_active ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Text className={`text-[12px] font-semibold ${profile.local_delivery_active ? 'text-green-700' : 'text-red-700'}`}>
                                        {profile.local_delivery_active ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>
                            {profile.local_delivery_active && (
                                <View>
                                    <Text className="text-[14px] text-[#6B7280]">RADIUS: {profile.delivery_radius} miles</Text>
                                    <Text className="text-[14px] text-[#6B7280]">FEE: ${profile.delivery_fee}</Text>
                                    <Text className="text-[14px] text-[#6B7280]">TIMEFRAME: {profile.delivery_timeframe}</Text>
                                </View>
                            )}
                        </View>

                        {/* Standard Shipping */}
                        <View className="bg-[#F8FAFC] rounded-xl p-3 mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center gap-2">
                                    <Feather name="package" size={16} color="#2355B6" />
                                    <Text className="text-[16px] font-semibold text-[#111827]">Standard Shipping</Text>
                                </View>
                                <View className={`px-3 py-1 rounded-full ${profile.standard_shipping_active ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Text className={`text-[12px] font-semibold ${profile.standard_shipping_active ? 'text-green-700' : 'text-red-700'}`}>
                                        {profile.standard_shipping_active ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>
                            {profile.standard_shipping_active && (
                                <View>
                                    <Text className="text-[14px] text-[#6B7280]">PROCESSING: {profile.order_processing_time}</Text>
                                    <Text className="text-[14px] text-[#6B7280]">COURIERS: {profile.preferred_couriers?.join(', ')}</Text>
                                </View>
                            )}
                        </View>

                        {/* Payment (Stripe) */}
                        <View className="bg-[#F8FAFC] rounded-xl p-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center gap-2">
                                    <Feather name="credit-card" size={16} color="#2355B6" />
                                    <Text className="text-[16px] font-semibold text-[#111827]">Payment (Stripe)</Text>
                                </View>
                                <View className={`px-3 py-1 rounded-full ${profile.stripe_account_id ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Text className={`text-[12px] font-semibold ${profile.stripe_account_id ? 'text-green-700' : 'text-red-700'}`}>
                                        {profile.stripe_account_id ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>
                            {profile.stripe_account_id && (
                                <View>
                                    <Text className="text-[14px] text-[#6B7280]">ACCOUNT: {profile.stripe_account_id}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <Text className="text-[14px] text-[#6B7280] mr-2">ONBOARDING:</Text>
                                        <Text className={`text-[14px] font-semibold ${profile.stripe_onboarding_completed ? 'text-green-700' : 'text-red-700'}`}>
                                            {profile.stripe_onboarding_completed ? '✓ Complete' : '× Incomplete'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => setEditModalVisible(true)}
                    className="bg-[#1F56D8] rounded-2xl py-4 items-center justify-center"
                >
                    <Text className="text-white text-[16px] font-bold">Edit Profile</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    // ─── Edit Profile Modal ──
    const renderEditProfileModal = () => (
        <Modal
            visible={editModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-[#F9F9FB] rounded-t-3xl max-h-[92%]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#E5E7EB] bg-white rounded-t-3xl">
                        <Text className="text-[20px] font-bold text-[#111827]">Edit Shop Profile</Text>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row bg-white px-5 py-3 border-b border-[#E5E7EB]">
                        {[
                            { key: 'branding', label: 'Shop Branding' },
                            { key: 'shipping', label: 'Shipping Settings' },
                            { key: 'legal', label: 'Legal & Verification' },
                        ].map((tab) => (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setEditTab(tab.key as any)}
                                className={`px-4 py-2 rounded-full mr-2 ${editTab === tab.key ? 'bg-[#1F56D8]' : 'bg-gray-100'}`}
                            >
                                <Text className={editTab === tab.key ? 'text-white font-semibold' : 'text-[#6B7280]'}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView className="px-5 pt-4 pb-8" showsVerticalScrollIndicator={false}>
                        {/* ─── Shop Branding ─── */}
                        {editTab === 'branding' && (
                            <View>
                                <FieldLabel>SHOP LOGO</FieldLabel>
                                <TouchableOpacity
                                    onPress={pickLogo}
                                    className="w-32 h-32 rounded-full bg-[#F3F4F6] border-2 border-dashed border-[#D1D5DB] items-center justify-center self-center mb-4 overflow-hidden"
                                >
                                    {shopLogo ? (
                                        <Image source={{ uri: shopLogo }} className="w-32 h-32 rounded-full" />
                                    ) : (
                                        <View className="items-center">
                                            <Feather name="camera" size={32} color="#9CA3AF" />
                                            <Text className="text-[12px] text-[#9CA3AF] text-center mt-1">Upload logo</Text>
                                            <Text className="text-[10px] text-[#9CA3AF] text-center">PNG, JPG up to 2MB</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <FieldLabel>SHOP NAME *</FieldLabel>
                                <TextInput
                                    value={shopName}
                                    onChangeText={setShopName}
                                    placeholder="Enter shop name"
                                    placeholderTextColor="#9CA3AF"
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827]"
                                />

                                <FieldLabel>SHOP DESCRIPTION</FieldLabel>
                                <TextInput
                                    value={shopDescription}
                                    onChangeText={setShopDescription}
                                    placeholder="Describe your shop..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827] min-h-[100px]"
                                />
                            </View>
                        )}

                        {/* ─── Shipping Settings ─── */}
                        {editTab === 'shipping' && (
                            <View>
                                {/* Enable Local Pickup */}
                                <View className="bg-white rounded-xl p-4 mb-4 border border-[#E5E7EB]">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-[16px] font-semibold text-[#111827]">Enable Local Pickup</Text>
                                        <Switch
                                            value={editPickupActive}
                                            onValueChange={setEditPickupActive}
                                            trackColor={{ false: '#D1D5DB', true: '#2355B6' }}
                                        />
                                    </View>
                                    {editPickupActive && (
                                        <View>
                                            <Text className="text-[14px] font-semibold text-[#374151] mb-2">PICKUP ADDRESS</Text>
                                            <TextInput
                                                value={editPickupStreet}
                                                onChangeText={setEditPickupStreet}
                                                placeholder="Street address"
                                                placeholderTextColor="#9CA3AF"
                                                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 mb-2 text-[14px] text-[#111827]"
                                            />
                                            <View className="flex-row gap-2 mb-2">
                                                <TextInput
                                                    value={editPickupCity}
                                                    onChangeText={setEditPickupCity}
                                                    placeholder="City"
                                                    placeholderTextColor="#9CA3AF"
                                                    className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                                />
                                                <TextInput
                                                    value={editPickupState}
                                                    onChangeText={setEditPickupState}
                                                    placeholder="State"
                                                    placeholderTextColor="#9CA3AF"
                                                    className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                                />
                                                <TextInput
                                                    value={editPickupZip}
                                                    onChangeText={setEditPickupZip}
                                                    placeholder="ZIP"
                                                    placeholderTextColor="#9CA3AF"
                                                    keyboardType="numeric"
                                                    className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                                />
                                            </View>
                                            <Text className="text-[14px] font-semibold text-[#374151] mb-2">HOURS START / END</Text>
                                            <View className="flex-row gap-2">
                                                <TextInput
                                                    value={editPickupHoursStart}
                                                    onChangeText={setEditPickupHoursStart}
                                                    placeholder="HH:MM AM"
                                                    placeholderTextColor="#9CA3AF"
                                                    className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                                />
                                                <TextInput
                                                    value={editPickupHoursEnd}
                                                    onChangeText={setEditPickupHoursEnd}
                                                    placeholder="HH:MM PM"
                                                    placeholderTextColor="#9CA3AF"
                                                    className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                                />
                                            </View>
                                            <Text className="text-[14px] font-semibold text-[#374151] mb-2 mt-2">AVAILABLE DAYS</Text>
                                            <View className="flex-row flex-wrap gap-2">
                                                {DAYS.map((day) => (
                                                    <TouchableOpacity
                                                        key={day}
                                                        onPress={() => {
                                                            if (editPickupDays.includes(day)) {
                                                                setEditPickupDays(editPickupDays.filter(d => d !== day));
                                                            } else {
                                                                setEditPickupDays([...editPickupDays, day]);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full border ${editPickupDays.includes(day) ? 'bg-[#2355B6] border-[#2355B6]' : 'bg-white border-[#E5E7EB]'}`}
                                                    >
                                                        <Text className={editPickupDays.includes(day) ? 'text-white font-medium text-[12px]' : 'text-[#6B7280] text-[12px]'}>
                                                            {day}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Enable Local Delivery */}
                                <View className="bg-white rounded-xl p-4 mb-4 border border-[#E5E7EB]">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-[16px] font-semibold text-[#111827]">Enable Local Delivery</Text>
                                        <Switch
                                            value={editDeliveryActive}
                                            onValueChange={setEditDeliveryActive}
                                            trackColor={{ false: '#D1D5DB', true: '#2355B6' }}
                                        />
                                    </View>
                                    {editDeliveryActive && (
                                        <View>
                                            <Text className="text-[14px] font-semibold text-[#374151] mb-2">DELIVERY RADIUS (MILES)</Text>
                                            <TextInput
                                                value={String(editDeliveryRadius)}
                                                onChangeText={(t) => setEditDeliveryRadius(Number(t) || 0)}
                                                placeholder="5"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 mb-2 text-[14px] text-[#111827]"
                                            />
                                            <Text className="text-[14px] font-semibold text-[#374151] mb-2">DELIVERY FEE ($)</Text>
                                            <TextInput
                                                value={editDeliveryFee}
                                                onChangeText={setEditDeliveryFee}
                                                placeholder="0.00"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Standard Shipping */}
                                <View className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-[16px] font-semibold text-[#111827]">Standard Shipping</Text>
                                        <Switch
                                            value={shippingActive}
                                            onValueChange={setShippingActive}
                                            trackColor={{ false: '#D1D5DB', true: '#2355B6' }}
                                        />
                                    </View>
                                    {shippingActive && (
                                        <View>
                                            <Text className="text-[14px] font-semibold text-[#374151] mb-2">PROCESSING TIME</Text>
                                            <TextInput
                                                value={processingTime}
                                                onChangeText={setProcessingTime}
                                                placeholder="1-2 Business Days"
                                                placeholderTextColor="#9CA3AF"
                                                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2 text-[14px] text-[#111827]"
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* ─── Legal & Verification ─── */}
                        {editTab === 'legal' && (
                            <View>
                                <FieldLabel>LEGAL FULL NAME</FieldLabel>
                                <TextInput
                                    value={legalFullName}
                                    onChangeText={setLegalFullName}
                                    placeholder="e.g. Abdullah Al Mamun"
                                    placeholderTextColor="#9CA3AF"
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827]"
                                />

                                <FieldLabel>BUSINESS REGISTRATION NUMBER</FieldLabel>
                                <TextInput
                                    value={businessRegNumber}
                                    onChangeText={setBusinessRegNumber}
                                    placeholder="e.g. REG-998877"
                                    placeholderTextColor="#9CA3AF"
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827]"
                                />

                                <FieldLabel>BUSINESS ADDRESS</FieldLabel>
                                <TextInput
                                    value={businessAddress}
                                    onChangeText={setBusinessAddress}
                                    placeholder="e.g. Sector 7, Uttara, Dhaka"
                                    placeholderTextColor="#9CA3AF"
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 mb-4 text-[16px] text-[#111827]"
                                />

                                <FieldLabel>GOVERNMENT ID</FieldLabel>
                                <TouchableOpacity
                                    onPress={() => pickDocument('government')}
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 mb-4 items-center"
                                >
                                    <Feather name={governmentId ? 'check-circle' : 'upload-cloud'} size={24} color={governmentId ? '#16A34A' : '#9CA3AF'} />
                                    <Text className={governmentId ? 'text-[#16A34A] mt-1' : 'text-[#9CA3AF] mt-1'}>
                                        {governmentId ? 'File uploaded' : 'Click to upload'}
                                    </Text>
                                </TouchableOpacity>

                                <FieldLabel>BUSINESS LICENSE</FieldLabel>
                                <TouchableOpacity
                                    onPress={() => pickDocument('license')}
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 mb-4 items-center"
                                >
                                    <Feather name={businessLicense ? 'check-circle' : 'upload-cloud'} size={24} color={businessLicense ? '#16A34A' : '#9CA3AF'} />
                                    <Text className={businessLicense ? 'text-[#16A34A] mt-1' : 'text-[#9CA3AF] mt-1'}>
                                        {businessLicense ? 'File uploaded' : 'Click to upload'}
                                    </Text>
                                </TouchableOpacity>

                                <FieldLabel>UTILITY BILL</FieldLabel>
                                <TouchableOpacity
                                    onPress={() => pickDocument('utility')}
                                    className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 mb-4 items-center"
                                >
                                    <Feather name={utilityBill ? 'check-circle' : 'upload-cloud'} size={24} color={utilityBill ? '#16A34A' : '#9CA3AF'} />
                                    <Text className={utilityBill ? 'text-[#16A34A] mt-1' : 'text-[#9CA3AF] mt-1'}>
                                        {utilityBill ? 'File uploaded' : 'Click to upload'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View className="flex-row gap-3 px-5 py-4 bg-white border-t border-[#E5E7EB] rounded-b-3xl">
                        <TouchableOpacity
                            onPress={() => setEditModalVisible(false)}
                            className="flex-1 py-3 rounded-xl border border-[#D1D5DB] items-center"
                        >
                            <Text className="text-[#6B7280] font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSaveProfile}
                            disabled={editingLoading}
                            className="flex-1 py-3 rounded-xl bg-[#1F56D8] items-center"
                            style={{ opacity: editingLoading ? 0.7 : 1 }}
                        >
                            {editingLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // ─── Coupons Tab ──
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

        const label = isProductsTab ? 'Add Product' : 'Add Coupon';
        const iconName = isProductsTab ? 'add' : 'pricetag-outline';

        return (
            <Pressable
                style={{
                    position: 'absolute',
                    bottom: 30,
                    right: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                onPress={() => {
                    if (isCouponTab) {
                        setCouponModalVisible(true);
                    } else if (isProductsTab) {
                        navigation.navigate('AddProduct');
                    }
                }}
            >

                {/* FAB Button */}
                <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#1F56D8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#1F56D8',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    // elevation: 6,
                }}>
                    <Ionicons name={iconName} size={28} color="#FFFFFF" />
                </View>

                {/* Label */}
                <View style={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    <Text style={{
                        color: '#1F56D8',
                        fontSize: 12,
                        fontWeight: '700',
                        letterSpacing: 0.3,
                    }}>
                        {label}
                    </Text>
                </View>
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
        <View className="bg-[#F9F9FB] flex-1">
            <StatusBar style="auto" />
            <View className="px-5 flex-1">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold">My Shop</Text>
                </View>

                {renderContent()}
                {renderFAB()}

                <OrderDetailsModal
                    visible={orderModalVisible}
                    onClose={() => {
                        setOrderModalVisible(false);
                        setSelectedOrder(null);
                    }}
                    order={selectedOrder}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onAddTracking={handleAddTracking}
                    onUpdateTracking={handleUpdateTracking}
                />

                {/* ─── Stripe Connect WebView Modal ─── */}
                <Modal
                    visible={stripeModalVisible}
                    animationType="slide"
                    onRequestClose={() => setStripeModalVisible(false)}
                    presentationStyle="fullScreen"
                >
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Connect Stripe Account</Text>
                            <TouchableOpacity onPress={() => setStripeModalVisible(false)} style={{ padding: 8 }}>
                                <Ionicons name="close" size={28} color="#1F2937" />
                            </TouchableOpacity>
                        </View>
                        <WebView
                            source={{ uri: stripeOnboardingUrl }}
                            style={{ flex: 1 }}
                            onNavigationStateChange={handleWebViewNavigation}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="large" color="#2355B6" />
                                    <Text style={{ marginTop: 12, fontSize: 16, color: '#6B7280' }}>Loading Stripe...</Text>
                                </View>
                            )}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                        />
                    </SafeAreaView>
                </Modal>

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

                {/* Edit Profile Modal */}
                {renderEditProfileModal()}

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
        </View>
    );
};

export default ShopDashboard;