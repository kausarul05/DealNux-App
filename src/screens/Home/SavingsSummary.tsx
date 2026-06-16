import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import SecureRedirectModal from '../../components/SecureRedirectModal'
import { Images } from '../../constants'

const SavingsSummary = () => {
    const [modalVisible, setModalVisible] = useState(false)

    return (
        <SafeAreaView className="flex-1 bg-[#F9F9FB]">
            <View className="px-5 ">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} middle={() => <Text className="text-lg font-semibold ">Savings Summary</Text>} />


                </View>
                <ScrollView showsVerticalScrollIndicator={false}
                    className='mb-5'
                >
                    <Image source={Images.SavingsSummary} className='w-full h-64 my-2' resizeMode='cover' />

                    <View  className='flex-row items-center gap-4'>
                        <MaterialCommunityIcons name="ticket-percent" size={30} color="#FFC649" />
                        <Text className='text-xl font-bold'>Coupons applied</Text>
                    </View>
                    <View className='bg-[#27C8401A] border border-[#27C84059] flex-row justify-between items-center p-3 rounded-2xl my-2'>
                        
                        <View className='flex-row items-center justify-center gap-4'>
                            <Ionicons name="checkmark-circle" size={28} color="#137C0A" />
                            <Text className='text-[#137C0A] text-xl'>
                                WELCOME20
                            </Text>
                        </View>
                        <Text className='text-[#137C0A] text-xl'>APPLIED</Text>
                    </View>
                    <View className='bg-[#27C8401A] border border-[#27C84059] flex-row justify-between items-center p-3 rounded-2xl my-2'>
                        
                        <View className='flex-row items-center justify-center gap-4'>
                            <Ionicons name="checkmark-circle" size={28} color="#137C0A" />
                            <Text className='text-[#137C0A] text-xl'>
                                SAVE 50
                            </Text>
                        </View>
                        <Text className='text-[#137C0A] text-xl'>APPLIED</Text>
                    </View>
                    <View className='bg-[#27C8401A] border border-[#27C84059] flex-row justify-between items-center p-3 rounded-2xl my-2'>
                        
                        <View className='flex-row items-center justify-center gap-4'>
                            <Ionicons name="checkmark-circle" size={28} color="#137C0A" />
                            <Text className='text-[#137C0A] text-xl'>
                                DEALNUX5
                            </Text>
                        </View>
                        <Text className='text-[#137C0A] text-xl'>APPLIED</Text>
                    </View>
                    <Text className='text-xl font-bold my-4'>Savings breakdown</Text>
                    <View className='border rounded-3xl p-4 border-[#D1D6DB]'>
                        <View className='flex-row justify-between'>
                            <Text className='text-xl text-[#636F85]'>
                                Original Total
                            </Text>
                            <Text className=' text-xl font-bold line-through'>
                                $1500.00
                            </Text>
                        </View>
                        <View className='flex-row justify-between mt-4'>
                            <Text className='text-xl text-[#137C0A]'>
                                Coupon Savings
                            </Text>
                            <Text className=' text-xl text-[#137C0A] '>
                                -$50.00
                            </Text>
                        </View>
                        <View className='flex-row justify-between my-4 mb-6'>
                            <Text className='text-xl text-[#137C0A]'>
                                Price Match Comparison
                            </Text>
                            <Text className=' text-xl text-[#137C0A]'>
                                -$4.30
                            </Text>
                        </View>
                        <View className='flex-row justify-between -mx-4 -my-4 p-4 rounded-b-2xl bg-[#4b618d21]'>
                            <Text className='text-3xl font-bold'>
                                Final Price
                            </Text>
                            <Text className=' text-3xl text-[#2355B6] font-bold'>
                                $1445.07
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={() => setModalVisible(true)}
                        className="mt-4 bg-[#1D4ED8] rounded-2xl py-5 flex-row items-center justify-center gap-3 mb-10"
                    >
                        <Text className="text-white text-xl font-bold">
                            Continue
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                    </Pressable>
               </ScrollView>
             
            </View>

            <SecureRedirectModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </SafeAreaView>
    )
}

export default SavingsSummary


