import React, { useEffect, useRef } from 'react'
import { Animated, Dimensions, StyleSheet, View } from 'react-native'

const { width } = Dimensions.get('window')
const cardW = (width - 60) / 2

const SkeletonBox = ({ w, h, radius = 8, style }: any) => {
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

    return (
        <Animated.View
            style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#E2E8F0', opacity }, style]}
        />
    )
}

export const HomeSkeleton = () => (
    <View style={sk.wrap}>
        {/* Header */}
        <View style={sk.row}>
            <View style={{ gap: 6 }}>
                <SkeletonBox w={180} h={14} />
                <SkeletonBox w={120} h={22} />
            </View>
            <SkeletonBox w={36} h={36} radius={18} />
        </View>

        {/* Search */}
        <SkeletonBox w="100%" h={48} radius={14} style={{ marginBottom: 12 }} />

        {/* Categories */}
        <View style={[sk.row, { gap: 10, marginBottom: 14 }]}>
            {[60, 90, 75, 100].map((w, i) => <SkeletonBox key={i} w={w} h={36} radius={20} />)}
        </View>

        {/* Banner */}
        <SkeletonBox w="100%" h={150} radius={18} style={{ marginBottom: 18 }} />

        {/* Recommended title */}
        <SkeletonBox w={160} h={18} style={{ marginBottom: 12 }} />

        {/* Recommended row */}
        <View style={[sk.row, { gap: 12, marginBottom: 20 }]}>
            {[0, 1, 2].map(i => (
                <View key={i} style={sk.recCard}>
                    <SkeletonBox w={cardW} h={130} radius={0} />
                    <View style={{ padding: 10, gap: 6 }}>
                        <SkeletonBox w="80%" h={12} />
                        <SkeletonBox w="50%" h={16} />
                        <SkeletonBox w="65%" h={11} />
                    </View>
                </View>
            ))}
        </View>

        {/* All Products title */}
        <View style={[sk.row, { marginBottom: 14 }]}>
            <SkeletonBox w={110} h={20} />
            <SkeletonBox w={60} h={24} radius={10} />
        </View>

        {/* Product grid */}
        <View style={sk.grid}>
            {[0, 1, 2, 3].map(i => (
                <View key={i} style={sk.prodCard}>
                    <SkeletonBox w="100%" h={148} radius={0} />
                    <View style={{ padding: 10, gap: 6 }}>
                        <SkeletonBox w="85%" h={13} />
                        <SkeletonBox w="55%" h={18} />
                        <SkeletonBox w="70%" h={12} />
                    </View>
                </View>
            ))}
        </View>
    </View>
)

const sk = StyleSheet.create({
    wrap: { flex: 1, padding: 20, backgroundColor: '#F9F9FB' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    recCard: { width: cardW, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
    prodCard: { width: cardW, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
})