// screens/MyOrders.tsx
import { IPA_BASE } from '@env';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { Toast, useToast } from '../../components/useToost';

const API_BASE_URL = IPA_BASE;

// The reviews API returns no author on a review and has no "my reviews" route,
// so there is no way to ask the server which reviews belong to this buyer.
// We remember the ids we created and match them back when listing.
const MY_REVIEW_IDS_KEY = 'myReviewIds:v1';

type ProductReview = {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    updated_at: string;
};

/** productId -> reviewId, persisted so the Reviews tab survives a restart. */
type MyReviewIndex = Record<string, number>;

const loadMyReviewIndex = async (): Promise<MyReviewIndex> => {
    try {
        const raw = await AsyncStorage.getItem(MY_REVIEW_IDS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

// API sends "2026-06-10 03:18:42"; iOS will not parse that with the space.
const formatReviewDate = (raw: string) => {
    if (!raw) return '';
    const date = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const rememberMyReview = async (productId: number, reviewId: number) => {
    try {
        const index = await loadMyReviewIndex();
        index[String(productId)] = reviewId;
        await AsyncStorage.setItem(MY_REVIEW_IDS_KEY, JSON.stringify(index));
    } catch (e) {
        console.error('Could not persist review id:', e);
    }
};

type OrderProduct = {
    id: number;
    seller_shop: string;
    category_name: string;
    title: string;
    description: string;
    brand: string;
    price: string;
    original_price: string | null;
    currency: string;
    main_image: string;
    discount_percentage: number | null;
    rating: number;
    review_count: number;
    listing_details: {
        id: number;
        platform_name: string;
        price: string;
        total_price: number;
        free_shipping: boolean;
    };
};

type OrderItem = {
    id: number;
    buyer_email: string;
    seller_shop: string;
    seller_product: OrderProduct;
    quantity: number;
    unit_price: string;
    total_price: string;
    status: string;
    status_display: string;
    tracking_number: string;
    courier_name: string | null;
    order_number: string;
    created_at: string;
    updated_at: string;
    shipping_address: string;
};

type OrderSummary = {
    lifetime_savings: number;
    total_orders: number;
    delivered_text: string;
    pending_action_count: number;
    review_count: number;
    plan_name: string;
    plan_status: string;
};

type PaginationData = {
    total_count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    next_page: number | null;
    prev_page: number | null;
};

const MyOrders = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [summary, setSummary] = useState<OrderSummary | null>(null);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [disputeModalVisible, setDisputeModalVisible] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeDescription, setDisputeDescription] = useState('');
    const [disputeEvidence, setDisputeEvidence] = useState<any>(null);

    // ─── Review State ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'orders' | 'reviews'>('orders');
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    // Order being reviewed. Separate from selectedOrder so the Reviews tab can
    // open the modal without going through the order detail sheet.
    const [reviewTarget, setReviewTarget] = useState<OrderItem | null>(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    // Reviews already written, straight from store/reviews/.
    const [myReviewsList, setMyReviewsList] = useState<ProductReview[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const planName = subscription?.plan_name;
    const planStatus = subscription?.status;

    const STATUS_OPTIONS = ['All', 'Pending', 'Accepted', 'Shipped', 'Completed', 'Cancelled', 'Refunded'];


    const fetchSubscriptionStatus = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('vToken');
            if (!token) return;

            const response = await axios.get(`${API_BASE_URL}payment/subscription/status/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (response.data?.success) {
                setSubscription(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        }
    }, []);




    const fetchOrders = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('vToken');
            if (!token) return;

            const response = await axios.get(`${API_BASE_URL}store/orders/my-orders/?page=${page}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            console.log('📦 Orders Response:', response.data);

            if (response.data?.success) {
                setOrders(response.data.data.results || []);
                setSummary(response.data.data.summary || null);
                setPagination(response.data.pagination || null);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.show({
                message: 'Failed to load orders',
                type: 'error',
                style: 'top',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
            fetchSubscriptionStatus();
        }, [fetchOrders])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const goToPage = (page: number) => {
        if (pagination && page >= 1 && page <= pagination.total_pages) {
            fetchOrders(page);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: '#F59E0B',
            CONFIRMED: '#3B82F6',
            ACCEPTED: '#3B82F6',
            SHIPPED: '#8B5CF6',
            COMPLETED: '#10B981',
            CANCELLED: '#EF4444',
            REFUNDED: '#6B7280',
        };
        return colors[status] || '#6B7280';
    };

    const getStatusBg = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: '#FEF3C7',
            CONFIRMED: '#DBEAFE',
            ACCEPTED: '#DBEAFE',
            SHIPPED: '#EDE9FE',
            COMPLETED: '#D1FAE5',
            CANCELLED: '#FEE2E2',
            REFUNDED: '#F3F4F6',
        };
        return colors[status] || '#F3F4F6';
    };

    const parseShippingAddress = (addressString: string) => {
        try {
            if (!addressString) return null;
            return typeof addressString === 'string' ? JSON.parse(addressString) : addressString;
        } catch {
            return null;
        }
    };

    const handleAcceptDelivery = async (orderId: number) => {
        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('vToken');
            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}store/orders/${orderId}/accept-order/`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('✅ Accept delivery response:', JSON.stringify(response.data));

            if (response.data?.success) {
                toast.show({
                    message: 'Delivery confirmed successfully!',
                    type: 'success',
                    style: 'top',
                });
                setModalVisible(false);
                // Both lists have to be refreshed: fetchOrders feeds Order
                // History, loadMyReviews feeds the Reviews tab. Refreshing only
                // the first left the confirmed order out of Reviews entirely.
                await Promise.all([fetchOrders(), loadMyReviews()]);
            } else {
                // Previously a success:false response did nothing at all, so a
                // rejected confirmation looked identical to a working one.
                toast.show({
                    message: response.data?.message || 'Could not confirm delivery',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Accept delivery error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to confirm delivery',
                type: 'error',
                style: 'top',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Reviewable orders are gathered across every page, not just the page the
    // Order History tab happens to be showing.
    const [completedOrders, setCompletedOrders] = useState<OrderItem[]>([]);

    /** Walks the paginated orders endpoint and returns everything. */
    const fetchAllOrders = useCallback(async (): Promise<OrderItem[]> => {
        const token = await AsyncStorage.getItem('vToken');
        if (!token) return [];

        const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
        const first = await axios.get(`${API_BASE_URL}store/orders/my-orders/?page=1`, { headers });

        const all: OrderItem[] = first.data?.data?.results ?? [];
        const totalPages = first.data?.pagination?.total_pages ?? 1;

        if (totalPages > 1) {
            const rest = await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, i) =>
                    axios
                        .get(`${API_BASE_URL}store/orders/my-orders/?page=${i + 2}`, { headers })
                        .then((res) => (res.data?.data?.results ?? []) as OrderItem[])
                        .catch(() => [] as OrderItem[])
                )
            );
            rest.forEach((page) => all.push(...page));
        }

        return all;
    }, []);

    // ─── Load My Reviews ───────────────────────────────────────────────────
    //     The reviews the buyer has already written, plus the delivered orders
    //     that still need one.
    const loadMyReviews = useCallback(async () => {
        try {
            setReviewsLoading(true);
            const token = await AsyncStorage.getItem('vToken');
            if (!token) return;

            const [reviewsRes, allOrders] = await Promise.all([
                axios.get(`${API_BASE_URL}store/reviews/`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                }),
                fetchAllOrders(),
            ]);

            const list: ProductReview[] = reviewsRes.data?.data?.reviews ?? [];
            console.log('⭐ Reviews Response:', JSON.stringify(reviewsRes.data?.data));
            setMyReviewsList(list);

            // Delivered orders are the only ones a review can be written for.
            setCompletedOrders(
                allOrders.filter((order) =>
                    ['COMPLETED', 'DELIVERED'].includes(order.status?.toUpperCase())
                )
            );
        } catch (error: any) {
            console.error('Error loading reviews:', error?.response?.data || error);
        } finally {
            setReviewsLoading(false);
        }
    }, [fetchAllOrders]);

    useEffect(() => {
        loadMyReviews();
    }, [loadMyReviews]);

    // ─── Submit Review ─────────────────────────────────────────────────────
    const handleSubmitReview = async () => {
        if (reviewRating < 1) {
            toast.show({ message: 'Please select a star rating', type: 'error', style: 'top' });
            return;
        }

        const target = reviewTarget ?? selectedOrder;
        const productId = target?.seller_product?.id;
        const orderId = target?.id;

        if (!productId || !orderId) {
            toast.show({ message: 'Could not identify the product', type: 'error', style: 'top' });
            return;
        }

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('vToken');
            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            // Sent as multipart to match the documented Postman request - the
            // dispute endpoint on this same API behaves the same way.
            const formData = new FormData();
            formData.append('product_id', String(productId));
            formData.append('rating', String(reviewRating));
            formData.append('comment', reviewComment.trim());

            const response = await axios.post(
                `${API_BASE_URL}store/reviews/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            

            if (response.data?.success) {
                const created: ProductReview | undefined = response.data?.data;

                toast.show({
                    message: 'Thanks! Your review has been posted.',
                    type: 'success',
                    style: 'top',
                });

                if (created?.id) {
                    setMyReviewsList((prev) => [created, ...prev]);
                }
                // Refetch so the new review and the order's changed state come
                // from the server rather than being guessed at locally.
                loadMyReviews();

                setReviewModalVisible(false);
                setReviewTarget(null);
                setReviewRating(0);
                setReviewComment('');
            } else {
                toast.show({
                    message: response.data?.message || 'Failed to submit review',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('Submit review error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to submit review',
                type: 'error',
                style: 'top',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenDispute = async () => {
        if (!disputeReason.trim()) {
            toast.show({ message: 'Please enter a reason', type: 'error', style: 'top' });
            return;
        }
        if (!disputeDescription.trim()) {
            toast.show({ message: 'Please enter description', type: 'error', style: 'top' });
            return;
        }

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('vToken');
            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const formData = new FormData();
            formData.append('reason', disputeReason.trim());
            formData.append('description', disputeDescription.trim());
            if (disputeEvidence) {
                formData.append('evidence_image', {
                    uri: disputeEvidence.uri,
                    type: disputeEvidence.mimeType || 'image/jpeg',
                    name: disputeEvidence.fileName || 'evidence.jpg',
                } as any);
            }

            const response = await axios.post(
                `${API_BASE_URL}store/orders/${selectedOrder?.id}/open-dispute/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                        Accept: 'application/json',
                    },
                }
            );

            if (response.data?.success) {
                toast.show({
                    message: 'Dispute opened successfully!',
                    type: 'success',
                    style: 'top',
                });
                setDisputeModalVisible(false);
                setDisputeReason('');
                setDisputeDescription('');
                setDisputeEvidence(null);
                setModalVisible(false);
                fetchOrders();
            }
        } catch (error: any) {
            console.error('Open dispute error:', error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to open dispute',
                type: 'error',
                style: 'top',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render Order Card ──────────────────────────────────────────────────
    const renderOrderCard = ({ item }: { item: OrderItem }) => {
        const statusColor = getStatusColor(item.status);
        const statusBg = getStatusBg(item.status);
        const address = parseShippingAddress(item.shipping_address);
        const isPending = item.status === 'PENDING' || item.status === 'CONFIRMED';

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    setSelectedOrder(item);
                    setModalVisible(true);
                }}
                className="bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            >
                <View className="p-4">
                    {/* Order Header */}
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[16px] font-bold text-[#1F2937]">{item.order_number}</Text>
                        <View className={`px-3 py-1 rounded-full`} style={{ backgroundColor: statusBg }}>
                            <Text className="text-[12px] font-semibold" style={{ color: statusColor }}>
                                {item.status_display || item.status}
                            </Text>
                        </View>
                    </View>

                    {/* Product Info */}
                    <View className="flex-row">
                        <Image
                            source={{ uri: item.seller_product?.main_image }}
                            className="w-20 h-20 rounded-xl bg-[#F3F4F6]"
                            resizeMode="cover"
                        />
                        <View className="flex-1 ml-3">
                            <Text className="text-[14px] font-semibold text-[#1F2937]" numberOfLines={2}>
                                {item.seller_product?.title || 'Product'}
                            </Text>
                            <Text className="text-[12px] text-[#6B7280] mt-1">{item.seller_shop}</Text>
                            <Text className="text-[12px] text-[#6B7280]">Qty: {item.quantity} · ${item.total_price}</Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-[12px] text-[#6B7280]">
                            {new Date(item.created_at).toLocaleDateString()} · {item.quantity} item
                        </Text>
                        {isPending && (
                            <View className="flex-row items-center gap-1">
                                <View className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                                <Text className="text-[11px] text-[#F59E0B] font-medium">Action needed</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // ─── Order Detail Modal ─────────────────────────────────────────────────
    const renderOrderDetailModal = () => {
        if (!selectedOrder) return null;

        const statusColor = getStatusColor(selectedOrder.status);
        const statusBg = getStatusBg(selectedOrder.status);
        const address = parseShippingAddress(selectedOrder.shipping_address);
        const isShipped = selectedOrder.status === 'SHIPPED';
        const isCompleted = selectedOrder.status === 'COMPLETED';
        const isPending = selectedOrder.status === 'PENDING' || selectedOrder.status === 'CONFIRMED';

        const statusSteps = ['Order Placed', 'Accepted', 'Shipped', 'Completed'];
        let currentStep = 0;
        if (selectedOrder.status === 'ACCEPTED' || selectedOrder.status === 'CONFIRMED') currentStep = 1;
        else if (selectedOrder.status === 'SHIPPED') currentStep = 2;
        else if (selectedOrder.status === 'COMPLETED') currentStep = 3;

        return (
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl max-h-[92%]">
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                            <Text className="text-[20px] font-bold text-[#1F2937]">{selectedOrder.order_number}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-5 pt-4 pb-8" showsVerticalScrollIndicator={false}>
                            {/* Seller & Date */}
                            <Text className="text-[14px] font-medium text-[#1F2937]">{selectedOrder.seller_shop}</Text>
                            <Text className="text-[12px] text-[#6B7280] mt-1">
                                {new Date(selectedOrder.created_at).toLocaleDateString()} · {selectedOrder.quantity} item
                            </Text>

                            {/* Status Badge */}
                            <View className={`self-start px-4 py-1.5 rounded-full mt-3`} style={{ backgroundColor: statusBg }}>
                                <Text className="text-[13px] font-semibold" style={{ color: statusColor }}>
                                    {selectedOrder.status_display || selectedOrder.status}
                                </Text>
                            </View>

                            {/* Order Lifecycle */}
                            <View className="mt-4">
                                <Text className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">ORDER LIFECYCLE</Text>
                                <View className="flex-row items-center justify-between">
                                    {statusSteps.map((step, index) => (
                                        <View key={index} className="items-center">
                                            <View className={`w-8 h-8 rounded-full items-center justify-center ${index <= currentStep ? 'bg-[#2355B6]' : 'bg-gray-200'}`}>
                                                <Ionicons
                                                    name={index <= currentStep ? 'checkmark' : 'time-outline'}
                                                    size={16}
                                                    color={index <= currentStep ? 'white' : '#9CA3AF'}
                                                />
                                            </View>
                                            <Text className={`text-[10px] mt-1 ${index <= currentStep ? 'text-[#2355B6] font-medium' : 'text-gray-400'}`}>
                                                {step}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Items */}
                            <View className="mt-4 bg-gray-50 rounded-xl p-4">
                                <Text className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">ITEMS</Text>
                                <View className="flex-row">
                                    <Image
                                        source={{ uri: selectedOrder.seller_product?.main_image }}
                                        className="w-20 h-20 rounded-xl bg-[#F3F4F6]"
                                        resizeMode="cover"
                                    />
                                    <View className="flex-1 ml-3">
                                        <Text className="text-[14px] font-semibold text-[#1F2937]" numberOfLines={2}>
                                            {selectedOrder.seller_product?.title}
                                        </Text>
                                        <Text className="text-[12px] text-[#6B7280]">Qty: {selectedOrder.quantity} · ${selectedOrder.unit_price} each</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Tracking Info */}
                            {selectedOrder.tracking_number && (
                                <View className="mt-4 bg-gray-50 rounded-xl p-4">
                                    <Text className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">TRACKING INFO</Text>
                                    <Text className="text-[14px] text-[#1F2937] font-medium">{selectedOrder.courier_name || 'N/A'}</Text>
                                    <Text className="text-[14px] text-[#2355B6]">{selectedOrder.tracking_number}</Text>
                                </View>
                            )}

                            {/* Delivery Confirmation */}
                            {isShipped && !isCompleted && (
                                <View className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <Text className="text-[14px] font-semibold text-[#1F2937] mb-2">Did you receive this delivery?</Text>
                                    <Text className="text-[13px] text-[#6B7280] mb-4">
                                        Please confirm whether you received your order in good condition.
                                    </Text>
                                    <View className="flex-row gap-3">
                                        <TouchableOpacity
                                            onPress={() => handleAcceptDelivery(selectedOrder.id)}
                                            disabled={submitting}
                                            className={`flex-1 bg-[#10B981] rounded-xl py-3 items-center ${submitting ? 'opacity-70' : ''}`}
                                        >
                                            <Text className="text-white font-semibold">✅ Yes, I received it</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setDisputeModalVisible(true);
                                            }}
                                            disabled={submitting}
                                            className="flex-1 bg-[#EF4444] rounded-xl py-3 items-center"
                                        >
                                            <Text className="text-white font-semibold">❌ No, reject delivery</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {isCompleted && (
                                <>
                                    <View className="mt-4 bg-green-50 rounded-xl p-4 border border-green-200">
                                        <Text className="text-[14px] font-semibold text-[#10B981]">✅ Delivery confirmed</Text>
                                        <Text className="text-[13px] text-[#6B7280] mt-1">You confirmed that you received this order.</Text>
                                    </View>

                                    {/* Reviews are only offered once delivery is confirmed, so every
                                        review on a product comes from someone who actually got it. */}
                                    {(
                                        <View className="mt-3 bg-amber-50 rounded-xl p-4 border border-amber-200">
                                            <Text className="text-[14px] font-semibold text-[#1F2937] mb-1">
                                                How was this product?
                                            </Text>
                                            <Text className="text-[13px] text-[#6B7280] mb-4">
                                                Your review helps other DEALNUX shoppers decide.
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setReviewTarget(selectedOrder);
                                                    setReviewRating(0);
                                                    setReviewComment('');
                                                    setReviewModalVisible(true);
                                                }}
                                                className="bg-[#F59E0B] rounded-xl py-3 items-center"
                                            >
                                                <Text className="text-white font-semibold">⭐ Write a review</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </>
                            )}

                            {isPending && (
                                <View className="mt-4 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                    <Text className="text-[14px] font-semibold text-[#F59E0B]">⏳ Awaiting seller action</Text>
                                    <Text className="text-[13px] text-[#6B7280] mt-1">The seller is processing your order.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    // ─── Review Modal ──────────────────────────────────────────────────────
    const renderReviewModal = () => (
        <Modal
            visible={reviewModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setReviewModalVisible(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl p-5 pb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[20px] font-bold text-[#1F2937]">Write a Review</Text>
                        <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {!!selectedOrder && (
                        <View className="flex-row items-center mb-5">
                            <Image
                                source={{ uri: selectedOrder.seller_product?.main_image }}
                                className="w-14 h-14 rounded-xl bg-[#F3F4F6]"
                                resizeMode="cover"
                            />
                            <Text
                                className="flex-1 ml-3 text-[14px] font-semibold text-[#1F2937]"
                                numberOfLines={2}
                            >
                                {selectedOrder.seller_product?.title}
                            </Text>
                        </View>
                    )}

                    <Text className="text-[14px] font-semibold text-[#374151] mb-2">
                        Your rating <Text className="text-[#EF4444]">*</Text>
                    </Text>
                    <View className="flex-row justify-center gap-3 mb-5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => setReviewRating(star)}
                                hitSlop={6}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={star <= reviewRating ? 'star' : 'star-outline'}
                                    size={38}
                                    color="#F59E0B"
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text className="text-[14px] font-semibold text-[#374151] mb-2">
                        Your review (optional)
                    </Text>
                    <TextInput
                        className="border border-[#D1D6DB] rounded-xl p-3 text-[14px] mb-5"
                        placeholder="What did you think of the product, packaging and delivery?"
                        placeholderTextColor="#9CA3AF"
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        style={{ height: 110, textAlignVertical: 'top' }}
                    />

                    <TouchableOpacity
                        onPress={handleSubmitReview}
                        disabled={submitting || reviewRating < 1}
                        className={`rounded-xl py-4 items-center ${submitting || reviewRating < 1 ? 'bg-[#F59E0B]/50' : 'bg-[#F59E0B]'
                            }`}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-[15px]">Submit Review</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // ─── Dispute Modal ─────────────────────────────────────────────────────
    const renderDisputeModal = () => (
        <Modal
            visible={disputeModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setDisputeModalVisible(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85%]">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-[20px] font-bold text-[#1F2937]">Open Dispute</Text>
                        <TouchableOpacity onPress={() => setDisputeModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="text-[14px] text-[#6B7280] mb-4">
                            Please provide details about why you're rejecting this delivery.
                        </Text>

                        <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">REASON *</Text>
                        <TextInput
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            placeholder="e.g. Wrong item delivered"
                            placeholderTextColor="#9CA3AF"
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-[16px] text-[#1F2937]"
                        />

                        <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">DESCRIPTION *</Text>
                        <TextInput
                            value={disputeDescription}
                            onChangeText={setDisputeDescription}
                            placeholder="Describe what happened..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-[16px] text-[#1F2937] min-h-[100px]"
                        />

                        <Text className="text-[13px] font-semibold text-[#6B7280] mb-1">EVIDENCE IMAGE</Text>
                        <TouchableOpacity
                            onPress={async () => {
                                const result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                    quality: 0.8,
                                });
                                if (!result.canceled && result.assets?.length > 0) {
                                    setDisputeEvidence(result.assets[0]);
                                }
                            }}
                            className="bg-white border border-dashed border-gray-300 rounded-xl p-6 items-center justify-center mb-4"
                        >
                            <Feather name="upload" size={24} color="#9CA3AF" />
                            <Text className="text-[14px] text-[#9CA3AF] mt-2">
                                {disputeEvidence ? 'Image selected' : 'Click to upload evidence'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleOpenDispute}
                            disabled={submitting}
                            className={`bg-[#EF4444] rounded-xl py-3.5 items-center ${submitting ? 'opacity-70' : ''}`}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-[15px]">Submit Dispute</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // ─── Pagination Component ─────────────────────────────────────────────
    const renderPagination = () => {
        if (!pagination || pagination.total_pages <= 1) return null;

        const { current_page, total_pages } = pagination;
        const maxVisible = 5;
        let start = Math.max(1, current_page - Math.floor(maxVisible / 2));
        let end = Math.min(total_pages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return (
            <View className="flex-row items-center justify-center gap-2 py-4 flex-wrap">
                <TouchableOpacity
                    onPress={() => goToPage(current_page - 1)}
                    disabled={current_page <= 1}
                    className={`px-3 py-2 rounded-lg ${current_page > 1 ? 'bg-[#2355B6]' : 'bg-gray-200'}`}
                >
                    <Ionicons name="chevron-back" size={18} color={current_page > 1 ? 'white' : '#9CA3AF'} />
                </TouchableOpacity>

                {start > 1 && (
                    <>
                        <TouchableOpacity onPress={() => goToPage(1)} className="px-3 py-2 rounded-lg bg-gray-100">
                            <Text className="text-[14px] text-[#6B7280]">1</Text>
                        </TouchableOpacity>
                        {start > 2 && <Text className="text-[14px] text-[#9CA3AF]">...</Text>}
                    </>
                )}

                {pages.map((page) => (
                    <TouchableOpacity
                        key={page}
                        onPress={() => goToPage(page)}
                        className={`px-3 py-2 rounded-lg ${page === current_page ? 'bg-[#2355B6]' : 'bg-gray-100'}`}
                    >
                        <Text className={`text-[14px] ${page === current_page ? 'text-white font-bold' : 'text-[#6B7280]'}`}>
                            {page}
                        </Text>
                    </TouchableOpacity>
                ))}

                {end < total_pages && (
                    <>
                        {end < total_pages - 1 && <Text className="text-[14px] text-[#9CA3AF]">...</Text>}
                        <TouchableOpacity onPress={() => goToPage(total_pages)} className="px-3 py-2 rounded-lg bg-gray-100">
                            <Text className="text-[14px] text-[#6B7280]">{total_pages}</Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity
                    onPress={() => goToPage(current_page + 1)}
                    disabled={current_page >= total_pages}
                    className={`px-3 py-2 rounded-lg ${current_page < total_pages ? 'bg-[#2355B6]' : 'bg-gray-200'}`}
                >
                    <Ionicons name="chevron-forward" size={18} color={current_page < total_pages ? 'white' : '#9CA3AF'} />
                </TouchableOpacity>
            </View>
        );
    };

    // ─── Status Filter ─────────────────────────────────────────────────────
    const renderStatusFilter = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-3"
            contentContainerStyle={{ paddingHorizontal: 4 }}
        >
            {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    className={`px-4 py-1.5 rounded-full mr-2 ${selectedStatus === status ? 'bg-[#2355B6]' : 'bg-gray-100'}`}
                >
                    <Text className={`text-[13px] ${selectedStatus === status ? 'text-white font-medium' : 'text-[#6B7280]'}`}>
                        {status}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    // ─── Render ─────────────────────────────────────────────────────────────
    const renderSummary = () => {
        if (!summary) return null;

        return (
            <LinearGradient
                colors={['#2355B6', '#1A4D8F']}
                className="rounded-2xl p-5 mb-4"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text className="text-[12px] text-white/70 uppercase tracking-wider">LIFETIME SAVINGS</Text>
                <Text className="text-[28px] font-bold text-white">${summary.lifetime_savings.toFixed(2)}</Text>
                <Text className="text-[12px] text-white/60">All time</Text>

                <View className="flex-row justify-between mt-4 pt-4 border-t border-white/20">
                    <View>
                        <Text className="text-[18px] font-bold text-white">{summary.total_orders}</Text>
                        <Text className="text-[11px] text-white/60">Total Orders</Text>
                        <Text className="text-[11px] text-white/40">{summary.delivered_text}</Text>
                    </View>
                    <View>
                        <Text className="text-[18px] font-bold text-white">{summary.pending_action_count}</Text>
                        <Text className="text-[11px] text-white/60">Pending</Text>
                        <Text className="text-[11px] text-white/40">Awaiting action</Text>
                    </View>
                    <View className="items-end w-[120px]">
                        <Text className="text-[18px] font-bold text-white">{planName}</Text>
                        <Text className="text-[11px] text-white/60">Plan</Text>
                        <Text className={`text-[11px] font-semibold text-green-400`}>
                            ACTIVE
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        );
    };

    // ─── Tabs ─────────────────────────────────────────────────────────────
    const renderTabs = () => {
        const tabs: { key: 'orders' | 'reviews'; label: string; badge?: number }[] = [
            { key: 'orders', label: 'Order History' },
            { key: 'reviews', label: 'Reviews', badge: completedOrders.length },
        ];

        return (
            <View className="flex-row bg-[#F1F5F9] rounded-xl p-1 mb-4">
                {tabs.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.8}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${active ? 'bg-white' : ''
                                }`}
                        >
                            <Text
                                className={`text-[14px] font-semibold ${active ? 'text-[#2355B6]' : 'text-[#64748B]'
                                    }`}
                            >
                                {tab.label}
                            </Text>
                            {!!tab.badge && tab.badge > 0 && (
                                <View className="bg-[#F59E0B] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                                    <Text className="text-white text-[11px] font-bold">{tab.badge}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // ─── Reviews Tab ──────────────────────────────────────────────────────
    const renderReviewsTab = () => {
        if (reviewsLoading && myReviewsList.length === 0) {
            return (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2355B6" />
                    <Text className="text-gray-500 mt-3">Loading your reviews...</Text>
                </View>
            );
        }

        return (
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            onRefresh();
                            loadMyReviews();
                        }}
                        colors={['#2355B6']}
                    />
                }
            >
                {/* Delivered orders still waiting on a review */}
                {completedOrders.length > 0 && (
                    <>
                        <Text className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                            WAITING FOR YOUR REVIEW
                        </Text>
                        {completedOrders.map((order) => (
                            <View
                                key={order.id}
                                className="bg-white rounded-2xl p-4 mb-3 border border-[#EEF0F3]"
                            >
                                <View className="flex-row">
                                    <Image
                                        source={{ uri: order.seller_product?.main_image }}
                                        className="w-16 h-16 rounded-xl bg-[#F3F4F6]"
                                        resizeMode="cover"
                                    />
                                    <View className="flex-1 ml-3">
                                        <Text
                                            className="text-[14px] font-semibold text-[#1F2937]"
                                            numberOfLines={2}
                                        >
                                            {order.seller_product?.title}
                                        </Text>
                                        <Text className="text-[12px] text-[#6B7280] mt-1">
                                            {order.seller_shop} · {order.order_number}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        setReviewTarget(order);
                                        setReviewRating(0);
                                        setReviewComment('');
                                        setReviewModalVisible(true);
                                    }}
                                    activeOpacity={0.85}
                                    className="mt-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl py-3 flex-row items-center justify-center gap-2"
                                >
                                    <Ionicons name="star" size={16} color="#F59E0B" />
                                    <Text className="text-[14px] font-semibold text-[#92400E]">
                                        Add review
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </>
                )}

                {/* Reviews already written */}
                {myReviewsList.length > 0 && (
                    <>
                        <Text className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-wider mb-3 mt-2">
                            MY REVIEWS ({myReviewsList.length})
                        </Text>
                        {myReviewsList.map((review) => (
                            <View
                                key={review.id}
                                className="bg-white rounded-2xl p-4 mb-3 border border-[#EEF0F3]"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="flex-row gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Ionicons
                                                key={star}
                                                name={star <= review.rating ? 'star' : 'star-outline'}
                                                size={16}
                                                color="#F59E0B"
                                            />
                                        ))}
                                    </View>
                                    <Text className="text-[11px] text-[#94A3B8]">
                                        {formatReviewDate(review.created_at)}
                                    </Text>
                                </View>
                                {!!review.comment?.trim() && (
                                    <Text className="text-[13px] text-[#4B5563] leading-5">
                                        {review.comment.trim()}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </>
                )}

                {completedOrders.length === 0 && myReviewsList.length === 0 && (
                    <View className="items-center justify-center py-16 px-6">
                        <Ionicons name="star-outline" size={48} color="#D1D5DB" />
                        <Text className="text-[16px] font-semibold text-[#1F2937] mt-3">
                            No reviews yet
                        </Text>
                        <Text className="text-[13px] text-[#6B7280] text-center mt-2 leading-5">
                            Confirm delivery on a shipped order and it will show up here for you
                            to review.
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // ─── Main Render ──────────────────────────────────────────────────────
    if (loading && !refreshing) {
        return (
            <View className="flex-1 bg-[#F9F9FB]">
                <View className="px-5 flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2355B6" />
                    <Text className="text-gray-500 mt-3">Loading orders...</Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F9F9FB]">
            <View className="px-5 flex-1">
                {/* Header */}
                <View className="flex-row items-center gap-4 py-2">
                    <AppHeader
                        left={() => <BackButton />}
                        middle={() => <Text className="text-lg font-semibold text-[#1F2937]">My Orders</Text>}
                    />
                </View>

                <Text className="text-[13px] text-[#6B7280] mb-4">
                    Track orders, manage subscriptions, and leave reviews
                </Text>

                {/* Summary */}
                {renderSummary()}

                {/* Status Filter */}
                {/* {renderStatusFilter()} */}

                {/* Tabs */}
                {renderTabs()}

                {activeTab === 'orders' ? (
                    <FlatList
                        data={orders}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderOrderCard}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2355B6']} />
                        }
                        ListEmptyComponent={
                            <View className="items-center justify-center py-10">
                                <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                                <Text className="text-[16px] text-[#6B7280] mt-3">No orders found</Text>
                            </View>
                        }
                        ListFooterComponent={renderPagination}
                    />
                ) : (
                    renderReviewsTab()
                )}
            </View>

            {/* Order Detail Modal */}
            {renderOrderDetailModal()}

            {/* Dispute Modal */}
            {renderDisputeModal()}

            {/* Review Modal */}
            {renderReviewModal()}

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
    );
};

export default MyOrders;