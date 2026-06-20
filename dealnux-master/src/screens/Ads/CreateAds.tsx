import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ADS_CREATE, IPA_BASE } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import SuccessModal from '../../components/SuccessModal';
import { Toast, useToast } from '../../components/useToost';
import { AuthStackParamList } from '../../Navigation/types';

const API_BASE_URL = IPA_BASE;
const END_POINTS = ADS_CREATE;

// ─── Types ────────────────────────────────────────────────────────────────────
type PickedImage = {
    uri: string;
    name: string;
    type: string;
    width?: number;
    height?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// ─── FieldLabel — defined OUTSIDE component (focus fix) ──────────────────────
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <Text className="text-[16px] font-semibold text-[#6B7280] mb-2">
        {children}
    </Text>
);

// ─── BoxInput — defined OUTSIDE component (focus fix) ────────────────────────
const BoxInput = ({
    placeholder,
    multiline,
    value,
    onChangeText,
    rightIcon,
    keyboardType,
}: {
    placeholder?: string;
    multiline?: boolean;
    value: string;
    onChangeText: (t: string) => void;
    rightIcon?: React.ReactNode;
    keyboardType?: any;
}) => (
    <View className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
        <View className="flex-row items-center">
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType}
                className={`flex-1 text-[18px] text-[#111827] ${multiline ? 'min-h-[96px]' : ''}`}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
            {rightIcon ? <View className="ml-3">{rightIcon}</View> : null}
        </View>
    </View>
);

