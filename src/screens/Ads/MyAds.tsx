import { IPA_BASE, MY_ADS } from '@env';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { AuthStackParamList } from '../../Navigation/types';

const TABS = ['All', 'Live', 'Pending', 'Rejected'] as const;

type TabType = (typeof TABS)[number];

type ApiAd = {
    id: number;
    title: string;
    description: string;
    image: string;
    target_url: string;
    target_section: string | null;
    total_budget: string;
    spent_amount: string;
    clicks: number;
    impressions: number;
    ctr: number;
    start_date: string;     // "2026-03-05 14:30:00"
    end_date: string;       // "2026-03-12 14:30:00"
    is_approved: boolean;
    status: 'pending' | 'active' | 'rejected' | 'expired' | string;
    cta_text?: string;
    budget_remaining?: number;
    created_at: string;     // "2026-03-02 20:44:46"
    updated_at: string;
};

const API_BASE_URL = IPA_BASE;
const END_POINTS = MY_ADS;

// API status -> UI type (badge + tab filtering)
const toUiStatusType = (ad: ApiAd): 'live' | 'pending' | 'rejected' | 'expired' => {
    // most reliable: ad.status
    if (ad.status === 'rejected') return 'rejected';
    if (ad.status === 'pending') return 'pending';
    if (ad.status === 'expired') return 'expired';

    // if backend returns active but not approved, treat as pending (safe)
    if (ad.status === 'active' && ad.is_approved) return 'live';
    if (ad.status === 'active' && !ad.is_approved) return 'pending';

    // fallback: approval flag
    return ad.is_approved ? 'live' : 'pending';
};

const badgeConfig = (type: 'live' | 'pending' | 'rejected' | 'expired') => {
    if (type === 'live') return { bg: '#EAF7EF', fg: '#2E9B63', text: 'Approved (Live)' };
    if (type === 'rejected') return { bg: '#FDECEC', fg: '#E24A4A', text: 'Rejected' };
    if (type === 'expired') return { bg: '#EEF2FF', fg: '#4F46E5', text: 'Expired' };
    return { bg: '#FEF6E7', fg: '#C27A2C', text: 'Pending Review' };
};

// subtitle বানানোর helper (created_at)
const formatSubtitle = (ad: ApiAd) => {
    // তুমি চাইলে এখানে আরও fancy (time ago) করতে পারো
    return `Created ${ad.created_at} , ID: #${ad.id}`;
};

const MyAds = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const [tab, setTab] = useState<TabType>('All');

    const [loading, setLoading] = useState(false);
    const [myAds, setMyAds] = useState<ApiAd[]>([]);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setErrorMsg('');

        const token = await AsyncStorage.getItem('vToken');
        if (!token) {
            setErrorMsg('Token missing');
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${API_BASE_URL}${END_POINTS}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const ads: ApiAd[] = res?.data?.data?.ads ?? [];
            setMyAds(ads);
            // ✅ right way to see data
            console.log('Loaded ads:', ads.length);
        } catch (err: any) {
            console.error('Error loading data:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load ads');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // ✅ now list is based on real API data
    const list = useMemo(() => {
        const normalized = myAds.map((ad) => ({
            ...ad,
            uiStatusType: toUiStatusType(ad),
            subtitle: formatSubtitle(ad),
        }));

        if (tab === 'All') return normalized;
        if (tab === 'Live') return normalized.filter((x) => x.uiStatusType === 'live');
        if (tab === 'Pending') return normalized.filter((x) => x.uiStatusType === 'pending');
        return normalized.filter((x) => x.uiStatusType === 'rejected');
    }, [myAds, tab]);

    const Header = () => (
        <View>


            <View className="mt-4">
                <FlatList
                    data={TABS as unknown as string[]}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 12 }}
                    renderItem={({ item: t }) => {
                        const active = tab === (t as TabType);
                        return (
                            <Pressable
                                onPress={() => setTab(t as TabType)}
                                className={`px-6 py-2 rounded-full mr-3 ${active ? 'bg-[#1F56D8]' : 'bg-white border border-[#D6DAE2]'
                                    }`}
                            >
                                <Text className={`text-base font-semibold ${active ? 'text-white' : 'text-[#7B8190]'}`}>
                                    {t}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            {!!errorMsg && (
                <Text className="mt-3 text-[13px] text-[#E24A4A]">
                    {errorMsg}
                </Text>
            )}

            <View className="h-4" />
        </View>
    );

    const renderAd = ({ item: ad }: any) => {
        const b = badgeConfig(ad.uiStatusType);

        return (
            <View
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 2,
                }}
            >


                <View className="p-5">
                    <View className="flex-row">
                        <Image
                            source={{ uri: ad.image }}
                            className="w-[74px] h-[74px] rounded-2xl"
                            resizeMode="cover"
                        />
                        <View className="flex-1 ml-4 pr-8">
                            <Text className="text-[18px] font-semibold text-[#111827] leading-6" numberOfLines={2}>
                                {ad.title}
                            </Text>
                            <Text className="text-[16px] text-[#7A8192] mt-2">
                                {ad.description}
                            </Text>
                            <Text className="text-[16px] text-[#7A8192] mt-2">
                                {ad.subtitle}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="h-[1px] bg-[#E6E9EF]" />

                <View className="px-5 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center px-4 py-2 rounded-full" style={{ backgroundColor: b.bg }}>
                        {ad.uiStatusType === 'live' && (
                            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: b.fg }} />
                        )}
                        {ad.uiStatusType === 'rejected' && (
                            <Ionicons name="close-circle" size={14} color={b.fg} style={{ marginRight: 8 }} />
                        )}
                        {ad.uiStatusType === 'pending' && (
                            <Ionicons name="hourglass" size={14} color={b.fg} style={{ marginRight: 8 }} />
                        )}
                        {ad.uiStatusType === 'expired' && (
                            <Ionicons name="time" size={14} color={b.fg} style={{ marginRight: 8 }} />
                        )}

                        <Text className="text-[13px] font-medium" style={{ color: b.fg }}>
                            {b.text}
                        </Text>
                    </View>

                    {ad.uiStatusType === 'pending' ? (
                        <Text className="text-[#9AA1AE] text-[14px] font-medium">
                            Processing...
                        </Text>
                    ) : (
                        <Pressable
                            className="flex-row items-center"
                            onPress={() => navigation.navigate('AdsPerformance', { adId: ad.id } as any)}
                        >
                            <Text className="text-[#1F56D8] text-[16px] font-semibold mr-2">
                                View Details
                            </Text>
                            <MaterialIcons name="arrow-forward" size={20} color="#1F56D8" />
                        </Pressable>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="bg-[#F9F9FB] flex-1">
            <View className="px-5 flex-1">
                <View className="flex-row items-center gap-4">
                    <AppHeader left={() => <BackButton />} />
                    <Text className="text-lg font-bold">My Ads</Text>
                </View>
                <FlatList
                    data={list}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderAd}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    onRefresh={loadData}
                    refreshing={loading}
                    ListEmptyComponent={
                        !loading ? (
                            <Text className="text-center text-[#7A8192] mt-10">
                                No ads found.
                            </Text>
                        ) : null
                    }
                />

                <Pressable
                    className="absolute bottom-8 right-6 w-[62px] h-[62px] rounded-full items-center justify-center bg-[#2F6CF6]"
                    style={{
                        shadowColor: '#000',
                        shadowOpacity: 0.18,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 10,
                    }}
                    onPress={() => navigation.navigate('CreateAds')}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </Pressable>
            </View>
        </SafeAreaView>
    );
};

export default MyAds;