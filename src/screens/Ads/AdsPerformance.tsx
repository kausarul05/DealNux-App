import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { ADS_DETAILS, IPA_BASE } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthStackParamList } from '../../Navigation/types';
import AppHeader from '../../components/AppHeader';
import BackButton from '../../components/BackButton';
import { Toast, useToast } from '../../components/useToost';

const API_BASE_URL = IPA_BASE;
const END_POINTS = ADS_DETAILS;

/* ------------------ Status Color Mapping ------------------ */
const statusPill = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return { bg: '#EAF7EF', dot: '#22C55E', text: '#22C55E', label: 'Active' };
    if (s === 'rejected') return { bg: '#FDECEC', dot: '#EF4444', text: '#EF4444', label: 'Rejected' };
    if (s === 'expired') return { bg: '#F3F4F6', dot: '#6B7280', text: '#6B7280', label: 'Expired' };
    return { bg: '#FEF6E7', dot: '#F59E0B', text: '#F59E0B', label: 'Pending' };
};

/* ------------------ Stat Card ------------------ */
const StatCard = ({ iconBg, icon, label, value }: any) => {
    return (
        <View
            className="bg-white items-center rounded-3xl p-5 flex-1"
            style={{
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 10 },
                elevation: 2,
            }}
        >
            <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: iconBg }}>
                    {icon}
                </View>
                <Text className="ml-3 text-lg font-bold text-[#6B7280]">{label}</Text>
            </View>
            <Text className="mt-3 text-xl font-extrabold text-[#111827]">{value}</Text>
        </View>
    );
};

