import { CHANGE_PASSWORD, IPA_BASE } from '@env'
import { Entypo, Ionicons } from '@expo/vector-icons'
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
const END_POINTS = CHANGE_PASSWORD;

const UpdatePassword = () => {
    const navigation = useNavigation<NavigationProp<AuthNavProp>>();
    const toast = useToast();
    const [oldPassword, setOldPassword] = useState('')
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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

        if (!oldPassword.trim()) {
            toast.show({
                message:
                    ("Please enter your old password"),
                type: 'error',
                style: 'top',
            });
            return;
        }

        if (!password.trim()) {
            toast.show({
                message:
                    ("Please enter your password"),
                type: 'error',
                style: 'top',
            });
            return;
        }
        if (!confirmPassword.trim()) {
            toast.show({
                message:
                    ("Please enter your confirm password"),
                type: 'error',
                style: 'top',
            });
            return;
        }

        const formData = new FormData();
        formData.append("old_password", oldPassword);
        formData.append("new_password", password);
        formData.append("confirm_password", confirmPassword);


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
                        ("Password update failed"),
                    type: 'error',
                    style: 'top',
                });
            }
        } catch (error: any) {
            console.error("PATCH error:", error?.response?.data || error);
            toast.show({
                message:
                    (error?.response?.data?.message || "Password Update failed"),
                type: 'error',
                style: 'top',
            });
        }
    };
    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5">

                <View className='flex-row items-center gap-4' >
                    <AppHeader left={() => <BackButton />} middle={() => <Text className='text-lg font-semibold'>Change Password</Text>} />
                    

                </View>

                <Text className='text-[#636F85] font-bold text-xl my-2'>Old Password</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center'>
                        <Entypo name="lock" size={24} color="#334155" />
                        <TextInput
                            placeholder="****************"
                            placeholderTextColor="#A0A0A0"
                            value={oldPassword}
                            onChangeText={setOldPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <Ionicons name="eye-outline" size={24} color="black" /> : <Ionicons name="eye-off-outline" size={24} color="black" />}
                    </TouchableOpacity>
                </View>
                <Text className='text-[#636F85] font-bold text-xl my-2'>New Password</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-4'>
                    <View className='flex-row items-center gap-5 justify-center'>
                        <Entypo name="lock" size={24} color="#334155" />
                        <TextInput
                            placeholder="****************"
                            placeholderTextColor="#A0A0A0"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <Ionicons name="eye-outline" size={24} color="black" /> : <Ionicons name="eye-off-outline" size={24} color="black" />}
                    </TouchableOpacity>
                </View>
                <Text className='text-[#636F85] font-bold text-xl my-2'>Confirm Password</Text>
                <View className='border rounded-2xl border-[#D1D6DB] flex-row p-2 items-center gap-4 pl-4 justify-between mb-56'>
                    <View className='flex-row items-center gap-5 justify-center'>
                        <Entypo name="lock" size={24} color="#334155" />
                        <TextInput
                            placeholder="****************"
                            placeholderTextColor="#A0A0A0"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <Ionicons name="eye-outline" size={24} color="black" /> : <Ionicons name="eye-off-outline" size={24} color="black" />}
                    </TouchableOpacity>
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

export default UpdatePassword


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