import { Ionicons, Feather } from '@expo/vector-icons';
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
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStripe } from '@stripe/stripe-react-native';

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

const { width } = Dimensions.get('window');
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

// ─── Main Component ───────────────────────────────────────────────────────────
const CreateAds = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();
    const route = useRoute<any>();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [showPaymentSheet, setShowPaymentSheet] = useState(false);

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

    const onChangeTarget = useCallback((t: (typeof targets)[number]) => {
        setTargetSection(t);
        setTargetModalOpen(false);
        setImageFile(null);
    }, []);

    const onBudgetChange = useCallback((t: string) => {
        setBudget(t.replace(/[^0-9.]/g, ''));
    }, []);

    // ── Image Picker ──────────────────────────────────────────────────────────
    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            toast.show({ message: 'Gallery permission denied', type: 'error', style: 'top' });
            return;
        }

        let result: ImagePicker.ImagePickerResult;

        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsEditing: false,
                legacy: true,
            });
        } catch (e: any) {
            toast.show({ message: 'Image picker failed: ' + (e?.message || ''), type: 'error', style: 'top' });
            return;
        }

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        if (!asset?.uri) return;

        let uri = asset.uri;

        let ext =
            asset.fileName && asset.fileName.includes('.')
                ? asset.fileName.split('.').pop()?.toLowerCase() ?? ''
                : getExtFromUri(uri);

        if (!ext) ext = 'jpg';

        let mime: string = (asset as any).mimeType || mimeFromExt(ext);

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

    // ─── Submit ────────────────────────────────────────────────────────────────
    const handleSaveChanges = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({ message: 'Token missing', type: 'error', style: 'top' });
            return;
        }

        // ─── Validations ──────────────────────────────────────────────────────
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
            toast.show({ message: 'Please select start date.', type: 'error', style: 'top' });
            return;
        }
        if (!endDate) {
            toast.show({ message: 'Please select end date.', type: 'error', style: 'top' });
            return;
        }
        if (endDate.getTime() < startDate.getTime()) {
            toast.show({ message: 'End date must be after start date.', type: 'error', style: 'top' });
            return;
        }

        setLoading(true);

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

            console.log('✅ POST response:', res.data);

            if (res.status === 201 || res.status === 200) {
                const clientSecret = res.data?.client_secret;
                const paymentId = res.data?.payment_id;

                // ✅ If there's a client_secret, show Payment Sheet
                if (clientSecret) {
                    // ✅ Initialize Payment Sheet with the client secret
                    const { error: initError } = await initPaymentSheet({
                        paymentIntentClientSecret: clientSecret,
                        merchantDisplayName: 'DealNux',
                        allowsDelayedPaymentMethods: true,
                    });

                    if (initError) {
                        console.error('Init error:', initError);
                        toast.show({
                            message: initError?.message || 'Failed to initialize payment',
                            type: 'error',
                            style: 'top',
                        });
                        setLoading(false);
                        return;
                    }

                    // ✅ Present Payment Sheet
                    const { error: presentError } = await presentPaymentSheet();

                    if (presentError) {
                        console.error('Present error:', presentError);
                        if (presentError.code === 'Canceled') {
                            toast.show({
                                message: 'Payment was cancelled',
                                type: 'info',
                                style: 'top',
                            });
                        } else {
                            toast.show({
                                message: presentError?.message || 'Payment failed',
                                type: 'error',
                                style: 'top',
                            });
                        }
                    } else {
                        // ✅ Payment successful
                        toast.show({
                            message: 'Payment successful! Your ad is now active.',
                            type: 'success',
                            style: 'top',
                        });
                        setShowSuccessModal(true);
                    }
                } else {
                    // No payment required (free ad)
                    setShowSuccessModal(true);
                    toast.show({
                        message: 'Ad created successfully!',
                        type: 'success',
                        style: 'top',
                    });
                }
            } else {
                toast.show({
                    message: res.data?.message || 'Ads create failed',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('❌ POST error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Ads create failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setLoading(false);
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
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <AppHeader left={() => <BackButton />} />
                        <Text style={styles.headerTitle}>Create Ad</Text>
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formContainer}>
                        {/* Upload Section */}
                        <View style={styles.uploadCard}>
                            <View style={styles.uploadHeader}>
                                <View style={styles.uploadIconContainer}>
                                    <Ionicons name="image-outline" size={28} color="#2355B6" />
                                </View>
                                <Text style={styles.uploadTitle}>Upload Banner</Text>
                                <Text style={styles.uploadSubtitle}>
                                    Target: {targetSection} • {activeRule.label}
                                </Text>
                            </View>

                            {!imageFile ? (
                                <TouchableOpacity
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                    style={styles.uploadArea}
                                >
                                    <Feather name="upload" size={40} color="#9CA3AF" />
                                    <Text style={styles.uploadAreaText}>Browse to upload</Text>
                                    <Text style={styles.uploadAreaSubtext}>PNG, JPG, JPEG up to 5MB</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{ uri: imageFile.uri }}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.imageInfoRow}>
                                        <Text style={styles.imageInfoText}>
                                            {imageFile.width}×{imageFile.height}
                                        </Text>
                                        <View style={styles.imageDot} />
                                        <Text style={styles.imageInfoText}>
                                            {imageFile.type}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={pickImage}
                                        style={styles.changeButton}
                                    >
                                        <Feather name="refresh-cw" size={14} color="#6B7280" />
                                        <Text style={styles.changeButtonText}>Change</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Form Fields */}
                        <View style={styles.fieldsContainer}>
                            {/* Title */}
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Ad Title</Text>
                                    <Text style={styles.required}>*</Text>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputIconContainer}>
                                        <Ionicons name="text-outline" size={20} color="#9CA3AF" />
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter ad title"
                                        placeholderTextColor="#9CA3AF"
                                        value={title}
                                        onChangeText={setTitle}
                                    />
                                </View>
                            </View>

                            {/* Description */}
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Description</Text>
                                    <Text style={styles.required}>*</Text>
                                </View>
                                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                                    <View style={styles.inputIconContainer}>
                                        <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
                                    </View>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Enter ad description"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        value={description}
                                        onChangeText={setDescription}
                                    />
                                </View>
                            </View>

                            {/* Target Section */}
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Target Section</Text>
                                    <Text style={styles.required}>*</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.selectBox}
                                    onPress={() => setTargetModalOpen(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.selectBoxText}>{targetSection}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Target URL */}
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Target URL</Text>
                                    <Text style={styles.required}>*</Text>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputIconContainer}>
                                        <Ionicons name="link-outline" size={20} color="#9CA3AF" />
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="https://dealnux.com/..."
                                        placeholderTextColor="#9CA3AF"
                                        value={targetUrl}
                                        onChangeText={setTargetUrl}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            {/* Budget */}
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Total Budget</Text>
                                    <Text style={styles.required}>*</Text>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputIconContainer}>
                                        <Ionicons name="cash-outline" size={20} color="#9CA3AF" />
                                    </View>
                                    <TextInput
                                        style={[styles.input, styles.budgetInput]}
                                        placeholder="0.00"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={budget}
                                        onChangeText={onBudgetChange}
                                    />
                                    <Text style={styles.budgetSymbol}>$</Text>
                                </View>
                            </View>

                            {/* Dates */}
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>Start & End Date</Text>
                                    <Text style={styles.required}>*</Text>
                                </View>
                                <View style={styles.dateRow}>
                                    <View style={styles.dateItem}>
                                        <TouchableOpacity
                                            style={styles.selectBox}
                                            onPress={() => setShowStartPicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.selectBoxText, !startDate && styles.placeholderText]}>
                                                {startDate ? formatYYYYMMDD(startDate) : 'Start Date'}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.dateItem}>
                                        <TouchableOpacity
                                            style={styles.selectBox}
                                            onPress={() => setShowEndPicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.selectBoxText, !endDate && styles.placeholderText]}>
                                                {endDate ? formatYYYYMMDD(endDate) : 'End Date'}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <LinearGradient
                            colors={['#2355B6', '#1A4D8F']}
                            style={styles.submitGradient}
                        >
                            <TouchableOpacity
                                onPress={handleSaveChanges}
                                disabled={loading}
                                style={styles.submitButton}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Text style={styles.submitButtonText}>Submit for Approval</Text>
                                        <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ─── Target Modal ──────────────────────────────────────────────── */}
            <Modal
                transparent
                visible={targetModalOpen}
                animationType="fade"
                onRequestClose={() => setTargetModalOpen(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setTargetModalOpen(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Target</Text>
                            <TouchableOpacity onPress={() => setTargetModalOpen(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {targets.map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => onChangeTarget(t)}
                                style={styles.modalItem}
                            >
                                <Text style={styles.modalItemText}>{t}</Text>
                                {targetSection === t && (
                                    <Ionicons name="checkmark-circle" size={22} color="#2355B6" />
                                )}
                            </TouchableOpacity>
                        ))}

                        <Text style={styles.modalFooterText}>
                            Changing target will reset selected image
                        </Text>
                    </View>
                </Pressable>
            </Modal>

            {/* ─── Date Pickers ───────────────────────────────────────────────── */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginLeft: 16,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    formContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },

    // Upload Section
    uploadCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    uploadHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    uploadIconContainer: {
        backgroundColor: '#EFF6FF',
        padding: 12,
        borderRadius: 50,
        marginBottom: 8,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    uploadSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFBFC',
    },
    uploadAreaText: {
        fontSize: 15,
        color: '#6B7280',
        marginTop: 8,
        fontWeight: '500',
    },
    uploadAreaSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    imagePreviewContainer: {
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: 180,
        borderRadius: 12,
    },
    imageInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    imageInfoText: {
        fontSize: 12,
        color: '#6B7280',
    },
    imageDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
    changeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
    },
    changeButtonText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },

    // Form Fields
    fieldsContainer: {
        marginTop: 20,
        gap: 16,
    },
    fieldGroup: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    required: {
        color: '#EF4444',
        marginLeft: 4,
        fontSize: 14,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    inputIconContainer: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        paddingVertical: 0,
    },
    textAreaWrapper: {
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    budgetInput: {
        paddingRight: 8,
    },
    budgetSymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    selectBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectBoxText: {
        fontSize: 15,
        color: '#111827',
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateItem: {
        flex: 1,
    },

    // Submit Button
    submitGradient: {
        borderRadius: 16,
        marginTop: 28,
        marginBottom: 8,
        shadowColor: '#2355B6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    submitButton: {
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalItemText: {
        fontSize: 16,
        color: '#111827',
    },
    modalFooterText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 12,
    },
});

export default CreateAds;