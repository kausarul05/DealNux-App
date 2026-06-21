import {
    ADD_PRODUCT,
    CATEGORIES_LIST,
    IPA_BASE,
} from '@env';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import SuccessModal from '../../components/SuccessModal';
import { Toast, useToast } from '../../components/useToost';
import { AuthStackParamList } from '../../Navigation/types';

type CategoryItem = {
    id: string | number;
    name: string;
    slug?: string;
};

type PickedImage = {
    uri: string;
    name: string;
    type: string;
    width?: number;
    height?: number;
};

type BoxInputProps = {
    placeholder?: string;
    multiline?: boolean;
    value: string;
    onChangeText: (text: string) => void;
    rightIcon?: React.ReactNode;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    editable?: boolean;
};

const API_BASE_URL = IPA_BASE;
const ADD_PRODUCT_URL = `${API_BASE_URL}${ADD_PRODUCT}`;
const CATEGORY_LIST_URL = `${API_BASE_URL}${CATEGORIES_LIST}`;

const conditionOptions = ['NEW', 'USED', 'REFURBISHED', 'OPEN_BOX'] as const;
type ConditionType = (typeof conditionOptions)[number];

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <Text className="text-[16px] font-semibold text-[#6B7280] mb-2">
        {children}
    </Text>
);

const BoxInput = ({
    placeholder,
    multiline,
    value,
    onChangeText,
    rightIcon,
    keyboardType = 'default',
    editable = true,
}: BoxInputProps) => (
    <View className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
        <View className="flex-row items-center">
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType}
                editable={editable}
                className={`flex-1 text-[18px] text-[#111827] ${multiline ? 'min-h-[96px]' : ''}`}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                blurOnSubmit={!multiline}
            />
            {rightIcon ? <View className="ml-3">{rightIcon}</View> : null}
        </View>
    </View>
);

const SelectBox = ({
    placeholder,
    rightIcon,
    onPress,
    loading = false,
}: {
    placeholder: string;
    rightIcon?: React.ReactNode;
    onPress: () => void;
    loading?: boolean;
}) => (
    <Pressable
        onPress={onPress}
        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 flex-row items-center justify-between"
        disabled={loading}
    >
        <Text className="text-[18px] text-[#111827] flex-1 mr-3">{placeholder}</Text>
        {loading ? <ActivityIndicator size="small" color="#6B7280" /> : rightIcon}
    </Pressable>
);

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

