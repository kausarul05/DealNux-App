import { IPA_BASE, MY_ADS, ADS_DETAILS, ADS_CREATE } from '@env';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    StatusBar,
    Linking,
    Alert,
    RefreshControl,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { AuthStackParamList } from '../../Navigation/types';
import { Toast, useToast } from '../../components/useToost';

const TABS = ['All', 'Live', 'Pending', 'Rejected'] as const;
type TabType = (typeof TABS)[number];

type ApiAd = {
    id: number;
    title: string;
    description: string;
    image: string;
    target_url: string;
    target_section: string | null;
    total_budget: string;
    spent_amount: string;
    clicks: number;
    impressions: number;
    ctr: number;
    start_date: string;
    end_date: string;
    is_approved: boolean;
    status: 'pending' | 'active' | 'rejected' | 'expired' | string;
    cta_text?: string;
    budget_remaining?: number;
    created_at: string;
    updated_at: string;
    performance?: { date: string; impressions: number; clicks: number }[];
};

type AdDetailResponse = {
    success: boolean;
    code: number;
    message: string;
    timestamp: number;
    data: ApiAd;
};

type PickedImage = {
    uri: string;
    name: string;
    type: string;
    width?: number;
    height?: number;
};

const API_BASE_URL = IPA_BASE;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toUiStatusType = (ad: ApiAd): 'live' | 'pending' | 'rejected' | 'expired' => {
    if (ad.status === 'rejected') return 'rejected';
    if (ad.status === 'pending') return 'pending';
    if (ad.status === 'expired') return 'expired';
    if (ad.status === 'active' && ad.is_approved) return 'live';
    if (ad.status === 'active' && !ad.is_approved) return 'pending';
    return ad.is_approved ? 'live' : 'pending';
};

const badgeConfig = (type: 'live' | 'pending' | 'rejected' | 'expired') => {
    if (type === 'live') return { bg: '#EAF7EF', fg: '#2E9B63', text: 'Approved (Live)', icon: 'checkmark-circle' };
    if (type === 'rejected') return { bg: '#FDECEC', fg: '#E24A4A', text: 'Rejected', icon: 'close-circle' };
    if (type === 'expired') return { bg: '#EEF2FF', fg: '#4F46E5', text: 'Expired', icon: 'time' };
    return { bg: '#FEF6E7', fg: '#C27A2C', text: 'Pending Review', icon: 'hourglass' };
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
};

const getExtFromUri = (uri: string) => {
    const clean = uri.split('?')[0];
    const parts = clean.split('.');
    return (parts[parts.length - 1] || 'jpg').toLowerCase();
};

const mimeFromExt = (ext: string) => {
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'heic' || ext === 'heif') return 'image/heic';
    return 'image/jpeg';
};

// ─── Status Badge Component ──────────────────────────────────────────────────
const StatusBadge = ({ type }: { type: 'live' | 'pending' | 'rejected' | 'expired' }) => {
    const config = badgeConfig(type);
    const iconMap = {
        'checkmark-circle': <Ionicons name="checkmark-circle" size={14} color={config.fg} />,
        'close-circle': <Ionicons name="close-circle" size={14} color={config.fg} />,
        'time': <Ionicons name="time" size={14} color={config.fg} />,
        'hourglass': <Ionicons name="hourglass" size={14} color={config.fg} />,
    };

    return (
        <View className="flex-row items-center px-3 py-1.5 rounded-full" style={{ backgroundColor: config.bg }}>
            {iconMap[config.icon as keyof typeof iconMap]}
            <Text className="text-xs font-medium ml-1.5" style={{ color: config.fg }}>
                {config.text}
            </Text>
        </View>
    );
};

