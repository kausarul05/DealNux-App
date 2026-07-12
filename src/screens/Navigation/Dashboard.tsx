import { DASHBOARD_API, IPA_BASE } from '@env'
import { MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import axios from 'axios'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Animated,
    Easing,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import PriceChart from '../../components/PieChart'

const API_BASE_URL = IPA_BASE

// ─── Types ────────────────────────────────────────────────────────────────────
type RecentActivity = {
    title: string
    saved_amount: number
    date: string
}

type DashboardData = {
    total_lifetime_savings: number
    recent_activity: RecentActivity[]
}

// ─── Skeleton Pulse ───────────────────────────────────────────────────────────
const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style,
}: {
    width?: number | string
    height: number
    borderRadius?: number
    style?: any
}) => {
    const opacity = useRef(new Animated.Value(0.3)).current

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        )
        pulse.start()
        return () => pulse.stop()
    }, [])

    return (
        <Animated.View
            style={[
                {
                    width: width ?? '100%',
                    height,
                    borderRadius,
                    backgroundColor: '#E2E8F0',
                    opacity,
                },
                style,
            ]}
        />
    )
}

// ─── Dashboard Skeleton Screen ────────────────────────────────────────────────
const DashboardSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#F9F9FB' }}>
        <View style={{ paddingHorizontal: 20 }}>
            <SkeletonBox width={100} height={22} borderRadius={6} style={{ marginTop: 8, marginBottom: 24 }} />
            {/* savings card */}
            <SkeletonBox height={160} borderRadius={24} style={{ marginBottom: 24 }} />
            {/* trends header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <SkeletonBox width={160} height={24} borderRadius={6} />
                <SkeletonBox width={100} height={36} borderRadius={10} />
            </View>
            {/* chart */}
            <SkeletonBox height={220} borderRadius={16} style={{ marginBottom: 24 }} />
            {/* recent activity header */}
            <SkeletonBox width={200} height={28} borderRadius={6} style={{ marginBottom: 16 }} />
            {/* activity items */}
            {[1, 2, 3].map((i) => (
                <SkeletonBox key={i} height={76} borderRadius={12} style={{ marginBottom: 10 }} />
            ))}
        </View>
    </View>
)

// ─── Empty / Error State ──────────────────────────────────────────────────────
const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
    <View style={{ flex: 1, backgroundColor: '#F9F9FB' }}>
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 40,
            }}
        >
            <View
                style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                }}
            >
                <MaterialIcons name="savings" size={44} color="#CBD5E1" />
            </View>
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#1E293B',
                    marginBottom: 10,
                    textAlign: 'center',
                }}
            >
                Couldn't Load Dashboard
            </Text>
            <Text
                style={{
                    fontSize: 14,
                    color: '#64748B',
                    textAlign: 'center',
                    lineHeight: 22,
                    marginBottom: 28,
                }}
            >
                We had trouble fetching your savings data.{'\n'}
                Please check your connection and try again.
            </Text>
            <TouchableOpacity
                onPress={onRetry}
                activeOpacity={0.8}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#2355B6',
                    paddingHorizontal: 28,
                    paddingVertical: 14,
                    borderRadius: 14,
                }}
            >
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Try Again</Text>
            </TouchableOpacity>
        </View>
    </View>
)

// ─── Activity Icon helper ─────────────────────────────────────────────────────
const getActivityIcon = (title: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
    const t = title.toLowerCase()
    if (t.includes('headphone') || t.includes('audio')) return 'headphones'
    if (t.includes('phone') || t.includes('mobile')) return 'smartphone'
    if (t.includes('laptop') || t.includes('computer')) return 'laptop'
    if (t.includes('watch')) return 'watch'
    if (t.includes('camera')) return 'camera-alt'
    if (t.includes('car') || t.includes('fender') || t.includes('trim')) return 'directions-car'
    if (t.includes('shoe') || t.includes('sneaker')) return 'shopping-bag'
    return 'local-offer'
}

