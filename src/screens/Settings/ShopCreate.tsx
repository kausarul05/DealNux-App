import { IPA_BASE, SHOP_APPLY } from '@env'
import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import axios from 'axios'
import * as DocumentPicker from 'expo-document-picker'
import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { Toast, useToast } from '../../components/useToost'
import { AuthStackParamList } from '../../Navigation/types'

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const API_BASE_URL = IPA_BASE;
const END_POINTS = SHOP_APPLY;

const ShopCreate = () => {
    const navigation = useNavigation<NavigationProp<AuthNavProp>>();
    const toast = useToast();

    const [businessName, setBusinessName] = useState('');
    const [businessDetails, setBusinessDetails] = useState('');
    const [number, setNumber] = useState('');
    const [nidFile, setNidFile] = useState<any>(null);
    const [businessDocumentFile, setBusinessDocumentFile] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const pickNidFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const file = result.assets[0];
                setNidFile(file);
            }
        } catch (error) {
            toast.show({
                message: 'Failed to pick NID file',
                type: 'error',
                style: 'top',
            });
        }
    };

    const pickBusinessDocumentFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const file = result.assets[0];
                setBusinessDocumentFile(file);
            }
        } catch (error) {
            toast.show({
                message: 'Failed to pick business document',
                type: 'error',
                style: 'top',
            });
        }
    };

    const handleSaveChanges = async () => {
        const token = await AsyncStorage.getItem('vToken');

        if (!token) {
            toast.show({
                message: 'Token missing',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!businessName.trim()) {
            toast.show({
                message: 'Please enter your business name.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!businessDetails.trim()) {
            toast.show({
                message: 'Please enter your business details.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!number.trim()) {
            toast.show({
                message: 'Please enter your phone number.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!nidFile) {
            toast.show({
                message: 'Please upload your ID document.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!businessDocumentFile) {
            toast.show({
                message: 'Please upload your business document.',
                type: 'error',
                style: 'top',
            });
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();

            formData.append('shop_name', businessName);
            formData.append('shop_description', businessDetails);
            formData.append('phone_number', number);

            // field name backend onujayi tumi change korba
            formData.append('nid_document', {
                uri: nidFile.uri,
                type: nidFile.mimeType || 'application/octet-stream',
                name: nidFile.name || 'nid_file',
            } as any);

            formData.append('business_document', {
                uri: businessDocumentFile.uri,
                type: businessDocumentFile.mimeType || 'application/octet-stream',
                name: businessDocumentFile.name || 'business_document_file',
            } as any);

            const res = await axios.post(`${API_BASE_URL}${END_POINTS}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.data?.success === true) {
                toast.show({
                    message: 'Shop created successfully',
                    type: 'success',
                    style: 'top',
                });
                navigation.goBack();
            } else {
                toast.show({
                    message: res.data?.message || 'Shop create failed',
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error('POST error:', error?.response?.data || error);
            toast.show({
                message: error?.response?.data?.message || 'Shop create failed',
                type: 'error',
                style: 'top',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5">
                <View className='flex-row items-center gap-4'>
                    <AppHeader
                        left={() => <BackButton />}
                        middle={() => <Text className='text-lg font-semibold'>Create Shop</Text>}
                    />
                </View>

                <Text className='text-[#636F85] font-bold text-xl my-2'>Shop Name *</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center flex-1'>
                        <TextInput
                            placeholder="Enter Business Name"
                            placeholderTextColor="#A0A0A0"
                            value={businessName}
                            onChangeText={setBusinessName}
                            className='flex-1'
                        />
                    </View>
                </View>

                <Text className='text-[#636F85] font-bold text-xl my-2'>Shop Details *</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center flex-1'>
                        <TextInput
                            placeholder="Enter Business Details"
                            placeholderTextColor="#A0A0A0"
                            value={businessDetails}
                            onChangeText={setBusinessDetails}
                            className='flex-1'
                        />
                    </View>
                </View>

                <Text className='text-[#636F85] font-bold text-xl my-2'>Number *</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center flex-1'>
                        <TextInput
                            placeholder="Enter Phone Number"
                            placeholderTextColor="#A0A0A0"
                            value={number}
                            onChangeText={setNumber}
                            keyboardType="phone-pad"
                            className='flex-1'
                        />
                    </View>
                </View>

                <Text className='text-[#636F85] font-bold text-xl my-2'>ID Document *</Text>
                <TouchableOpacity
                    onPress={pickNidFile}
                    activeOpacity={0.8}
                    className='border rounded-2xl border-[#D1D6DB] p-4 mb-4'
                >
                    <Text className='text-[#111827] text-base'>
                        {nidFile?.name ? nidFile.name : 'Upload NID'}
                    </Text>
                    <Text className='text-[#9CA3AF] text-sm mt-1'>JPG, PNG, PDF</Text>
                    <Feather name="camera" className='self-center' size={24} color="black" />
                </TouchableOpacity>

                <Text className='text-[#636F85] font-bold text-xl my-2'>Business Document *</Text>
                <TouchableOpacity
                    onPress={pickBusinessDocumentFile}
                    activeOpacity={0.8}
                    className='border rounded-2xl border-[#D1D6DB] p-4 mb-8'
                >
                    <Text className='text-[#111827] text-base'>
                        {businessDocumentFile?.name ? businessDocumentFile.name : 'Upload Business Document'}
                    </Text>
                    <Text className='text-[#9CA3AF] text-sm mt-1'>JPG, PNG, PDF</Text>
                    <Feather name="camera" className='self-center' size={24} color="black" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSaveChanges}
                    activeOpacity={0.9}
                    style={[styles.mainButton, loading && styles.disabledButton]}
                    className='flex-row items-center justify-center gap-4'
                    disabled={loading}
                >
                    <Text style={styles.mainButtonText}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Text>
                </TouchableOpacity>
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
};

export default ShopCreate;

const styles = StyleSheet.create({
    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});