const AddProduct = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ Category - Now storing ID and Name separately
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState('');
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [brand, setBrand] = useState('');
    const [modelNumber, setModelNumber] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [currency, setCurrency] = useState('usd');
    const [quantity, setQuantity] = useState('');
    const [condition, setCondition] = useState<ConditionType>('OPEN_BOX');
    const [freeShipping, setFreeShipping] = useState(true);
    const [shippingCost, setShippingCost] = useState('0');
    const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('');
    const [returnsAccepted, setReturnsAccepted] = useState(true);
    const [returnPeriodDays, setReturnPeriodDays] = useState('');
    const [conditionModalOpen, setConditionModalOpen] = useState(false);

    const [imageFile, setImageFile] = useState<PickedImage | null>(null);

    const fetchCategories = async () => {
        const token = await AsyncStorage.getItem('vToken');
        if (!token) return;

        try {
            setCategoryLoading(true);

            const res = await axios.get(CATEGORY_LIST_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            console.log('📂 Categories API Response:', res?.data);

            // ✅ Handle different response structures
            let rawData = res?.data?.data || res?.data || [];

            // If the response has a 'results' field (common in DRF)
            if (rawData.results) {
                rawData = rawData.results;
            }

            const mappedCategories: CategoryItem[] = Array.isArray(rawData)
                ? rawData.map((item: any) => ({
                    id: item?.id,
                    name: item?.name || '',
                    slug: item?.slug || '',
                }))
                : [];

            setCategories(mappedCategories);
            console.log('✅ Categories loaded:', mappedCategories.length);
        } catch (error: any) {
            console.log('❌ CATEGORY FETCH ERROR =>', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Failed to load categories',
                type: 'error',
                style: 'top',
            });
        } finally {
            setCategoryLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const pickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                toast.show({
                    message: 'Gallery permission denied',
                    type: 'error',
                    style: 'top',
                });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
                allowsEditing: false,
                legacy: true,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (!asset?.uri) return;

            let uri = asset.uri;

            let ext =
                (asset.fileName && asset.fileName.includes('.')
                    ? asset.fileName.split('.').pop()?.toLowerCase()
                    : undefined) || getExtFromUri(uri);

            ext = ext || 'jpg';

            let mime = (asset as any).mimeType || mimeFromExt(ext);

            if (mime === 'image/heic' || ext === 'heic' || ext === 'heif') {
                const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
                    compress: 1,
                    format: ImageManipulator.SaveFormat.JPEG,
                });

                uri = manipulated.uri;
                ext = 'jpg';
                mime = 'image/jpeg';
            }

            const fileName =
                asset.fileName && asset.fileName.includes('.')
                    ? asset.fileName.replace(/\.(heic|heif)$/i, '.jpg')
                    : `product_${Date.now()}.${ext}`;

            setImageFile({
                uri,
                name: fileName,
                type: mime || 'image/jpeg',
                width: asset.width,
                height: asset.height,
            });
        } catch (error) {
            toast.show({
                message: 'Image pick failed',
                type: 'error',
                style: 'top',
            });
        }
    };

    const handleAddProduct = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({
                message: 'Token missing',
                type: 'error',
                style: 'top',
            });
            return;
        }

        // ✅ Validate Category ID
        if (!selectedCategoryId) {
            toast.show({
                message: 'Please select a category.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!title.trim()) {
            toast.show({
                message: 'Please enter product title.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!description.trim()) {
            toast.show({
                message: 'Please enter description.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!brand.trim()) {
            toast.show({
                message: 'Please enter brand.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!modelNumber.trim()) {
            toast.show({
                message: 'Please enter model number.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!price.trim()) {
            toast.show({
                message: 'Please enter price.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!originalPrice.trim()) {
            toast.show({
                message: 'Please enter original price.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!currency.trim()) {
            toast.show({
                message: 'Please enter currency.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!quantity.trim()) {
            toast.show({
                message: 'Please enter quantity.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!imageFile) {
            toast.show({
                message: 'Please select product image.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!freeShipping && !shippingCost.trim()) {
            toast.show({
                message: 'Please enter shipping cost.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!estimatedDeliveryDays.trim()) {
            toast.show({
                message: 'Please enter estimated delivery days.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (returnsAccepted && !returnPeriodDays.trim()) {
            toast.show({
                message: 'Please enter return period days.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        const priceNum = Number(price);
        const originalPriceNum = Number(originalPrice);
        const quantityNum = Number(quantity);
        const shippingCostNum = Number(freeShipping ? '0' : shippingCost || '0');
        const estimatedDaysNum = Number(estimatedDeliveryDays);
        const returnDaysNum = Number(returnPeriodDays || '0');

        if (Number.isNaN(priceNum) || priceNum <= 0) {
            toast.show({
                message: 'Price must be a valid number.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (Number.isNaN(originalPriceNum) || originalPriceNum <= 0) {
            toast.show({
                message: 'Original price must be a valid number.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (Number.isNaN(quantityNum) || quantityNum <= 0) {
            toast.show({
                message: 'Quantity must be a valid number.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (Number.isNaN(shippingCostNum) || shippingCostNum < 0) {
            toast.show({
                message: 'Shipping cost must be valid.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (Number.isNaN(estimatedDaysNum) || estimatedDaysNum <= 0) {
            toast.show({
                message: 'Estimated delivery days must be valid.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (returnsAccepted && (Number.isNaN(returnDaysNum) || returnDaysNum <= 0)) {
            toast.show({
                message: 'Return period days must be valid.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();

            // Send category ID instead of name
            formData.append('category_id', String(selectedCategoryId));
            formData.append('title', title.trim());
            formData.append('description', description.trim());
            formData.append('brand', brand.trim());
            formData.append('model_number', modelNumber.trim());
            formData.append('price', String(priceNum));
            formData.append('original_price', String(originalPriceNum));
            formData.append('currency', currency.trim().toLowerCase());
            formData.append('quantity', String(quantityNum));
            formData.append('condition', condition);
            formData.append('free_shipping', freeShipping ? 'true' : 'false');
            formData.append('shipping_cost', freeShipping ? '0' : String(shippingCostNum));
            formData.append('estimated_delivery_days', String(estimatedDaysNum));
            formData.append('returns_accepted', returnsAccepted ? 'true' : 'false');
            formData.append(
                'return_period_days',
                returnsAccepted ? String(returnDaysNum) : '0'
            );

            formData.append('main_image', {
                uri: imageFile.uri,
                name: imageFile.name || `product_${Date.now()}.jpg`,
                type: imageFile.type || 'image/jpeg',
            } as any);

            console.log('📤 ADD PRODUCT URL =>', ADD_PRODUCT_URL);
            console.log('📤 category_id sending =>', selectedCategoryId);
            console.log('📤 category_name sending =>', selectedCategoryName);

            const res = await axios.post(ADD_PRODUCT_URL, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ ADD PRODUCT RESPONSE =>', res.data);

            if (res?.data?.success === true || res?.data?.code === 200 || res?.data?.code === 201) {
                setShowSuccessModal(true);
            } else {
                toast.show({
                    message: res?.data?.message || 'Product add failed',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.log('❌ ADD PRODUCT FULL ERROR =>', error);
            console.log('❌ ADD PRODUCT RESPONSE =>', error?.response);
            console.log('❌ ADD PRODUCT RESPONSE DATA =>', error?.response?.data);
            console.log('❌ ADD PRODUCT MESSAGE =>', error?.message);

            toast.show({
                message: error?.response?.data?.message || error?.message || 'Product add failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!showSuccessModal) return;

        const timer = setTimeout(() => {
            setShowSuccessModal(false);
            navigation.goBack();
        }, 3000);

        return () => clearTimeout(timer);
    }, [showSuccessModal, navigation]);

    return (
        <SafeAreaView className="flex-1 bg-[#F7F7FA]">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="px-5 py-2">
                    <View className="flex-row items-center">
                        <View className="w-10">
                            <AppHeader left={() => <BackButton />} />
                        </View>

                        <Text className="text-lg ml-4 font-semibold text-[#111827]">
                            Add Product
                        </Text>

                        <View className="w-10" />
                    </View>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    <View className="px-5">
                        <View className="mt-4 bg-white rounded-2xl border border-[#D1D5DB] border-dashed p-6">
                            <Text className="text-[22px] font-extrabold text-[#111827] text-center">
                                Upload Product Image
                            </Text>

                            <Text className="text-[14px] text-[#6B7280] text-center mt-2">
                                Product image upload korun
                            </Text>

                            {!imageFile ? (
                                <Text className="text-[16px] text-[#6B7280] text-center mt-3 leading-6">
                                    Browse to upload your product image.
                                </Text>
                            ) : (
                                <View className="mt-4 items-center">
                                    <Image
                                        source={{ uri: imageFile.uri }}
                                        style={{ width: 240, height: 140, borderRadius: 12 }}
                                        resizeMode="cover"
                                    />
                                    <Text className="text-[12px] text-[#6B7280] mt-2 text-center">
                                        {imageFile.name}
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

                        <View className="mt-8">
                            <FieldLabel>Category *</FieldLabel>

                            <SelectBox
                                placeholder={selectedCategoryName || 'Select category'}
                                onPress={() => setCategoryModalOpen(true)}
                                rightIcon={<Ionicons name="chevron-down" size={20} color="#6B7280" />}
                                loading={categoryLoading}
                            />

                            {!!selectedCategoryName && (
                                <Text className="text-[13px] text-[#6B7280] mt-2">
                                    Selected: {selectedCategoryName} (ID: {selectedCategoryId})
                                </Text>
                            )}
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Product Title *</FieldLabel>
                            <BoxInput
                                placeholder="Enter product title"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Description *</FieldLabel>
                            <BoxInput
                                placeholder="Enter product description"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Brand *</FieldLabel>
                            <BoxInput
                                placeholder="Enter brand"
                                value={brand}
                                onChangeText={setBrand}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Model Number *</FieldLabel>
                            <BoxInput
                                placeholder="Enter model number"
                                value={modelNumber}
                                onChangeText={setModelNumber}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Condition *</FieldLabel>
                            <SelectBox
                                placeholder={condition}
                                onPress={() => setConditionModalOpen(true)}
                                rightIcon={<Ionicons name="chevron-down" size={20} color="#6B7280" />}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Price *</FieldLabel>
                            <BoxInput
                                placeholder="0.00"
                                value={price}
                                keyboardType="numeric"
                                onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))}
                                rightIcon={<Text className="text-[#6B7280] font-semibold">$</Text>}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Original Price *</FieldLabel>
                            <BoxInput
                                placeholder="0.00"
                                value={originalPrice}
                                keyboardType="numeric"
                                onChangeText={(t) => setOriginalPrice(t.replace(/[^0-9.]/g, ''))}
                                rightIcon={<Text className="text-[#6B7280] font-semibold">$</Text>}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Currency *</FieldLabel>
                            <BoxInput
                                placeholder="usd"
                                value={currency}
                                onChangeText={setCurrency}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Quantity *</FieldLabel>
                            <BoxInput
                                placeholder="Enter quantity"
                                value={quantity}
                                keyboardType="numeric"
                                onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))}
                            />
                        </View>

                        <View className="mt-6 bg-white border border-[#E5E7EB] rounded-xl px-4 py-4">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[16px] font-semibold text-[#111827]">
                                    Free Shipping
                                </Text>
                                <Switch
                                    value={freeShipping}
                                    onValueChange={(value) => {
                                        setFreeShipping(value);
                                        if (value) setShippingCost('0');
                                    }}
                                />
                            </View>
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Shipping Cost *</FieldLabel>
                            <BoxInput
                                placeholder="0.00"
                                value={freeShipping ? '0' : shippingCost}
                                keyboardType="numeric"
                                editable={!freeShipping}
                                onChangeText={(t) => setShippingCost(t.replace(/[^0-9.]/g, ''))}
                                rightIcon={<Text className="text-[#6B7280] font-semibold">$</Text>}
                            />
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Estimated Delivery Days *</FieldLabel>
                            <BoxInput
                                placeholder="Enter delivery days"
                                value={estimatedDeliveryDays}
                                keyboardType="numeric"
                                onChangeText={(t) =>
                                    setEstimatedDeliveryDays(t.replace(/[^0-9]/g, ''))
                                }
                            />
                        </View>

                        <View className="mt-6 bg-white border border-[#E5E7EB] rounded-xl px-4 py-4">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[16px] font-semibold text-[#111827]">
                                    Returns Accepted
                                </Text>
                                <Switch
                                    value={returnsAccepted}
                                    onValueChange={(value) => {
                                        setReturnsAccepted(value);
                                        if (!value) setReturnPeriodDays('0');
                                    }}
                                />
                            </View>
                        </View>

                        <View className="mt-6">
                            <FieldLabel>Return Period Days *</FieldLabel>
                            <BoxInput
                                placeholder="Enter return days"
                                value={returnsAccepted ? returnPeriodDays : '0'}
                                keyboardType="numeric"
                                editable={returnsAccepted}
                                onChangeText={(t) => setReturnPeriodDays(t.replace(/[^0-9]/g, ''))}
                            />
                        </View>

                        <Pressable
                            className={`mt-10 rounded-2xl py-5 flex-row items-center justify-center ${loading ? 'bg-[#7EA2F2]' : 'bg-[#1F56D8]'
                                }`}
                            style={{
                                shadowColor: '#000',
                                shadowOpacity: 0.14,
                                shadowRadius: 14,
                                shadowOffset: { width: 0, height: 10 },
                                elevation: 6,
                            }}
                            onPress={handleAddProduct}
                            disabled={loading}
                        >
                            <Text className="text-white text-[18px] font-extrabold">
                                {loading ? 'Submitting...' : 'Add Product'}
                            </Text>

                            {!loading && (
                                <Ionicons
                                    name="arrow-forward"
                                    size={22}
                                    color="white"
                                    style={{ marginLeft: 10 }}
                                />
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ✅ Category Modal - Updated to show loading state and better UX */}
            <Modal
                transparent
                visible={categoryModalOpen}
                animationType="fade"
                onRequestClose={() => setCategoryModalOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setCategoryModalOpen(false)}
                >
                    <Pressable className="bg-white rounded-t-2xl p-5 max-h-[70%]" onPress={() => { }}>
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-[18px] font-bold text-[#111827]">
                                Select Category
                            </Text>
                            {categoryLoading && (
                                <ActivityIndicator size="small" color="#1F56D8" />
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {categoryLoading ? (
                                <View className="py-8 items-center">
                                    <ActivityIndicator size="large" color="#1F56D8" />
                                    <Text className="text-[15px] text-[#6B7280] mt-3">
                                        Loading categories...
                                    </Text>
                                </View>
                            ) : categories.length === 0 ? (
                                <View className="py-8 items-center">
                                    <Text className="text-[15px] text-[#6B7280]">
                                        No categories found
                                    </Text>
                                    <Pressable
                                        onPress={fetchCategories}
                                        className="mt-3 px-4 py-2 bg-[#1F56D8] rounded-xl"
                                    >
                                        <Text className="text-white font-semibold">Retry</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                categories.map((item) => (
                                    <Pressable
                                        key={String(item.id)}
                                        onPress={() => {
                                            setSelectedCategoryId(item.id);
                                            setSelectedCategoryName(item.name);
                                            setCategoryModalOpen(false);
                                        }}
                                        className="py-4 border-b border-[#E5E7EB] flex-row items-center justify-between"
                                    >
                                        <Text className="text-[16px] text-[#111827] flex-1 mr-3">
                                            {item.name}
                                        </Text>

                                        {selectedCategoryId === item.id ? (
                                            <Ionicons name="checkmark" size={20} color="#1F56D8" />
                                        ) : null}
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                transparent
                visible={conditionModalOpen}
                animationType="fade"
                onRequestClose={() => setConditionModalOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40 justify-end"
                    onPress={() => setConditionModalOpen(false)}
                >
                    <Pressable className="bg-white rounded-t-2xl p-5" onPress={() => { }}>
                        <Text className="text-[18px] font-bold text-[#111827] mb-3">
                            Select Condition
                        </Text>

                        {conditionOptions.map((item) => (
                            <Pressable
                                key={item}
                                onPress={() => {
                                    setCondition(item);
                                    setConditionModalOpen(false);
                                }}
                                className="py-4 border-b border-[#E5E7EB] flex-row items-center justify-between"
                            >
                                <Text className="text-[18px] text-[#111827]">{item}</Text>
                                {condition === item ? (
                                    <Ionicons name="checkmark" size={20} color="#1F56D8" />
                                ) : null}
                            </Pressable>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            <SuccessModal
                visible={showSuccessModal}
                title="Product Added!"
                description="Your product has been added successfully."
                onClose={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
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

export default AddProduct;