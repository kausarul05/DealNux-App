import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewToken,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

export type AdsItem = {
    id: number
    title: string
    description: string
    image: string
    target_url: string
    target_section: string
}

type Props = {
    ads: AdsItem[]
    buildImageUrl: (path?: string | null) => string
    onPressAd: (id: number, targetUrl: string) => void
    actionLocked?: boolean
}

const AdsCarousel = ({
    ads,
    buildImageUrl,
    onPressAd,
    actionLocked = false,
}: Props) => {
    const adFlatListRef = useRef<FlatList<AdsItem> | null>(null)
    const [activeAdIndex, setActiveAdIndex] = useState(0)
    const borderAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (!ads.length) return

        const interval = setInterval(() => {
            setActiveAdIndex(prev => {
                const next = prev + 1 >= ads.length ? 0 : prev + 1
                adFlatListRef.current?.scrollToIndex({ index: next, animated: true })
                return next
            })
        }, 7000)

        return () => clearInterval(interval)
    }, [ads])

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(borderAnim, {
                    toValue: 1,
                    duration: 1400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(borderAnim, {
                    toValue: 0,
                    duration: 1400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ])
        )

        loop.start()
        return () => loop.stop()
    }, [borderAnim])

    const onAdViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems?.length > 0 && typeof viewableItems[0]?.index === 'number') {
                setActiveAdIndex(viewableItems[0].index ?? 0)
            }
        }
    ).current

    const adViewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
    }).current

    const animatedBorderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#60A5FA', '#A855F7'],
    })

    const animatedScale = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.01],
    })

    const getAdItemLayout = (_: ArrayLike<AdsItem> | null | undefined, index: number) => ({
        length: width - 40,
        offset: (width - 40) * index,
        index,
    })

    const renderAdItem = useCallback(({ item }: { item: AdsItem }) => (
        <Pressable
            onPress={() => onPressAd(item.id, item.target_url)}
            style={styles.adSlide}
            disabled={actionLocked}
        >
            <Image
                source={{ uri: buildImageUrl(item.image) }}
                style={styles.adImage}
                resizeMode="cover"
            />

            <View style={styles.adOverlay}>
                <View style={styles.adBadge}>
                    <Text style={styles.adBadgeText}>Sponsored</Text>
                </View>

                <View style={styles.adButton}>
                    <Text style={styles.adButtonText}>Open</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>

                {!!item.title && (
                    <View style={styles.adTextContent}>
                        <Text style={styles.adTitle} numberOfLines={1}>
                            {item.title}
                        </Text>

                        {!!item.description && (
                            <Text style={styles.adDescription} numberOfLines={1}>
                                {item.description}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </Pressable>
    ), [actionLocked, buildImageUrl, onPressAd])

    if (!ads.length) return null

    return (
        <Animated.View
            style={[
                styles.adsOuterWrap,
                {
                    borderColor: animatedBorderColor,
                    transform: [{ scale: animatedScale }],
                },
            ]}
        >
            <FlatList
                ref={adFlatListRef}
                data={ads}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => `ad-${item.id}`}
                renderItem={renderAdItem}
                onViewableItemsChanged={onAdViewableItemsChanged}
                viewabilityConfig={adViewabilityConfig}
                getItemLayout={getAdItemLayout}
                snapToAlignment="center"
                decelerationRate="fast"
            />

            <View style={styles.adDotsContainer}>
                {ads.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.adDot,
                            index === activeAdIndex && styles.adDotActive,
                        ]}
                    />
                ))}
            </View>

            {actionLocked && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
            )}
        </Animated.View>
    )
}

export default AdsCarousel

const styles = StyleSheet.create({
    adsOuterWrap: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 22,
        borderWidth: 2,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
    },

    adSlide: {
        width: width - 40,
        height: 190,
        backgroundColor: '#E5E7EB',
        position: 'relative',
    },

    adImage: {
        width: '100%',
        height: '100%',
    },

    adOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 12,
    },

    adBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },

    adBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },

    adButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(37,99,235,0.92)',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    adButtonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    adTextContent: {
        position: 'absolute',
        left: 12,
        bottom: 12,
        right: 90,
        backgroundColor: 'rgba(0,0,0,0.22)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
    },

    adTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },

    adDescription: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 11,
        lineHeight: 14,
    },

    adDotsContainer: {
        position: 'absolute',
        right: 14,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },

    adDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.45)',
        marginLeft: 6,
    },

    adDotActive: {
        width: 18,
        backgroundColor: '#FFFFFF',
    },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
})