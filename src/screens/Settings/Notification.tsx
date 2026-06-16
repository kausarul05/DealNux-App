import React from 'react'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import { Images } from '../../constants'

const Notification = () => {
    const updates = [
        {
            id: '1',
            title: 'DEALNUX',
            subtitle: "DEALNUX v2.1 Released!",
            date: "09:00 AM  15/04/2026",
            isActive: true,
        },
        {
            id: '2',
            title: 'DEALNUX',
            subtitle: "DEALNUX v2.1 Released!",
            date: "09:00 AM  15/04/2026",
            isActive: false,
        },
        {
            id: '3',
            title: 'DEALNUX',
            subtitle: "DEALNUX v2.1 Released!",
            date: "09:00 AM  15/04/2026",
            isActive: false,
        },
        {
            id: '4',
            title: 'DEALNUX',
            subtitle: "DEALNUX v2.1 Released!",
            date: "09:00 AM  15/04/2026",
            isActive: true,
        },
        {
            id: '5',
            title: 'DEALNUX',
            subtitle: "DEALNUX v2.1 Released!",
            date: "09:00 AM  15/04/2026",
            isActive: false,
        },
        {
            id: '6',
            title: 'DEALNUX',
            subtitle: "DEALNUX v2.1 Released!",
            date: "09:00 AM  15/04/2026",
            isActive: true,
        },
    ]
    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5">
                <View className='flex-row items-center gap-4' >
                    <AppHeader left={() => <BackButton />} middle={() => <Text className='text-lg font-semibold'>Notification</Text>} />
                </View>
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xl font-bold text-gray-900">All</Text>
                    <TouchableOpacity>
                        <Text className="text-lg text-[#636F85]">Mark all as read</Text>
                    </TouchableOpacity>
                </View>
            
            <ScrollView
                showsVerticalScrollIndicator={false}
            >
                {updates.map((update) => (
                    <View key={update.id} className="mb-4">
                        <View className="flex-row items-center gap-3 mb-2">
                            <Image
                                className="w-16 h-16 rounded-full"
                                source={Images.ClockIcon}
                                resizeMode="cover"
                            />
                            <View className="flex-1">
                                <Text className="text-xl font-semibold text-gray-900 mb-0.5">
                                    {update.title}
                                </Text>
                                <Text className="text-lg text-[#636F85]">
                                    {update.subtitle}
                                </Text>
                            </View>
                            {update.isActive && (
                                <View className="w-5 h-5 rounded-full bg-blue-400 border-2 border-white" />
                            )}
                        </View>
                        <Text className="text-lg text-[#9BA4B0] text-right mt-1">
                            {update.date}
                        </Text>
                    </View>
                ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    )
}
export default Notification