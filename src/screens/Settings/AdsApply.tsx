import { ADS_APPLY, IPA_BASE } from '@env'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import axios from 'axios'
import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { Toast, useToast } from '../../components/useToost'
import { AuthStackParamList } from '../../Navigation/types'

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const API_BASE_URL = IPA_BASE;
const END_POINTS = ADS_APPLY;

const AdsApply = () => {
    const navigation = useNavigation<NavigationProp<AuthNavProp>>();
    const toast = useToast();
    const [businessName, setBusinessName] = useState('')
    const [businessDetails, setBusinessDetails] = useState('');
    const [website, setWebsite] = useState('');

    const handleSaveChanges = async () => {
        const token = await AsyncStorage.getItem("vToken");

        if (!token) {
            toast.show({
                message:
                    ("Token missing"),
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!businessName.trim()) {
            toast.show({
                message:
                    ("Please enter your business name."),
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!businessDetails.trim()) {
            toast.show({
                message:
                    ("Please enter your business details."),
                type: 'error',
                style: 'top',
            });
            return;
        }
        

        const formData = new FormData();
        formData.append("business_name", businessName);
        formData.append("business_details", businessDetails);
        formData.append("website", website);


        try {
            const res = await axios.post(`${API_BASE_URL}${END_POINTS}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res.data?.success == true) {
                navigation.goBack()
            } else {
                toast.show({
                    message:
                        ("Business profile create failed"),
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error("PATCH error:", error?.response?.data || error);
            toast.show({
                message:
                    (error?.response?.data?.message || "Business profile create failed"),
                type: 'error',
                style: 'top',
            });
        }
    };
    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5">

                <View className='flex-row items-center gap-4' >
                    <AppHeader left={() => <BackButton />} middle={() => <Text className='text-lg font-semibold'>Create Business Profile</Text>} />


                </View>

                <Text className='text-[#636F85] font-bold text-xl my-2'>Business Name *</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center'>
                        <TextInput
                            placeholder="Enter Business Name"
                            placeholderTextColor="#A0A0A0"
                            value={businessName}
                            onChangeText={setBusinessName}
                        />
                    </View>
                    
                </View>
                <Text className='text-[#636F85] font-bold text-xl my-2'>Business Details *</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center'>
                        <TextInput
                            placeholder="Enter Business Details"
                            placeholderTextColor="#A0A0A0"
                            value={businessDetails}
                            onChangeText={setBusinessDetails}
                        />
                    </View>
                </View>
                <Text className='text-[#636F85] font-bold text-xl my-2'>Website</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-56'>
                    <View className='flex-row items-center gap-5 justify-center'>
                        <TextInput
                            placeholder="Enter Website"
                            placeholderTextColor="#A0A0A0"
                            value={website}
                            onChangeText={setWebsite}
                        />
                    </View>
                </View>




                <TouchableOpacity onPress={handleSaveChanges} activeOpacity={0.9} style={styles.mainButton} className='flex-row items-center justify-center gap-4'>
                    <Text style={styles.mainButtonText}>Save Changes</Text>
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
    )
}

export default AdsApply


const styles = StyleSheet.create({
    mainButton: {
        backgroundColor: '#2355B6',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 16,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
})