// ─── SelectBox — defined OUTSIDE component (focus fix) ───────────────────────
const SelectBox = ({
    placeholder,
    rightIcon,
    onPress,
    muted,
}: {
    placeholder: string;
    rightIcon?: React.ReactNode;
    onPress: () => void;
    muted?: boolean;
}) => (
    <Pressable
        onPress={onPress}
        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 flex-row items-center justify-between"
    >
        <Text className={`text-[18px] ${muted ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}>
            {placeholder}
        </Text>
        {rightIcon}
    </Pressable>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const CreateAds = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();
    const route = useRoute<any>();
    console.log(route.params?.adId);

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // form fields
    const [title, setTitle] = useState('');
    const [imageFile, setImageFile] = useState<PickedImage | null>(null);
    const [description, setDescription] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [budget, setBudget] = useState('');

    // targets
    const targets = useMemo(() => ['Home', 'Cart'] as const, []);
    const [targetSection, setTargetSection] = useState<(typeof targets)[number]>('Home');
    const [targetModalOpen, setTargetModalOpen] = useState(false);

    // dates
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // image rules by target
    const IMAGE_RULES: Record<string, { width: number; height: number; label: string }> = {
        Home: { width: 1280, height: 720, label: '1280 × 720 (Banner)' },
        Cart: { width: 1280, height: 720, label: '1280 × 720 (Square)' },
    };

    const activeRule = IMAGE_RULES[targetSection];

    // useCallback so reference stays stable across renders
    const onChangeTarget = useCallback((t: (typeof targets)[number]) => {
        setTargetSection(t);
        setTargetModalOpen(false);
        setImageFile(null);
    }, []);

    // ── Budget change — stable with useCallback ───────────────────────────────
    const onBudgetChange = useCallback((t: string) => {
        setBudget(t.replace(/[^0-9.]/g, ''));
    }, []);

    // ── Image Picker ──────────────────────────────────────────────────────────
    const pickImage = async () => {
        // Request permission
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            toast.show({ message: 'Gallery permission denied', type: 'error', style: 'top' });
            return;
        }

        let result: ImagePicker.ImagePickerResult;

        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],      // ✅ new API (array), not deprecated MediaTypeOptions
                quality: 1,
                allowsEditing: false,
                legacy: true,               // ✅ reduces content:// issues on Android
            });
        } catch (e: any) {
            toast.show({ message: 'Image picker failed: ' + (e?.message || ''), type: 'error', style: 'top' });
            return;
        }

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        if (!asset?.uri) return;

        let uri = asset.uri;

        // ── ext + mime detection ──────────────────────────────────────────────
        let ext =
            asset.fileName && asset.fileName.includes('.')
                ? asset.fileName.split('.').pop()?.toLowerCase() ?? ''
                : getExtFromUri(uri);

        if (!ext) ext = 'jpg';

        let mime: string = (asset as any).mimeType || mimeFromExt(ext);

        // ── HEIC/HEIF → JPEG convert ──────────────────────────────────────────
        if (
            mime === 'image/heic' ||
            mime === 'image/heif' ||
            ext === 'heic' ||
            ext === 'heif'
        ) {
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

        // ── fileName ──────────────────────────────────────────────────────────
        const fileName =
            asset.fileName && asset.fileName.includes('.')
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

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSaveChanges = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' });
            return;
        }
        if (!title.trim()) {
            toast.show({ message: 'Please enter ad title.', type: 'error', style: 'top' });
            return;
        }
        if (!description.trim()) {
            toast.show({ message: 'Please enter ad description.', type: 'error', style: 'top' });
            return;
        }
        if (!imageFile) {
            toast.show({
                message: `Please upload an image (${activeRule.label}).`,
                type: 'error',
                style: 'top',
            });
            return;
        }
        if (!targetSection) {
            toast.show({ message: 'Please select target section.', type: 'error', style: 'top' });
            return;
        }
        if (!targetUrl.trim()) {
            toast.show({ message: 'Please enter target URL.', type: 'error', style: 'top' });
            return;
        }
        if (!budget.trim()) {
            toast.show({ message: 'Please enter ad budget.', type: 'error', style: 'top' });
            return;
        }

        const budgetNum = Number(budget);
        if (Number.isNaN(budgetNum) || budgetNum <= 0) {
            toast.show({ message: 'Budget must be a valid number > 0.', type: 'error', style: 'top' });
            return;
        }

        if (!startDate) {
            toast.show({ message: 'Please enter ad start date.', type: 'error', style: 'top' });
            return;
        }
        if (!endDate) {
            toast.show({ message: 'Please enter ad end date.', type: 'error', style: 'top' });
            return;
        }
        if (endDate.getTime() < startDate.getTime()) {
            toast.show({ message: 'End date must be after start date.', type: 'error', style: 'top' });
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('target_section', targetSection);
        formData.append('target_url', targetUrl);
        formData.append('total_budget', String(budgetNum));
        formData.append('start_date', formatYYYYMMDD(startDate));
        formData.append('end_date', formatYYYYMMDD(endDate));

        formData.append('image', {
            uri: imageFile.uri,
            name: imageFile.name || `ad_${Date.now()}.jpg`,
            type: imageFile.type || 'image/jpeg',
        } as any);

        try {
            const res = await axios.post(`${API_BASE_URL}${END_POINTS}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                },
            });

            if (res.data?.success === true) {
                setShowSuccessModal(true);
            } else {
                toast.show({ message: 'Ads create failed', type: 'error', style: 'top' });
            }
        } catch (error: any) {
            console.error('POST error full:', JSON.stringify(error?.response?.data, null, 2));
            console.error('POST status:', error?.response?.status);
            console.error('POST error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Ads create failed',
                type: 'error',
                style: 'top',
            });
        }
    };

    useEffect(() => {
        if (!showSuccessModal) return;
        const t = setTimeout(() => {
            setShowSuccessModal(false);
            navigation.goBack();
        }, 2500);
        return () => clearTimeout(t);
    }, [showSuccessModal, navigation]);

    return (
        <SafeAreaView className="flex-1 bg-[#F7F7FA]">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View className="px-5 py-2">
                    <View className="flex-row items-center">
                        <View className="w-10">
                            <AppHeader left={() => <BackButton />} />
                        </View>
                        <Text className="text-lg ml-4 font-semibold text-[#111827]">
                            Create Ad
                        </Text>
                        <View className="w-10" />
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="px-5">
                        {/* Upload Box */}
                        <View className="mt-4 bg-white rounded-2xl border border-[#D1D5DB] border-dashed p-6">
                            <Text className="text-[22px] font-extrabold text-[#111827] text-center">
                                Upload Banner
                            </Text>

                            <Text className="text-[14px] text-[#6B7280] text-center mt-2">
                                Target: {targetSection} • Required size: {activeRule.label}
                            </Text>

                            {!imageFile ? (
                                <Text className="text-[16px] text-[#6B7280] text-center mt-3 leading-6">
                                    Drag and drop or browse to upload your{'\n'}banner image.
                                </Text>
                            ) : (
                                <View className="mt-4 items-center">
                                    <Image
                                        source={{ uri: imageFile.uri }}
                                        style={{ width: 240, height: 140, borderRadius: 12 }}
                                    />
                                    <Text className="text-[12px] text-[#6B7280] mt-2">
                                        Selected: {imageFile.width}×{imageFile.height} • {imageFile.type}
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={pickImage}
                                className="mt-6 self-center bg-[#1F56D8] px-6 py-3 rounded-xl flex-row items-center"
                            >
                                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                <Text className="text-white text-[16px] font-semibold ml-2">
                                    {imageFile ? 'Change File' : 'Browse Files'}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Ad Title */}
                        <View className="mt-8">
                            <FieldLabel>Ad Title  xxxx*</FieldLabel>
                            <BoxInput
                                placeholder="Enter ad title"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        {/* Description */}
                        <View className="mt-6">
                            <FieldLabel>Description *</FieldLabel>
                            <BoxInput
                                placeholder="Enter ad description"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {/* Target Section */}
                        <View className="mt-6">
                            <FieldLabel>Target Section *</FieldLabel>
                            <SelectBox
                                placeholder={targetSection}
                                onPress={() => setTargetModalOpen(true)}
                                rightIcon={<Ionicons name="chevron-down" size={20} color="#6B7280" />}
                            />
                        </View>

                        {/* Target URL */}
                        <View className="mt-6">
                            <FieldLabel>Target URL *</FieldLabel>
                            <BoxInput
                                placeholder="https://dealnux.com/..."
                                value={targetUrl}
                                onChangeText={setTargetUrl}
                            />
                        </View>

                        {/* Total Budget */}
                        <View className="mt-6">
                            <FieldLabel>Total Budget *</FieldLabel>
                            <BoxInput
                                placeholder="0.00"
                                value={budget}
                                keyboardType="numeric"
                                onChangeText={onBudgetChange}
                                rightIcon={<Text className="text-[#6B7280] font-semibold">$</Text>}
                            />
                        </View>

                        {/* Start / End Date */}
                        <View className="mt-6">
                            <View className="flex-row justify-between">
                                <Text className="text-[16px] font-semibold text-[#6B7280] mb-2">
                                    Start Date *
                                </Text>
                                <Text className="text-[16px] font-semibold text-[#6B7280] mb-2">
                                    End Date *
                                </Text>
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <SelectBox
                                        placeholder={startDate ? formatYYYYMMDD(startDate) : 'mm/dd/yyyy'}
                                        muted={!startDate}
                                        onPress={() => setShowStartPicker(true)}
                                        rightIcon={
                                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                        }
                                    />
                                </View>
                                <View className="flex-1">
                                    <SelectBox
                                        placeholder={endDate ? formatYYYYMMDD(endDate) : 'mm/dd/yyyy'}
                                        muted={!endDate}
                                        onPress={() => setShowEndPicker(true)}
                                        rightIcon={
                                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                        }
                                    />
                                </View>
                            </View>

                            {showStartPicker && (
                                <DateTimePicker
                                    value={startDate ?? new Date()}
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
                                    value={endDate ?? new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(_, date) => {
                                        setShowEndPicker(false);
                                        if (date) setEndDate(date);
                                    }}
                                />
                            )}
                        </View>

                        {/* Submit Button */}
                        <Pressable
                            className="mt-10 bg-[#1F56D8] rounded-2xl py-5 flex-row items-center justify-center"
                            style={{
                                shadowColor: '#000',
                                shadowOpacity: 0.14,
                                shadowRadius: 14,
                                shadowOffset: { width: 0, height: 10 },
                                elevation: 6,
                            }}
                            onPress={handleSaveChanges}
                        >
                            <Text className="text-white text-[18px] font-extrabold">
                                Submit for approval
                            </Text>
                            <Ionicons
                                name="arrow-forward"
                                size={22}
                                color="white"
                                style={{ marginLeft: 10 }}
                            />
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Target Modal */}
            <Modal
                transparent
                visible={targetModalOpen}
                animationType="fade"
                onRequestClose={() => setTargetModalOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setTargetModalOpen(false)}
                >
                    <Pressable className="bg-white rounded-t-2xl p-5" onPress={() => { }}>
                        <Text className="text-[18px] font-bold text-[#111827] mb-3">
                            Select Target
                        </Text>

                        {targets.map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => onChangeTarget(t)}
                                className="py-4 border-b border-[#E5E7EB] flex-row items-center justify-between"
                            >
                                <Text className="text-[18px] text-[#111827]">{t}</Text>
                                {targetSection === t ? (
                                    <Ionicons name="checkmark" size={20} color="#1F56D8" />
                                ) : null}
                            </Pressable>
                        ))}

                        <Text className="text-[13px] text-[#6B7280] mt-3">
                            Changing target resets selected image.
                        </Text>
                    </Pressable>
                </Pressable>
            </Modal>

            <SuccessModal
                visible={showSuccessModal}
                title="Submit Successful!"
                description="If approved, campaign runs automatically."
                onClose={() => setShowSuccessModal(false)}
            />

            <Toast
                style={toast.style}
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                onHide={toast.hide}
            />
        </SafeAreaView>
    );
};

export default CreateAds;