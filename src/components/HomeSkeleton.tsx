import React, { useEffect, useRef } from 'react'
import { Animated, Dimensions, StyleSheet, View } from 'react-native'

const { width } = Dimensions.get('window')
// Match the real Home layout: 16px horizontal padding, 12px gap between the
// two grid columns (see styles.productGrid / recommendedList in Home.tsx).
const gridCardW = (width - 16 * 2 - 12) / 2
const recCardW = (width - 60) / 2 // medium ProductCard used in "Recommended for You"

const SkeletonBox = ({ w, h, radius = 8, style }: any) => {
    const anim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        )
        loop.start()
        return () => loop.stop()
    }, [])

    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

    return (
        <Animated.View
            style={[{ width: w, height: h, borderRadius: radius, backgroundColor: '#E2E8F0', opacity }, style]}
        />
    )
}

const RecCard = () => (
    <View style={sk.recCard}>
        <SkeletonBox w={recCardW} h={130} radius={0} />
        <View style={{ padding: 10, gap: 6 }}>
            <SkeletonBox w="80%" h={12} />
            <SkeletonBox w="50%" h={16} />
            <SkeletonBox w="65%" h={11} />
        </View>
    </View>
)

const ProdCard = () => (
    <View style={sk.prodCard}>
        <SkeletonBox w="100%" h={148} radius={0} />
        <View style={{ padding: 10, gap: 6 }}>
            <SkeletonBox w="85%" h={13} />
            <SkeletonBox w="55%" h={18} />
            <SkeletonBox w="70%" h={12} />
        </View>
    </View>
)

export const HomeSkeleton = () => (
    <View style={sk.wrap}>
        {/* Search bar (marginHorizontal 16, marginTop 8 in the real screen) */}
        <SkeletonBox w="100%" h={44} radius={8} style={{ marginTop: 8, marginBottom: 12 }} />

        {/* Category pills (horizontal scroll) */}
        <View style={[sk.row, { gap: 10, marginBottom: 16 }]}>
            {[64, 88, 72, 96, 70].map((w, i) => <SkeletonBox key={i} w={w} h={34} radius={20} />)}
        </View>

        {/* Ads / promo banner */}
        <SkeletonBox w="100%" h={150} radius={16} style={{ marginBottom: 16 }} />

        {/* Premium card (shown when the user has no active subscription) */}
        <SkeletonBox w="100%" h={92} radius={16} style={{ marginBottom: 20 }} />

        {/* "Recommended for You" header: title + See All */}
        <View style={[sk.spread, { marginBottom: 12 }]}>
            <SkeletonBox w={170} h={18} />
            <SkeletonBox w={54} h={14} />
        </View>

        {/* Recommended horizontal row */}
        <View style={[sk.row, { gap: 12, marginBottom: 22 }]}>
            {[0, 1, 2].map(i => <RecCard key={i} />)}
        </View>

        {/* "All Products" header: title + items badge */}
        <View style={[sk.spread, { marginBottom: 14 }]}>
            <SkeletonBox w={110} h={20} />
            <SkeletonBox w={64} h={24} radius={12} />
        </View>

        {/* Product grid (2 columns) */}
        <View style={sk.grid}>
            {[0, 1, 2, 3].map(i => <ProdCard key={i} />)}
        </View>
    </View>
)

const sk = StyleSheet.create({
    // 16px horizontal padding to line up with the real Home content.
    wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 4, backgroundColor: '#F9F9FB' },
    // Horizontal skeleton rows that should overflow off-screen like a scroll list.
    row: { flexDirection: 'row', alignItems: 'center' },
    // Header rows: title on the left, action on the right.
    spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recCard: { width: recCardW, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
    prodCard: { width: gridCardW, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
})