// ─── Ad Detail Modal Component ──────────────────────────────────────────────
const AdDetailModal = ({
    visible,
    ad,
    loading,
    onClose,
    onEdit,
    onDelete,
}: {
    visible: boolean;
    ad: ApiAd | null;
    loading: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) => {
    if (!ad) return null;

    const statusType = toUiStatusType(ad);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" />
            <View className="flex-1 bg-black/50">
                <View className="flex-1 mt-16 bg-white rounded-t-3xl overflow-hidden">
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                        <View className="flex-row items-center gap-3">
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold text-gray-900">Ad Details</Text>
                        </View>
                        <StatusBadge type={statusType} />
                    </View>

                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#1F56D8" />
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                            {/* Hero Image */}
                            <Image
                                source={{ uri: ad.image }}
                                className="w-full h-52"
                                resizeMode="cover"
                            />

                            {/* Content */}
                            <View className="p-5">
                                {/* Title */}
                                <Text className="text-2xl font-bold text-gray-900">{ad.title}</Text>
                                <Text className="text-sm text-gray-500 mt-1">{ad.description}</Text>

                                {/* Stats Grid */}
                                <View className="flex-row flex-wrap gap-3 mt-4">
                                    {[
                                        { label: 'Impressions', value: ad.impressions, icon: 'eye-outline', color: '#3B82F6' },
                                        { label: 'Clicks', value: ad.clicks, icon: 'hand-right-outline', color: '#10B981' },
                                        { label: 'CTR', value: `${ad.ctr.toFixed(2)}%`, icon: 'trending-up', color: '#F59E0B' },
                                        { label: 'Spent', value: formatCurrency(ad.spent_amount), icon: 'wallet-outline', color: '#EF4444' },
                                    ].map((stat, index) => (
                                        <View
                                            key={index}
                                            className="flex-1 min-w-[45%] rounded-xl p-3"
                                            style={{ backgroundColor: '#F8FAFC' }}
                                        >
                                            <View className="flex-row items-center gap-1.5">
                                                <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                                                <Text className="text-xs text-gray-500">{stat.label}</Text>
                                            </View>
                                            <Text className="text-lg font-bold text-gray-900 mt-1">{stat.value}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Campaign Details */}
                                <View className="mt-5">
                                    <Text className="text-base font-bold text-gray-900 mb-3">Campaign Details</Text>
                                    <View className="rounded-xl p-4" style={{ backgroundColor: '#F8FAFC' }}>
                                        {[
                                            { label: 'Ad ID', value: `#${ad.id}` },
                                            { label: 'Target URL', value: ad.target_url, isUrl: true },
                                            { label: 'Total Budget', value: formatCurrency(ad.total_budget) },
                                            { label: 'Budget Remaining', value: formatCurrency(ad.budget_remaining || 0) },
                                            { label: 'Start Date', value: formatDate(ad.start_date) },
                                            { label: 'End Date', value: formatDate(ad.end_date) },
                                            { label: 'Target Section', value: ad.target_section || 'N/A' },
                                            { label: 'Call to Action', value: ad.cta_text || 'Learn More' },
                                        ].map((item, index) => (
                                            <View
                                                key={index}
                                                className={`flex-row items-center justify-between py-2.5 ${
                                                    index < 7 ? 'border-b border-gray-200' : ''
                                                }`}
                                            >
                                                <Text className="text-sm text-gray-500">{item.label}</Text>
                                                {item.isUrl ? (
                                                    <TouchableOpacity onPress={() => Linking.openURL(item.value)}>
                                                        <Text className="text-sm font-medium text-[#1F56D8] underline">
                                                            {item.value}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                                                        {item.value}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Performance History */}
                                {ad.performance && ad.performance.length > 0 && (
                                    <View className="mt-5">
                                        <Text className="text-base font-bold text-gray-900 mb-3">Performance History</Text>
                                        <View className="rounded-xl p-4" style={{ backgroundColor: '#F8FAFC' }}>
                                            <View className="flex-row justify-between items-center mb-2">
                                                <Text className="text-xs text-gray-500">Date</Text>
                                                <View className="flex-row gap-6">
                                                    <Text className="text-xs text-gray-500">Impressions</Text>
                                                    <Text className="text-xs text-gray-500">Clicks</Text>
                                                </View>
                                            </View>
                                            {ad.performance.map((perf, index) => (
                                                <View
                                                    key={index}
                                                    className={`flex-row justify-between items-center py-1.5 ${
                                                        index < ad.performance!.length - 1 ? 'border-b border-gray-200' : ''
                                                    }`}
                                                >
                                                    <Text className="text-sm text-gray-700">{formatDate(perf.date)}</Text>
                                                    <View className="flex-row gap-6">
                                                        <Text className="text-sm text-gray-700 text-center w-12">{perf.impressions}</Text>
                                                        <Text className="text-sm text-gray-700 text-center w-12">{perf.clicks}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Quick Actions */}
                                <View className="flex-row gap-3 mt-5 pb-6">
                                    <TouchableOpacity
                                        className="flex-1 bg-[#1F56D8] py-3 rounded-xl flex-row items-center justify-center gap-2"
                                        onPress={onEdit}
                                    >
                                        <Feather name="edit-2" size={18} color="white" />
                                        <Text className="text-white font-semibold">Edit Campaign</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="flex-1 bg-red-50 py-3 rounded-xl flex-row items-center justify-center gap-2"
                                        style={{ backgroundColor: '#FEF2F2' }}
                                        onPress={onDelete}
                                    >
                                        <Feather name="trash-2" size={18} color="#EF4444" />
                                        <Text className="text-red-500 font-semibold">Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

// ─── Edit Campaign Modal Component ──────────────────────────────────────────
const EditCampaignModal = ({
    visible,
    ad,
    loading,
    onClose,
    onSave,
    onImagePick,
    imageFile,
}: {
    visible: boolean;
    ad: ApiAd | null;
    loading: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    onImagePick: () => void;
    imageFile: PickedImage | null;
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [budget, setBudget] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [ctaText, setCtaText] = useState('');

    // Initialize form when ad changes
    React.useEffect(() => {
        if (ad) {
            setTitle(ad.title || '');
            setDescription(ad.description || '');
            setTargetUrl(ad.target_url || '');
            setBudget(ad.total_budget || '');
            setStartDate(ad.start_date ? new Date(ad.start_date) : null);
            setEndDate(ad.end_date ? new Date(ad.end_date) : null);
            setCtaText(ad.cta_text || 'Learn More');
        }
    }, [ad]);

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter ad title.');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter ad description.');
            return;
        }
        if (!targetUrl.trim()) {
            Alert.alert('Error', 'Please enter target URL.');
            return;
        }
        if (!budget.trim() || isNaN(Number(budget)) || Number(budget) <= 0) {
            Alert.alert('Error', 'Please enter a valid budget amount.');
            return;
        }
        if (!startDate || !endDate) {
            Alert.alert('Error', 'Please select start and end dates.');
            return;
        }
        if (endDate.getTime() < startDate.getTime()) {
            Alert.alert('Error', 'End date must be after start date.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('target_url', targetUrl);
        formData.append('total_budget', String(Number(budget)));
        formData.append('start_date', startDate.toISOString().split('T')[0]);
        formData.append('end_date', endDate.toISOString().split('T')[0]);
        formData.append('cta_text', ctaText);

        if (imageFile) {
            formData.append('image', {
                uri: imageFile.uri,
                name: imageFile.name || `ad_${Date.now()}.jpg`,
                type: imageFile.type || 'image/jpeg',
            } as any);
        }

        onSave(formData);
    };

    if (!ad) return null;

    const formatDateInput = (date: Date | null) => {
        if (!date) return 'Select date';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                className="flex-1 bg-black/50"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="flex-1 mt-16 bg-white rounded-t-3xl overflow-hidden">
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                        <View className="flex-row items-center gap-3">
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                            <Text className="text-lg font-bold text-gray-900">Edit Campaign</Text>
                        </View>
                        <StatusBadge type={toUiStatusType(ad)} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 p-5">
                        {/* Image */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Ad Image</Text>
                            <TouchableOpacity
                                onPress={onImagePick}
                                className="bg-gray-50 rounded-xl p-3 items-center justify-center border-2 border-dashed border-gray-300"
                            >
                                {imageFile ? (
                                    <Image
                                        source={{ uri: imageFile.uri }}
                                        className="w-full h-40 rounded-lg"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="items-center py-4">
                                        <Ionicons name="cloud-upload-outline" size={40} color="#9CA3AF" />
                                        <Text className="text-gray-500 mt-2">Tap to change image</Text>
                                        <Text className="text-xs text-gray-400">Current: {ad.image?.split('/').pop()}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Title */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Ad Title *</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Enter ad title"
                                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                            />
                        </View>

                        {/* Description */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Description *</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Enter ad description"
                                multiline
                                numberOfLines={3}
                                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200 min-h-[80px]"
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Target URL */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Target URL *</Text>
                            <TextInput
                                value={targetUrl}
                                onChangeText={setTargetUrl}
                                placeholder="https://example.com"
                                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Budget */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Total Budget *</Text>
                            <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                                <Text className="text-gray-500 font-bold ml-4">$</Text>
                                <TextInput
                                    value={budget}
                                    onChangeText={(text) => setBudget(text.replace(/[^0-9.]/g, ''))}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    className="flex-1 px-4 py-3 text-gray-900"
                                />
                            </View>
                        </View>

                        {/* Dates */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Start & End Dates *</Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => setShowStartPicker(true)}
                                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
                                >
                                    <Text className={startDate ? 'text-gray-900' : 'text-gray-400'}>
                                        {formatDateInput(startDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setShowEndPicker(true)}
                                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
                                >
                                    <Text className={endDate ? 'text-gray-900' : 'text-gray-400'}>
                                        {formatDateInput(endDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* CTA Text */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Call to Action</Text>
                            <TextInput
                                value={ctaText}
                                onChangeText={setCtaText}
                                placeholder="Learn More"
                                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading}
                            className="bg-[#1F56D8] py-4 rounded-xl items-center mt-2 mb-6"
                            style={{ opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Update</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Date Pickers */}
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(_, date) => {
                                setShowStartPicker(false);
                                if (date) setStartDate(date);
                            }}
                        />
                    )}
                    {showEndPicker && (
                        <DateTimePicker
                            value={endDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(_, date) => {
                                setShowEndPicker(false);
                                if (date) setEndDate(date);
                            }}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const MyAds = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [tab, setTab] = useState<TabType>('All');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [myAds, setMyAds] = useState<ApiAd[]>([]);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAd, setSelectedAd] = useState<ApiAd | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Edit states
    const [editVisible, setEditVisible] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [imageFile, setImageFile] = useState<PickedImage | null>(null);

    // ─── Load Data ─────────────────────────────────────────────────────────────
    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setErrorMsg('');

        const token = await AsyncStorage.getItem('vToken');
        if (!token) {
            setErrorMsg('Token missing');
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const res = await axios.get(`${API_BASE_URL}${MY_ADS}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const ads: ApiAd[] = res?.data?.data?.ads ?? [];
            setMyAds(ads);
            console.log('📊 Loaded ads:', ads.length);
        } catch (err: any) {
            console.error('❌ Error loading data:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load ads');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ─── Fetch Ad Detail ──────────────────────────────────────────────────────
    const fetchAdDetail = async (adId: number) => {
        try {
            setDetailLoading(true);
            const token = await AsyncStorage.getItem('vToken');

            if (!token) {
                setErrorMsg('Token missing');
                return;
            }

            const response = await axios.get<AdDetailResponse>(
                `${API_BASE_URL}${ADS_DETAILS}${adId}/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                }
            );

            if (response.data?.success) {
                setSelectedAd(response.data.data);
                setModalVisible(true);
            } else {
                setErrorMsg(response.data?.message || 'Failed to load ad details');
            }
        } catch (err: any) {
            console.error('❌ Fetch ad detail error:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load ad details');
        } finally {
            setDetailLoading(false);
        }
    };

    // ─── Delete Ad ─────────────────────────────────────────────────────────────
    const handleDelete = async (adId: number) => {
        Alert.alert(
            'Delete Campaign',
            'Are you sure you want to delete this campaign?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('vToken');
                            if (!token) return;

                            await axios.delete(`${API_BASE_URL}${ADS_CREATE}${adId}/`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    Accept: 'application/json',
                                },
                            });

                            toast.show({ message: 'Campaign deleted successfully', type: 'success', style: 'top' });
                            setModalVisible(false);
                            loadData(false);
                        } catch (err: any) {
                            console.error('❌ Delete error:', err);
                            toast.show({
                                message: err?.response?.data?.message || 'Failed to delete',
                                type: 'error',
                                style: 'top',
                            });
                        }
                    }
                },
            ]
        );
    };

    // ─── Update Ad ─────────────────────────────────────────────────────────────
    const handleUpdateAd = async (formData: FormData) => {
        if (!selectedAd) return;

        try {
            setEditLoading(true);
            const token = await AsyncStorage.getItem('vToken');

            if (!token) {
                toast.show({ message: 'Token missing', type: 'error', style: 'top' });
                return;
            }

            const response = await axios.patch(
                `${API_BASE_URL}ads/update/${selectedAd.id}/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                        Accept: 'application/json',
                    },
                }
            );

            console.log('✅ Update response:', response.data);

            if (response.data?.success) {
                toast.show({ message: 'Campaign updated successfully!', type: 'success', style: 'top' });
                setEditVisible(false);
                setImageFile(null);
                loadData(false);
            } else {
                toast.show({
                    message: response.data?.message || 'Failed to update campaign',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (err: any) {
            console.error('❌ Update error:', err?.response?.data || err);
            toast.show({
                message: err?.response?.data?.message || 'Failed to update campaign',
                type: 'error',
                style: 'top',
            });
        } finally {
            setEditLoading(false);
        }
    };

    // ─── Image Picker ──────────────────────────────────────────────────────────
    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            toast.show({ message: 'Gallery permission denied', type: 'error', style: 'top' });
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsEditing: false,
            legacy: true,
        });

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        if (!asset?.uri) return;

        let uri = asset.uri;
        let ext = asset.fileName?.includes('.')
            ? asset.fileName.split('.').pop()?.toLowerCase() ?? ''
            : getExtFromUri(uri);
        if (!ext) ext = 'jpg';

        let mime: string = (asset as any).mimeType || mimeFromExt(ext);

        if (mime === 'image/heic' || mime === 'image/heif' || ext === 'heic' || ext === 'heif') {
            try {
                const manipulated = await ImageManipulator.manipulateAsync(
                    uri,
                    [],
                    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
                );
                uri = manipulated.uri;
                ext = 'jpg';
                mime = 'image/jpeg';
            } catch (e: any) {
                toast.show({ message: 'HEIC conversion failed', type: 'error', style: 'top' });
                return;
            }
        }

        const fileName = asset.fileName?.includes('.')
            ? asset.fileName.replace(/\.(heic|heif)$/i, '.jpg')
            : `ad_${Date.now()}.${ext}`;

        setImageFile({
            uri,
            name: fileName,
            type: mime || 'image/jpeg',
            width: asset.width,
            height: asset.height,
        });
    };

    // ─── List Data ────────────────────────────────────────────────────────────
    const list = useMemo(() => {
        const normalized = myAds.map((ad) => ({
            ...ad,
            uiStatusType: toUiStatusType(ad),
        }));

        if (tab === 'All') return normalized;
        if (tab === 'Live') return normalized.filter((x) => x.uiStatusType === 'live');
        if (tab === 'Pending') return normalized.filter((x) => x.uiStatusType === 'pending');
        return normalized.filter((x) => x.uiStatusType === 'rejected');
    }, [myAds, tab]);

    useFocusEffect(
        useCallback(() => {
            loadData(true);
        }, [loadData])
    );

    // ─── Render ──────────────────────────────────────────────────────────────
    const renderAd = ({ item }: { item: ApiAd & { uiStatusType: 'live' | 'pending' | 'rejected' | 'expired' } }) => {
        const config = badgeConfig(item.uiStatusType);

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => fetchAdDetail(item.id)}
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                }}
            >
                <View className="p-5">
                    <View className="flex-row">
                        <Image
                            source={{ uri: item.image }}
                            className="w-[74px] h-[74px] rounded-2xl"
                            resizeMode="cover"
                        />
                        <View className="flex-1 ml-4 pr-8">
                            <Text className="text-[18px] font-semibold text-[#111827] leading-6" numberOfLines={2}>
                                {item.title}
                            </Text>
                            <Text className="text-[14px] text-[#7A8192] mt-1" numberOfLines={1}>
                                {item.description}
                            </Text>
                            <Text className="text-[12px] text-[#9AA1AE] mt-1">
                                Created {formatDate(item.created_at)} • ID: #{item.id}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="h-[1px] bg-[#E6E9EF]" />

                <View className="px-5 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: config.bg }}>
                        <Ionicons
                            name={config.icon as any}
                            size={14}
                            color={config.fg}
                            style={{ marginRight: 6 }}
                        />
                        <Text className="text-[13px] font-medium" style={{ color: config.fg }}>
                            {config.text}
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                        {item.uiStatusType === 'pending' ? (
                            <Text className="text-[#9AA1AE] text-[14px] font-medium">
                                Processing...
                            </Text>
                        ) : (
                            <>
                                <View className="flex-row items-center gap-3">
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="eye-outline" size={14} color="#9CA3AF" />
                                        <Text className="text-xs text-gray-500">{item.impressions}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="hand-right-outline" size={14} color="#9CA3AF" />
                                        <Text className="text-xs text-gray-500">{item.clicks}</Text>
                                    </View>
                                </View>
                                <MaterialIcons name="arrow-forward" size={20} color="#1F56D8" />
                            </>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5 flex-1">
                {/* Header */}
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold">My Ads</Text>
                </View>

                {/* Tabs */}
                <View className="mt-4">
                    <FlatList
                        data={TABS as unknown as string[]}
                        keyExtractor={(item) => item}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 12 }}
                        renderItem={({ item: t }) => {
                            const active = tab === (t as TabType);
                            return (
                                <Pressable
                                    onPress={() => setTab(t as TabType)}
                                    className={`px-6 py-2 rounded-full mr-3 ${
                                        active ? 'bg-[#1F56D8]' : 'bg-white border border-[#D6DAE2]'
                                    }`}
                                >
                                    <Text className={`text-base font-semibold ${active ? 'text-white' : 'text-[#7B8190]'}`}>
                                        {t}
                                    </Text>
                                </Pressable>
                            );
                        }}
                    />
                </View>

                {!!errorMsg && (
                    <Text className="mt-3 text-[13px] text-[#E24A4A]">{errorMsg}</Text>
                )}

                <View className="h-4" />

                {/* List */}
                <FlatList
                    data={list}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderAd}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadData(false);
                            }}
                            colors={['#1F56D8']}
                            tintColor="#1F56D8"
                        />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <Text className="text-center text-[#7A8192] mt-10">
                                No ads found.
                            </Text>
                        ) : null
                    }
                />

                {/* FAB Button */}
                <Pressable
                    className="absolute bottom-8 right-6 w-[62px] h-[62px] rounded-full items-center justify-center bg-[#2F6CF6]"
                    style={{
                        shadowColor: '#000',
                        shadowOpacity: 0.18,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 10,
                    }}
                    onPress={() => navigation.navigate('CreateAds')}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </Pressable>
            </View>

            {/* Detail Modal */}
            <AdDetailModal
                visible={modalVisible}
                ad={selectedAd}
                loading={detailLoading}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedAd(null);
                }}
                onEdit={() => {
                    if (selectedAd) {
                        setModalVisible(false);
                        setEditVisible(true);
                    }
                }}
                onDelete={() => {
                    if (selectedAd) {
                        handleDelete(selectedAd.id);
                    }
                }}
            />

            {/* Edit Campaign Modal */}
            <EditCampaignModal
                visible={editVisible}
                ad={selectedAd}
                loading={editLoading}
                onClose={() => {
                    setEditVisible(false);
                    setImageFile(null);
                    setSelectedAd(null);
                }}
                onSave={handleUpdateAd}
                onImagePick={pickImage}
                imageFile={imageFile}
            />

            {/* Toast */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                style={toast.style}
                onHide={toast.hide}
            />
        </SafeAreaView>
    );
};

export default MyAds;