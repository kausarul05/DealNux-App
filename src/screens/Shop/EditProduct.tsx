import {
    CATEGORIES_LIST,
    DELETE_PRODUCT,
    GET_PRODUCT,
    IPA_BASE,
    UPDATE_PRODUCT,
} from '@env';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import SuccessModal from '../../components/SuccessModal';
import { Toast, useToast } from '../../components/useToost';
import { AuthStackParamList } from '../../Navigation/types';

type RouteParams = {
    productId: string | number;
};

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
}: {
    placeholder: string;
    rightIcon?: React.ReactNode;
    onPress: () => void;
}) => (
    <Pressable
        onPress={onPress}
        className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-4 flex-row items-center justify-between"
    >
        <Text className="text-[18px] text-[#111827] flex-1 mr-3">{placeholder}</Text>
        {rightIcon}
    </Pressable>
);

const SkeletonBox = ({
    height = 56,
    className = '',
}: {
    height?: number;
    className?: string;
}) => (
    <View
        className={`bg-[#E5E7EB] rounded-xl ${className}`}
        style={{ height }}
    />
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

const EditProduct = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const route = useRoute();
    const toast = useToast();

    const { productId } = route.params as RouteParams;

    const [fetching, setFetching] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [productLoaded, setProductLoaded] = useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [category, setCategory] = useState('');
    const [categoryName, setCategoryName] = useState('');
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
    const [shippingCost, setShippingCost] = useState('');
    const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('');
    const [returnsAccepted, setReturnsAccepted] = useState(true);
    const [returnPeriodDays, setReturnPeriodDays] = useState('');

    const [imageFile, setImageFile] = useState<PickedImage | null>(null);
    const [existingImageUrl, setExistingImageUrl] = useState('');
    const [conditionModalOpen, setConditionModalOpen] = useState(false);

    const productDetailsUrl = `${API_BASE_URL}${GET_PRODUCT}${productId}/`;
    const updateProductUrl = `${API_BASE_URL}${UPDATE_PRODUCT}${productId}/`;
    const deleteProductUrl = `${API_BASE_URL}${DELETE_PRODUCT}${productId}/`;
    const categoryListUrl = `${API_BASE_URL}${CATEGORIES_LIST}`;

    const fetchCategories = async () => {
        const token = await AsyncStorage.getItem('vToken');
        if (!token) return;

        try {
            setCategoryLoading(true);

            const res = await axios.get(categoryListUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            const rawData = res?.data?.data || [];
            const mappedCategories: CategoryItem[] = Array.isArray(rawData)
                ? rawData.map((item: any) => ({
                    id: item?.id,
                    name: item?.name || '',
                    slug: item?.slug || '',
                }))
                : [];

            setCategories(mappedCategories);
        } catch (error: any) {
            console.log('CATEGORY FETCH ERROR =>', error?.response?.data || error);
        } finally {
            setCategoryLoading(false);
        }
    };

    const fetchProductDetails = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            setFetchError('Token missing');
            setFetching(false);
            setProductLoaded(false);
            return;
        }

        try {
            setFetching(true);
            setFetchError('');
            setProductLoaded(false);

            const res = await axios.get(productDetailsUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            const product = res?.data?.data;

            if (!product) {
                setFetchError('Product data not found');
                setProductLoaded(false);
                return;
            }

            setCategory(product?.category_name ?? '');
            setCategoryName(product?.category_name ?? '');
            setTitle(product?.title ?? '');
            setDescription(product?.description ?? '');
            setBrand(product?.brand ?? '');
            setModelNumber(product?.model_number ?? '');
            setPrice(String(product?.price ?? ''));
            setOriginalPrice(String(product?.original_price ?? ''));
            setCurrency((product?.currency ?? 'usd').toLowerCase());
            setQuantity(String(product?.quantity ?? ''));
            setCondition((product?.condition as ConditionType) || 'OPEN_BOX');
            setExistingImageUrl(product?.main_image ?? '');
            setFreeShipping(!!product?.free_shipping);
            setShippingCost(String(product?.shipping_cost ?? '0'));
            setEstimatedDeliveryDays(String(product?.estimated_delivery_days ?? ''));
            setReturnsAccepted(!!product?.returns_accepted);
            setReturnPeriodDays(String(product?.return_period_days ?? ''));

            setProductLoaded(true);
        } catch (error: any) {
            console.log('GET PRODUCT ERROR =>', error);
            console.log('GET PRODUCT RESPONSE DATA =>', error?.response?.data);
            setFetchError(error?.response?.data?.message || 'Failed to fetch product');
            setProductLoaded(false);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchProductDetails();
        fetchCategories();
    }, [productId]);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            let uri = asset.uri;

            // 🔥 ALWAYS CONVERT TO JPG (important)
            const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [],
                {
                    compress: 0.8,
                    format: ImageManipulator.SaveFormat.JPEG,
                }
            );

            const finalUri = manipulated.uri;

            setImageFile({
                uri: finalUri,
                name: `product_${Date.now()}.jpg`,
                type: 'image/jpeg',
            });

            console.log('FINAL IMAGE =>', finalUri);

        } catch (err) {
            console.log('IMAGE ERROR', err);
        }
    };

    const handleUpdateProduct = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({
                message: 'Token missing',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!category.trim()) {
            toast.show({
                message: 'Please select category.',
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

            formData.append('_method', 'PATCH');
            formData.append('category', category.trim());
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

            

            if (imageFile) {
                formData.append('main_image', {
                    uri: imageFile.uri,
                    name: imageFile.name,
                    type: imageFile.type,
                } as any);
            }

            console.log('UPDATE URL =>', updateProductUrl);
            console.log('UPDATE CATEGORY =>', category);
            console.log('UPDATE IMAGE =>', imageFile);
            console.log('UPDATE IMAGE MIME =>', imageFile?.type);
            console.log('UPDATE IMAGE NAME =>', imageFile?.name);
            console.log('UPDATE IMAGE URI =>', imageFile?.uri);

            const res = await axios.patch(updateProductUrl, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000,
            });

            console.log('UPDATE SUCCESS =>', res?.data);

            if (res?.data?.success === true || res?.data?.code === 200) {
                setShowSuccessModal(true);
            } else {
                toast.show({
                    message: res?.data?.message || 'Product update failed',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.log('UPDATE FULL ERROR =>', error);
            console.log('UPDATE RESPONSE =>', error?.response);
            console.log('UPDATE RESPONSE DATA =>', error?.response?.data);
            console.log('UPDATE MESSAGE =>', error?.message);

            toast.show({
                message:
                    error?.response?.data?.message ||
                    error?.message ||
                    'Product update failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({
                message: 'Token missing',
                type: 'error',
                style: 'top',
            });
            return;
        }

        try {
            setDeleteLoading(true);

            const res = await axios.delete(deleteProductUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (res?.data?.success === true || res?.data?.code === 200) {
                toast.show({
                    message: res?.data?.message || 'Product deleted successfully',
                    type: 'success',
                    style: 'top',
                });

                setTimeout(() => {
                    navigation.goBack();
                }, 1000);
            } else {
                toast.show({
                    message: res?.data?.message || 'Delete failed',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.log('DELETE ERROR =>', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Product delete failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    const confirmDeleteProduct = () => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: handleDeleteProduct },
            ]
        );
    };

    useEffect(() => {
        if (!showSuccessModal) return;

        const timer = setTimeout(() => {
            setShowSuccessModal(false);
            navigation.goBack();
        }, 3000);

        return () => clearTimeout(timer);
    }, [showSuccessModal, navigation]);

    if (fetching) {
        return (
            <SafeAreaView className="flex-1 bg-[#F7F7FA]">
                <View className="px-5 py-2">
                    <View className="flex-row items-center">
                        <View className="w-10">
                            <AppHeader left={() => <BackButton />} />
                        </View>
                        <Text className="text-lg ml-4 font-semibold text-[#111827]">
                            Edit Product
                        </Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                    <View className="px-5">
                        <View className="mt-4 bg-white rounded-2xl border border-[#E5E7EB] p-6">
                            <SkeletonBox height={24} />
                            <SkeletonBox height={16} className="mt-3" />
                            <SkeletonBox height={140} className="mt-4" />
                            <SkeletonBox height={48} className="mt-5" />
                        </View>

                        <View className="mt-8">
                            <SkeletonBox height={18} className="mb-2" />
                            <SkeletonBox height={56} />
                        </View>

                        <View className="mt-6">
                            <SkeletonBox height={18} className="mb-2" />
                            <SkeletonBox height={56} />
                        </View>

                        <View className="mt-6">
                            <SkeletonBox height={18} className="mb-2" />
                            <SkeletonBox height={110} />
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!fetching && !productLoaded) {
        return (
            <SafeAreaView className="flex-1 bg-[#F7F7FA]">
                <View className="px-5 py-2">
                    <View className="flex-row items-center">
                        <View className="w-10">
                            <AppHeader left={() => <BackButton />} />
                        </View>
                        <Text className="text-lg ml-4 font-semibold text-[#111827]">
                            Edit Product
                        </Text>
                    </View>
                </View>

                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={54} color="#EF4444" />
                    <Text className="text-[20px] font-bold text-[#111827] mt-4">
                        Failed to load product
                    </Text>
                    <Text className="text-[14px] text-[#6B7280] text-center mt-2">
                        {fetchError || 'Something went wrong while fetching product details.'}
                    </Text>

                    <Pressable
                        onPress={fetchProductDetails}
                        className="mt-6 bg-[#1F56D8] px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-semibold text-[16px]">Retry</Text>
                    </Pressable>
                </View>

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
    }

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
                            Edit Product
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
                                Update Product Image
                            </Text>

                            <Text className="text-[14px] text-[#6B7280] text-center mt-2">
                                Product image change korte chaile upload korun
                            </Text>

                            {!imageFile && !existingImageUrl ? (
                                <Text className="text-[16px] text-[#6B7280] text-center mt-3 leading-6">
                                    Browse to upload your product image.
                                </Text>
                            ) : (
                                <View className="mt-4 items-center">
                                    <Image
                                        source={{ uri: imageFile?.uri || existingImageUrl }}
                                        style={{ width: 240, height: 140, borderRadius: 12 }}
                                        resizeMode="cover"
                                    />
                                    <Text className="text-[12px] text-[#6B7280] mt-2 text-center">
                                        {imageFile?.name || 'Current product image'}
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={pickImage}
                                className="mt-6 self-center bg-[#1F56D8] px-6 py-3 rounded-xl flex-row items-center"
                            >
                                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                <Text className="text-white text-[16px] font-semibold ml-2">
                                    {imageFile || existingImageUrl ? 'Change File' : 'Browse Files'}
                                </Text>
                            </Pressable>
                        </View>

                        <View className="mt-8">
                            <FieldLabel>Category *</FieldLabel>

                            <SelectBox
                                placeholder={categoryName || 'Select category'}
                                onPress={() => setCategoryModalOpen(true)}
                                rightIcon={<Ionicons name="chevron-down" size={20} color="#6B7280" />}
                            />

                            {!!categoryName && (
                                <Text className="text-[13px] text-[#6B7280] mt-2">
                                    Selected: {categoryName}
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
                            onPress={handleUpdateProduct}
                            disabled={loading || deleteLoading || !productLoaded}
                        >
                            <Text className="text-white text-[18px] font-extrabold">
                                {loading ? 'Updating...' : 'Update Product'}
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

                        <Pressable
                            className={`mt-4 rounded-2xl py-5 flex-row items-center justify-center ${deleteLoading ? 'bg-red-300' : 'bg-red-500'
                                }`}
                            onPress={confirmDeleteProduct}
                            disabled={deleteLoading || loading || !productLoaded}
                        >
                            <Ionicons name="trash-outline" size={22} color="white" />
                            <Text className="text-white text-[18px] font-extrabold ml-2">
                                {deleteLoading ? 'Deleting...' : 'Delete Product'}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
                        <Text className="text-[18px] font-bold text-[#111827] mb-3">
                            Select Category
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {categoryLoading ? (
                                <Text className="text-[15px] text-[#6B7280] py-4">
                                    Loading categories...
                                </Text>
                            ) : categories.length === 0 ? (
                                <Text className="text-[15px] text-[#6B7280] py-4">
                                    No categories found
                                </Text>
                            ) : (
                                categories.map((item) => (
                                    <Pressable
                                        key={String(item.id)}
                                        onPress={() => {
                                            setCategory(item.name);
                                            setCategoryName(item.name);
                                            setCategoryModalOpen(false);
                                        }}
                                        className="py-4 border-b border-[#E5E7EB] flex-row items-center justify-between"
                                    >
                                        <Text className="text-[16px] text-[#111827] flex-1 mr-3">
                                            {item.name}
                                        </Text>

                                        {category === item.name ? (
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
                title="Update Successful!"
                description="Your product has been updated successfully."
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

export default EditProduct;