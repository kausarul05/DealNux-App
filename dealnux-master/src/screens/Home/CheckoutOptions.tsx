import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { Images } from '../../constants'
import { AuthStackParamList } from '../../Navigation/types'

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const CheckoutOptions = () => {

    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    return (
        <SafeAreaView className="flex-1 bg-[#F9F9FB]">
            <View className="px-5  ">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} middle={() => <Text className="text-lg font-semibold">Checkout Options</Text>} />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} className='mb-4'>
                    <Text className='text-2xl font-bold mb-2'>Choose your path</Text>
                    <Text className='text-[#636F85] text-xl'>We found a way to save you money by splitting your order. Choose between maximum savings or single-shipment convenience.</Text>
                    <View className='border-2 border-[#D1D6DB] rounded-3xl p-4 my-4'>

                        <Text className='absolute right-0 p-2 rounded-bl-xl rounded-tr-3xl text-[#636F85] text-lg bg-[#F3F4F6]'>Convenience Option</Text>

                        <View className='flex-row items-center gap-4 my-4'>
                            <Ionicons name="wallet" size={30} color="#2355B6" className='p-4 bg-[#2355B61A] rounded-full' />
                            <View>
                                <Text className='text-2xl font-bold'>
                                    Single Store
                                </Text>
                                <Text className='text-xl text-[#636F85]'>
                                    Convenience Option
                                </Text>
                            </View>
                        </View>
                        <View className='bg-[#F3F4F6] p-4 rounded-xl my-2'>
                            <View className='flex-row justify-between items-center'>
                                <Text className='text-xl font-semibold'>
                                    All items from Best Buy
                                </Text>
                                <View className='flex-row justify-end '>
                                    <Image source={Images.Amazon} className='border-4 border-white rounded-full  ' />
                                    <Image source={Images.BestBuy} className='border-4 border-white rounded-full right-2' />
                                    <Image source={Images.Wallmart} className='border-4 border-white rounded-full right-6 ' />
                                </View>
                            </View>
                            <Text className='text-[#636F85] text-xl w-80'>1 shipment • Arrives by Friday, Nov 24</Text>
                        </View>
                        <View className='border-t-2 border-[#D1D6DB] pt-4 mt-2 -mx-4 px-4 flex-row justify-between items-center'>
                            <View>
                                <Text className='text-[#636F85] text-lg'>Total Cost</Text>
                                <Text className='text-2xl font-bold'>$1500.00</Text>
                            </View>
                            <Text className='text-white bg-[#0E1B35] px-6 py-4 text-lg font-bold rounded-xl'>
                                Select Option
                            </Text>
                        </View>
                    </View>
                    <View className="border-[#1D4ED8] border-2 rounded-3xl p-4 my-2 mb-16">

                        {/* BEST VALUE badge */}
                        <Text className="absolute right-0 top-0 px-3 py-2 rounded-bl-xl rounded-tr-3xl text-white text-sm font-bold bg-[#1D4ED8]">
                            BEST VALUE
                        </Text>

                        {/* Header */}
                        <View className="flex-row items-center gap-4 mt-8 mb-4">
                         
                            <MaterialIcons name="storefront" size={30} color="#2355B6" className='bg-[#2355B61A] p-4 rounded-full' />

                            <View>
                                <Text className="text-xl font-bold">
                                    Optimized Split
                                </Text>
                                <Text className="text-lg text-[#636F85]">
                                    Convenience Option
                                </Text>
                            </View>
                        </View>

                        {/* Store rows */}
                        <View className="gap-3 mt-2">
                            {/* Row 1 */}
                            <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                    <Image source={Images.Wallmart} className="rounded-full" />
                                    <View>
                                        <Text className="text-xl font-bold text-[#0E1B35]">Walmart</Text>
                                        <Text className="text-lg text-[#636F85]">Headphone</Text>
                                    </View>
                                </View>

                                <Image source={Images.Amazon} className="rounded-xl" />
                            </View>

                            {/* Row 2 */}
                            <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                    <Image source={Images.Wallmart} className="w-10 h-10 rounded-full" />
                                    <View>
                                        <Text className="text-xl font-bold ">Amazon</Text>
                                        <Text className="text-lg text-[#636F85]">Shoes & Blender</Text>
                                    </View>
                                </View>

                                <Image source={Images.Amazon} className="w-10 h-10 rounded-xl" />
                            </View>
                        </View>

                        {/* Divider full width */}
                        <View className="border-t border-[#D1D6DB] mt-5 -mx-4" />

                        {/* Footer */}
                        <View className="mt-4">
                            <View className="flex-row items-center gap-3">
                                <Text className="text-lg text-[#636F85] font-bold">Total Cost</Text>
                                <View className="bg-[#27C8401A] px-3 py-1 rounded-xl">
                                    <Text className="text-[#137C0A] text-lg font-bold">Save $50.00</Text>
                                </View>
                            </View>

                            <Text className=" text-2xl font-extrabold mt-2">$1450.00</Text>

                            <Text className="text-xl text-[#636F85] ">
                                2 shipments • Arrives by Friday & Monday
                            </Text>

                            {/* CTA Button */}
                            <Pressable onPress={() => navigation.navigate("SavingsSummary")} className="mt-2 bg-[#1D4ED8] border-dashed rounded-2xl py-4 flex-row items-center justify-center gap-3">
                                <Text className="text-white text-xl font-bold">
                                    Select Optimized Option
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="white" />
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    )
}

export default CheckoutOptions