// ─── Truncate title ───────────────────────────────────────────────────────────
const truncateTitle = (title: string, max = 40): string => {
    const clean = title.replace(/Opens in a new window or tab/gi, '').trim()
    return clean.length <= max ? clean : clean.slice(0, max) + '…'
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const [activeRange, setActiveRange] = useState<'30d' | '90d'>('30d')

    const fetchDashboard = async () => {
        try {
            setLoading(true)
            setError(false)

            const token = await AsyncStorage.getItem('vToken')
            // TODO: set DASHBOARD_API in your .env  e.g. DASHBOARD_API=/api/v1/dashboard/
            const url = `${API_BASE_URL}${DASHBOARD_API}`

            const response = await axios.get(url, {
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            })

            const result: DashboardData = response?.data?.data ?? response?.data
            setData(result)
        } catch (err: any) {
            console.log('dashboard error', err?.response?.data || err?.message)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useFocusEffect(
        useCallback(() => {
            fetchDashboard()
        }, [])
    )

    if (loading) return <DashboardSkeleton />
    if (error || !data) return <EmptyState onRetry={fetchDashboard} />

    const { total_lifetime_savings, recent_activity } = data

    return (
        <View className="flex-1 bg-[#F9F9FB]">
            <View className="px-5 pb-3 mb-4  ">
                <View className="flex-row items-center gap-4">
                    <Text className="text-lg font-bold text-gray-900">Savings</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className=''>

                    {/* ── Total Lifetime Savings Card ── */}
                    <View className='bg-[#111c34] rounded-3xl py-10 px-16 items-center mt-6'>
                        <Text className='text-white text-lg font-semibold tracking-wider'>
                            TOTAL LIFETIME SAVINGS
                        </Text>
                        <Text className='text-white text-5xl font-bold my-6'>
                            ${total_lifetime_savings.toFixed(2)}
                        </Text>

                        {/* <View className='flex-row items-center gap-2 bg-white/10 border border-[#BFC5CC33] rounded-full px-3 py-2 mt-3'>
                            <Ionicons name="trending-up" size={18} color="#27C840" />
                            <Text className='text-[#27C840] text-lg font-semibold'>
                                +12.4% vs last month
                            </Text>
                        </View> */}
                    </View>

                    {/* ── Savings Trends ── */}
                    <View className='flex-row justify-between items-center my-4'>
                        <Text className='text-2xl font-bold'>Savings Trends</Text>
                        {/* <View className='flex-row items-center gap-2 justify-center'>
                            <TouchableOpacity onPress={() => setActiveRange('30d')} activeOpacity={0.8}>
                                <Text
                                    style={{
                                        backgroundColor: activeRange === '30d' ? '#2355B6' : 'transparent',
                                        color: activeRange === '30d' ? '#fff' : '#111827',
                                        fontSize: 18,
                                        fontWeight: '600',
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                    }}
                                >
                                    30d
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveRange('90d')} activeOpacity={0.8}>
                                <Text
                                    style={{
                                        backgroundColor: activeRange === '90d' ? '#2355B6' : 'transparent',
                                        color: activeRange === '90d' ? '#fff' : '#111827',
                                        fontSize: 18,
                                        fontWeight: '600',
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                    }}
                                >
                                    90d
                                </Text>
                            </TouchableOpacity>
                        </View> */}
                    </View>

                    {/* PriceChart: real activityData for day-wise + range for dummy fallback */}
                    <PriceChart
                        range={activeRange}
                        activityData={recent_activity}
                    />

                    {/* ── Breakdown (commented, preserved as-is) ── */}
                    {/* <View>
                        <Text className='text-3xl font-bold my-4'>Breakdown</Text>
                        <View className='flex-row justify-between items-center p-4 bg-white rounded-xl'>
                            <View className='flex-row items-center gap-4 justify-center'>
                                <MaterialCommunityIcons className='p-4 bg-[#ffc54946] rounded-full' name="ticket-percent" size={30} color="#FFC649" />
                                <Text className='text-xl'>Coupons applied</Text>
                            </View>
                            <Text className='text-xl font-bold'>$82.40</Text>
                        </View>
                        <View className='flex-row justify-between items-center p-4 bg-white rounded-xl my-4'>
                            <View className='flex-row items-center gap-4 justify-center'>
                                <Octicons className='p-4 bg-[#2354b634] rounded-full' name="arrow-switch" size={30} color="#2355B6" />
                                <Text className='text-xl'>Price comparison</Text>
                            </View>
                            <Text className='text-xl font-bold'>$82.40</Text>
                        </View>
                        <View className='flex-row justify-between items-center p-4 bg-white rounded-xl'>
                            <View className='flex-row items-center gap-4 justify-center'>
                                <MaterialCommunityIcons className='p-4 bg-[#ff4d5023] rounded-full' name="bell-ring" size={30} color="#FF4D4F" />
                                <Text className='text-xl'>Price drop alerts</Text>
                            </View>
                            <Text className='text-xl font-bold'>$82.40</Text>
                        </View>
                    </View> */}

                    {/* ── Recent Activity ── */}
                    <Text className='text-3xl font-bold my-4'>Recent Activity</Text>

                    <View className='mb-20'>
                        {recent_activity.length === 0 ? (
                            <View
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: 16,
                                    padding: 24,
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <MaterialIcons name="inbox" size={36} color="#CBD5E1" />
                                <Text style={{ color: '#94A3B8', fontSize: 15 }}>No recent activity yet</Text>
                            </View>
                        ) : (
                            recent_activity.map((item, index) => (
                                <View
                                    key={index}
                                    className='flex-row justify-between items-center p-4 bg-white rounded-xl'
                                    style={{ marginBottom: 12 }}
                                >
                                    <View
                                        className='flex-row items-center gap-4 justify-center'
                                        style={{ flex: 1 }}
                                    >
                                        <MaterialIcons
                                            className="p-4 bg-[#f3f4f6e1] rounded-full"
                                            name={getActivityIcon(item.title)}
                                            size={30}
                                            color="#667085"
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text className='text-xl' numberOfLines={2}>
                                                {truncateTitle(item.title)}
                                            </Text>
                                            <Text className='text-xl text-[#667085]'>{item.date}</Text>
                                        </View>
                                    </View>
                                    <Text
                                        className='text-xl font-bold text-[#27C840]'
                                        style={{ marginLeft: 8, flexShrink: 0 }}
                                    >
                                        Saved ${item.saved_amount.toFixed(2)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* <Pressable
                        className="mt-4 bg-[#1D4ED8] rounded-2xl py-5 flex-row items-center justify-center gap-3 mb-20"
                    >
                        <Text className="text-white text-xl font-bold">
                            Explore More Deals
                        </Text>
                    </Pressable> */}
                </ScrollView>
            </View>
        </View>
    )
}

export default Dashboard