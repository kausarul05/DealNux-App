import React, { useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'

const NotificationSettings = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);
    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5">
                <View className='flex-row items-center gap-4' >
                    <AppHeader left={() => <BackButton />} middle={() => <Text className='text-lg font-semibold'>Notification Settings</Text>} />

                </View>
        
                <View className='p-5 bg-white rounded-3xl '>
                    <Text className='text-2xl font-bold'>Alerts</Text>
                    <View className='flex-row justify-between items-center border-t border-[#F7F7F9] my-4'>
                        <View className=''>
                            <Text className='text-xl font-bold'>Price Drop Alerts</Text>
                            <Text>Notify me when watched products
                                decrease in price</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#767577', true: '#2355B6' }}
                            thumbColor={'#f4f3f4'}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                        />
                    </View>
                    <View className='flex-row justify-between items-center border-t border-[#F7F7F9] my-4'>
                        <View>
                            <Text className='text-xl font-bold'>In-Stock Notifications</Text>
                            <Text>Alerts for when out-of-stock items become
                                available</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#767577', true: '#2355B6' }}
                            thumbColor={'#f4f3f4'}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                        />
                    </View>
                    <View className='flex-row justify-between items-center border-t border-[#F7F7F9] my-4'>
                        <View>
                            <Text className='text-xl font-bold'>Personalized Recommendations</Text>
                            <Text>Deals based on your browsing and search history</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#767577', true: '#2355B6' }}
                            thumbColor={'#f4f3f4'}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                        />
                    </View>
                </View>
                <View className='p-5 bg-white rounded-3xl my-4'>
                    <Text className='text-2xl font-bold'>Delivery Alerts</Text>
                    <View className='flex-row justify-between items-center border-t border-[#F7F7F9] my-4'>
                        <Text className='text-xl font-bold'>Push Notifications</Text>
                        <Switch
                            trackColor={{ false: '#767577', true: '#2355B6' }}
                            thumbColor={'#f4f3f4'}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                        />
                    </View>
                    <View className='flex-row justify-between items-center border-t border-[#F7F7F9] my-4'>
                        <Text className='text-xl font-bold'>Email</Text>
                        <Switch
                            trackColor={{ false: '#767577', true: '#2355B6' }}
                            thumbColor={'#f4f3f4'}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleSwitch}
                            value={isEnabled}
                        />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    )
}

export default NotificationSettings