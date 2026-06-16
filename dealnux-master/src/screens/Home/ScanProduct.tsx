import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppHeader from '../../components/AppHeader'
import BackButton from '../../components/BackButton'
import BuyCard from '../../components/BuyCard'
import ChatModal from '../../components/ChatModal'
import PriceChart from '../../components/PieChart'
import { Images } from '../../constants'

const ScanProduct = () => {

    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [chatModalVisible, setChatModalVisible] = useState(false)


    const toggleFavorite = (id: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev)
            if (newFavorites.has(id)) {
                newFavorites.delete(id)
            } else {
                newFavorites.add(id)
            }
            return newFavorites
        })
    }

    const store = [
        {
            id: '1',
            logo: Images.Amazon,
            title: 'Amazon',
            subtitle: 'Free Prime Delivery',
            price: '$310.00',
            buy: 'true',
        },
        {
            id: '2',
            logo: Images.BestBuy,
            title: 'Best Buy',
            subtitle: 'Free 2-Day Shipping',
            price: '$315.00',
            buy: 'false',
        },
        {
            id: '3',
            logo: Images.Wallmart,
            title: 'Walmart',
            subtitle: 'Free Next-Day Delivery',
            price: '$320.00',
            buy: 'false',
        },
    ];

    return (
        <SafeAreaView className="flex-1 bg-[#F9F9FB]">
            <View className="px-5 pb-3 mb-4 border-b-2 border-[#E5E7EB] ">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold text-gray-900">Scan Result</Text>
                    <TouchableOpacity
                        style={styles.favoriteButton}
                    >
                        <Ionicons
                            name={"heart"}
                            size={20}
                            color={"#EF4444"}
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
            >
                <View >

                    <Image
                        style={{ width: '100%', height: 300 }}
                        source={{
                            uri: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
                        }}
                    />
                </View>
                <View className='flex-row justify-center items-center my-4'>
                    <View className='w-4 h-4 rounded-full bg-[#2355B6] mr-3'>

                    </View>
                    <View className='w-4 h-4 rounded-full bg-[#b9c8e7] mr-3' >

                    </View>
                    <View className='w-4 h-4 rounded-full bg-[#b9c8e7]'>

                    </View>
                </View>
                <View className='px-5'>
                    <View className='flex-row justify-between items-center'>
                        <View className='w-3/5'>
                            <Text className='text-2xl font-bold'>
                                Bose QuietComfort 45 Noise
                                Cancelling
                            </Text>
                        </View>
                        <View>
                            <View >
                                <Text className='text-xl font-bold self-end'>
                                    ⭐ 5.5

                                </Text>
                            </View>
                            <View className='bg-[#27C8401A] p-2 rounded-full  mt-2 flex-row items-center justify-center gap-4'>
                                <MaterialIcons name="verified" size={24} color="#137C0A" />
                                <Text className='text-[#137C0A]'>
                                    Verified
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View className='border-2 border-[#E5E7EB] p-5 rounded-2xl my-5'>
                        <View className='flex-row items-center justify-between '>
                            <Text className='text-[#636F85] text-xl'>LOWEST PRICE FOUND</Text>
                            <Text className='bg-[#FFC649] p-2 rounded-xl'>BEST DEAL</Text>
                        </View>
                        <View className='flex-row items-end gap-2 my-2'>
                            <Text className='text-4xl text-[#2355B6] font-bold'>$299.00</Text>
                            <Text className='text-[#A1A8B3] text-xl line-through'>$399</Text>
                        </View>
                        <Text className='text-[#34C759] text-xl'>You save $168 (45%)</Text>
                        <View className='mt-4 flex-row items-center gap-2'>
                            <Pressable className='bg-[#e1e6eb] px-6 py-4 rounded-xl'>
                                <MaterialIcons name="notifications-active" size={30} color="#334155" />
                                <Text className='text-[#636F85]'>Alert</Text>
                            </Pressable>
                            <Pressable className='bg-[#e1e6eb] px-6 py-4 rounded-xl '>
                                <MaterialCommunityIcons name="open-in-new" size={30} color="#334155" />
                                <Text className='text-[#636F85]'>Share</Text>
                            </Pressable>
                            <Pressable className='bg-[#2355B6] rounded-xl p-6 flex-row items-center gap-2 ml-auto'>
                                <Feather name="shopping-cart" size={30} color="white" />
                                <Text className='text-white text-2xl font-bold'>Add to Cart</Text>
                            </Pressable>
                        </View>
                    </View>
                    <View className='flex-row justify-between items-center'>
                        <Text className='text-2xl font-bold'>Price History</Text>
                        <View className='flex-row items-center gap-2 justify-center'>
                            <Text className='bg-[#2355B6] text-white text-xl p-2 px-4 rounded-lg'>30d</Text>
                            <Text className='text-xl'>90d</Text>
                        </View>
                    </View>
                    <PriceChart />
                    <Text className='text-2xl font-bold my-4'>
                        Compare Retailers
                    </Text>
                    {store.map((item, index) => <BuyCard key={index} title={item.title} subtitle={item.subtitle} price={item.price} logo={item.logo} buy={item.buy} />)}

                </View>

            </ScrollView>
            <Pressable
                onPress={() => setChatModalVisible(true)}
                className='absolute right-12 bottom-10 bg-white p-2 rounded-full border-2 border-[#FFC64933]'
            >
                <Ionicons name="chatbubble-ellipses" size={40} color="#FFC649" />
            </Pressable>

            {/* Chat Modal */}
            <ChatModal
                visible={chatModalVisible}
                onClose={() => setChatModalVisible(false)}
            />
        </SafeAreaView>
    )
}

export default ScanProduct


const styles = StyleSheet.create({
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'white',
        width: 34,
        height: 34,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
})