/* ------------------ Segmented ------------------ */
const Segmented = ({ items, value, onChange }: any) => {
    return (
        <View className="bg-[#EEF0F4] rounded-xl p-1 flex-row">
            {items.map((t: any) => {
                const active = value === t;
                return (
                    <Pressable
                        key={t}
                        onPress={() => onChange(t)}
                        className={`flex-1 py-4 rounded-xl items-center justify-center ${active ? 'bg-[#1F56D8]' : 'bg-transparent'
                            }`}
                    >
                        <Text className={`text-lg font-extrabold ${active ? 'text-white' : 'text-[#6B7280]'}`}>{t}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

/* ------------------ Chart With Tooltip ------------------ */
const ChartWithTooltip = ({
    w,
    h,
    padX,
    padBottom,
    data,
    metric,
    points,
    linePath,
    areaPath,
    activeIndex,
    setActiveIndex,
    pickIndexFromX,
    formatMMDD,
}: any) => {
    const [layoutW, setLayoutW] = useState(0);

    const onPick = (evt: any) => {
        if (!layoutW) return;
        const xPx = evt?.nativeEvent?.locationX ?? 0; // pixels
        const xViewBox = (xPx / layoutW) * w; // map to viewBox coords
        const idx = pickIndexFromX(xViewBox);
        setActiveIndex(idx);
    };

    const active = activeIndex != null ? points[activeIndex] : null;
    const activeData = activeIndex != null ? data[activeIndex] : null;

    return (
        <Pressable
            style={{ flex: 1 }}
            onPress={onPick}
            onLongPress={onPick}
            onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)}
        >
            <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
                <Defs>
                    <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#1F56D8" stopOpacity="0.25" />
                        <Stop offset="1" stopColor="#1F56D8" stopOpacity="0.03" />
                    </LinearGradient>
                </Defs>

                {/* grid */}
                <Line x1="0" y1="50" x2={w} y2="50" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="8 8" />
                <Line x1="0" y1="110" x2={w} y2="110" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="8 8" />
                <Line x1="0" y1="170" x2={w} y2="170" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="8 8" />

                {/* area + line */}
                <Path d={areaPath} fill="url(#g)" />
                <Path d={linePath} fill="none" stroke="#1F56D8" strokeWidth="4" />

                {/* tooltip */}
                {active ? (
                    <>
                        {/* vertical guide */}
                        <Line x1={active.x} y1="10" x2={active.x} y2={h - padBottom} stroke="#93C5FD" strokeWidth="2" />

                        {/* active dot */}
                        <Path
                            d={`M ${active.x} ${active.y} m -6,0 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0`}
                            fill="#1F56D8"
                        />

                        {(() => {
                            const boxW = 180;
                            const boxH = 58;
                            const bx = Math.min(Math.max(active.x - boxW / 2, 10), w - boxW - 10);
                            const by = Math.max(active.y - boxH - 14, 10);

                            const value = activeData ? Number(activeData?.[metric] ?? 0) : 0;
                            const dateLabel = activeData?.date ? formatMMDD(activeData.date) : '';

                            return (
                                <>
                                    {/* box */}
                                    <Path d={`M${bx},${by} h${boxW} v${boxH} h-${boxW} Z`} fill="#2355B6" opacity={0.9} />

                                    {/* text */}
                                    <SvgText x={bx + 12} y={by + 22} fill="#fff" fontSize="14" fontWeight="700">
                                        {metric === 'impressions' ? 'Impressions' : 'Clicks'}: {value}
                                    </SvgText>
                                    <SvgText x={bx + 12} y={by + 42} fill="#E5E7EB" fontSize="12">
                                        {dateLabel}
                                    </SvgText>
                                </>
                            );
                        })()}
                    </>
                ) : null}
            </Svg>
        </Pressable>
    );
};

/* ------------------ Dynamic Chart (Safe + Tooltip) ------------------ */
const PerformanceChart = ({
    performance,
    metric,
}: {
    performance: { date: string; impressions: number; clicks: number }[];
    metric: 'impressions' | 'clicks';
}) => {
    const data = (performance || []).slice(-7);

    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    React.useEffect(() => {
        setActiveIndex(null);
    }, [metric, data.length]);

    if (!data.length) {
        return (
            <View className="mt-4">
                <View className="h-[150px] rounded-2xl overflow-hidden bg-white items-center justify-center">
                    <Text className="text-[#9AA1AE] text-[13px]">No performance data</Text>
                </View>
            </View>
        );
    }

    const w = 600;
    const h = 200;
    const padX = 12;
    const padTop = 12;
    const padBottom = 22;

    const values = data.map((p) => Number(p?.[metric] ?? 0));
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);

    const usableH = h - padTop - padBottom;
    const usableW = w - padX * 2;
    const xStep = data.length > 1 ? usableW / (data.length - 1) : 0;

    const points = data.map((p, i) => {
        const v = Number(p?.[metric] ?? 0);
        const x = padX + i * xStep;
        const norm = (v - minVal) / (maxVal - minVal || 1);
        const y = padTop + (1 - norm) * usableH;
        return { x, y, v };
    });

    const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ');
    const areaPath = `${linePath} L${padX + usableW},${h - padBottom} L${padX},${h - padBottom} Z`;

    const formatMMDD = (iso: string) => {
        const dt = new Date(iso);
        if (Number.isNaN(dt.getTime())) return iso.slice(5);
        return dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    };

    const pickIndexFromX = (xInViewBox: number) => {
        if (points.length === 1) return 0;
        const idx = Math.round((xInViewBox - padX) / xStep);
        return Math.max(0, Math.min(points.length - 1, idx));
    };

    return (
        <View className="mt-4">
            <View className="h-[150px] rounded-2xl overflow-hidden bg-white">
                <ChartWithTooltip
                    w={w}
                    h={h}
                    padX={padX}
                    padBottom={padBottom}
                    data={data}
                    metric={metric}
                    points={points}
                    linePath={linePath}
                    areaPath={areaPath}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    pickIndexFromX={pickIndexFromX}
                    formatMMDD={formatMMDD}
                />
            </View>

            <View className="flex-row justify-between px-2 mt-4">
                {data.map((p, i) => (
                    <Text key={`${p.date}-${i}`} className="text-[12px] text-[#6B7280] font-medium">
                        {formatMMDD(p.date)}
                    </Text>
                ))}
            </View>

            {values.every((v) => v === 0) ? (
                <Text className="mt-3 text-center text-[#9AA1AE] text-[13px]">No data yet for this period.</Text>
            ) : null}
        </View>
    );
};

/* ------------------ Screen ------------------ */
const AdsPerformance = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();
    const route = useRoute<any>();
    const params = route.params?.adId;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const [seg, setSeg] = useState<'Impressions' | 'Clicks'>('Impressions');
    const metric: 'impressions' | 'clicks' = seg === 'Impressions' ? 'impressions' : 'clicks';

    const loadData = useCallback(async () => {
        if (!params) {
            setErrorMsg('Missing adId');
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg('');

        const token = await AsyncStorage.getItem('vToken');
        if (!token) {
            setErrorMsg('Token missing');
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${API_BASE_URL}${END_POINTS}${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res?.data?.data ?? null);
        } catch (err: any) {
            console.error('Error loading data:', err?.response?.data || err);
            setErrorMsg(err?.response?.data?.message || 'Failed to load ads');
        } finally {
            setLoading(false);
        }
    }, [params]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const stats = useMemo(() => {
        const impressions = Number(data?.impressions ?? 0);
        const clicks = Number(data?.clicks ?? 0);
        const budget = Number(data?.total_budget ?? 0);
        const spend = Number(data?.spent_amount ?? 0);

        const money = (n: number) => `$${n.toFixed(2)}`;

        return [
            {
                label: 'IMPRESSIONS',
                value: impressions.toLocaleString(),
                iconBg: '#EEF2FF',
                icon: <Ionicons name="eye" size={20} color="#4F46E5" />,
            },
            {
                label: 'CLICKS',
                value: clicks.toLocaleString(),
                iconBg: '#EAF0FF',
                icon: <MaterialIcons name="ads-click" size={20} color="#1F56D8" />,
            },
            {
                label: 'BUDGET',
                value: money(budget),
                iconBg: '#FEF6E7',
                icon: <Ionicons name="wallet-outline" size={20} color="#F59E0B" />,
            },
            {
                label: 'SPEND',
                value: money(spend),
                iconBg: '#EAF7EF',
                icon: <Ionicons name="cash-outline" size={20} color="#22C55E" />,
            },
        ];
    }, [data]);

    const RejectNotice = ({ data }: any) => {
        const feedback = data?.reviews?.[0]?.feedback ?? 'No feedback found';

        return (
            <View className="mt-4 bg-[#FAF1E3] rounded-3xl p-5">
                <View className="flex-row items-start">
                    <View className="w-8 h-8 rounded-full bg-[#F59E0B] items-center justify-center">
                        <Ionicons name="information" size={24} color="white" />
                    </View>

                    <View className="flex-1 ml-4">
                        <Text className="text-lg font-extrabold text-[#F59E0B]">Ad Rejected</Text>
                        <Text className="mt-3 text-lg leading-8 text-[#F59E0B]">{feedback}</Text>
                    </View>
                </View>

                <Pressable
                    className="mt-6 bg-[#1F56D8] rounded-2xl py-4 flex-row items-center justify-center"
                    onPress={() => navigation.navigate('CreateAds', { adId: data.id } as any)}
                >
                    <Feather name="edit-2" size={20} color="white" />
                    <Text className="text-white text-[18px] font-extrabold ml-3">Edit & Fix</Text>
                </Pressable>
            </View>
        );
    };

    const pill = statusPill(data?.status);

    return (
        <SafeAreaView className="flex-1 bg-[#F7F7FA]">
            <StatusBar barStyle="dark-content" />

            <View className="px-5 mb-10">
                {/* Header */}
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <AppHeader left={() => <BackButton />} />
                        <Text className="ml-2 text-xl font-extrabold text-[#111827]">Ad Performance</Text>
                    </View>

                    <View className="px-4 py-2 rounded-full flex-row items-center" style={{ backgroundColor: pill.bg }}>
                        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pill.dot }} />
                        <Text className="text-[16px] font-extrabold" style={{ color: pill.text }}>
                            {data?.status || pill.label}
                        </Text>
                    </View>
                </View>

                {/* Loading / Error / Content */}
                {loading ? (
                    <View className="mt-10 items-center">
                        <ActivityIndicator size="large" color="#1F56D8" />
                        <Text className="mt-3 text-[#6B7280]">Loading...</Text>
                    </View>
                ) : errorMsg ? (
                    <View className="mt-10 items-center">
                        <Text className="text-[#EF4444] font-bold">{errorMsg}</Text>
                        <Pressable onPress={loadData} className="mt-4 bg-[#1F56D8] px-6 py-3 rounded-xl">
                            <Text className="text-white font-bold">Try Again</Text>
                        </Pressable>
                    </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
                            {/* Stats */}
                            <View className="mt-4">
                                <View className="flex-row gap-4">
                                    <StatCard {...stats[0]} />
                                    <StatCard {...stats[1]} />
                                </View>
                                <View className="flex-row gap-4 mt-4">
                                    <StatCard {...stats[2]} />
                                    <StatCard {...stats[3]} />
                                </View>
                            </View>

                                {/* Chart */}
                                <Text className="my-4 text-xl font-bold text-[#111827]">Performance</Text>

                                <View className="mt-2">
                                    <Segmented items={['Impressions', 'Clicks']} value={seg} onChange={setSeg} />
                                </View>

                                <PerformanceChart performance={data?.performance || []} metric={metric} />

                                {/* Reject Notice */}
                                {data?.status === 'rejected' && <RejectNotice data={data} />}
                            </ScrollView>
                )}
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

export default AdsPerformance;