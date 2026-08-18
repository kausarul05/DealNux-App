// components/Home/WebsiteBanners.tsx
//
// Shows the same promotional banners the DealNux website displays, pulled live
// from `banners/images/` so the client can change them from the admin panel
// without an app release. The endpoint is public and returns a bare object
// (no {success, data} envelope) with two groups:
//   • main_banners — wide 2:1 artwork, shown as a swipeable carousel
//   • side_banners — 1.36:1 artwork with a fixed position, shown as a single
//     row of two tiles (the website's remaining positions are dropped so the
//     home screen does not get too tall on a phone)
// Banners are never gated on subscription status — they show for every user.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BANNER_IMAGES, IPA_BASE } from '@env';
import { SCREEN_PADDING, SECTION_GAP } from '../../constants/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// `.env` is git-ignored, so a fresh checkout may not define BANNER_IMAGES yet.
// Fall back to the known path rather than requesting `.../undefined`.
const BANNERS_PATH = BANNER_IMAGES || 'banners/images/';

// The banners endpoint takes ~2s and the media server another ~4s per image, so
// the last response is cached and rendered immediately on the next visit while a
// fresh copy is fetched in the background.
const CACHE_KEY = 'bannersCache';

// Only two side banners are shown; the website's other positions would make the
// home screen too tall on a phone.
const MAX_SIDE_BANNERS = 2;

const H_PADDING = SCREEN_PADDING;   // matches the Premium card, so the edges line up
const GRID_GAP = 12;

const CONTENT_WIDTH = SCREEN_WIDTH - H_PADDING * 2;
const MAIN_RATIO = 920 / 460;   // artwork is 2:1
const SIDE_RATIO = 299 / 220;   // artwork is ~1.36:1
const SIDE_TILE_WIDTH = (CONTENT_WIDTH - GRID_GAP) / 2;

interface MainBanner {
    id: number;
    title: string;
    image_url: string;
    image: string;
    order: number;
    is_active: boolean;
}

interface SideBanner {
    id: number;
    title: string;
    image_url: string;
    image: string;
    position: number;
    is_active: boolean;
}

const srcOf = (b: { image_url?: string; image?: string }) => b.image_url || b.image || '';

export const WebsiteBanners: React.FC = () => {
    const [mainBanners, setMainBanners] = useState<MainBanner[]>([]);
    const [sideBanners, setSideBanners] = useState<SideBanner[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const apply = useCallback((data: any) => {
        const main: MainBanner[] = Array.isArray(data?.main_banners) ? data.main_banners : [];
        const side: SideBanner[] = Array.isArray(data?.side_banners) ? data.side_banners : [];

        const nextMain = main
            .filter((b) => b.is_active !== false && srcOf(b))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const nextSide = side
            .filter((b) => b.is_active !== false && srcOf(b))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .slice(0, MAX_SIDE_BANNERS);

        setMainBanners(nextMain);
        setSideBanners(nextSide);

        // Warm the image cache so the artwork is ready before it scrolls into view.
        [...nextMain, ...nextSide].forEach((b) => Image.prefetch(srcOf(b)).catch(() => {}));
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            // 1. Paint whatever we showed last time, straight away.
            try {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached && !cancelled && mounted.current) {
                    apply(JSON.parse(cached));
                }
            } catch {
                // A bad cache entry is not worth failing over.
            }

            // 2. Then refresh in the background.
            try {
                const res = await axios.get(`${IPA_BASE}${BANNERS_PATH}`, {
                    headers: { Accept: 'application/json' },
                    timeout: 15000,
                });
                if (cancelled || !mounted.current) return;
                apply(res?.data ?? {});
                AsyncStorage.setItem(CACHE_KEY, JSON.stringify(res?.data ?? {})).catch(() => {});
            } catch (e) {
                console.error('banners load error', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [apply]);

    const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / CONTENT_WIDTH);
        setActiveIndex(index);
    };

    // Nothing to show yet: stay out of the layout rather than holding the screen
    // behind a spinner. Once the banners arrive they simply appear.
    if (mainBanners.length === 0 && sideBanners.length === 0) return null;

    return (
        <View style={styles.container}>
            {mainBanners.length > 0 && (
                <>
                    <FlatList
                        horizontal
                        pagingEnabled
                        data={mainBanners}
                        keyExtractor={(item) => `main-${item.id}`}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onCarouselScroll}
                        decelerationRate="fast"
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: srcOf(item) }}
                                style={styles.mainBanner}
                                resizeMode="cover"
                                accessibilityLabel={item.title}
                            />
                        )}
                    />

                    {mainBanners.length > 1 && (
                        <View style={styles.dots}>
                            {mainBanners.map((b, i) => (
                                <View
                                    key={`dot-${b.id}`}
                                    style={[styles.dot, i === activeIndex && styles.dotActive]}
                                />
                            ))}
                        </View>
                    )}
                </>
            )}

            {sideBanners.length > 0 && (
                <View style={styles.grid}>
                    {sideBanners.map((item) => (
                        <Image
                            key={`side-${item.id}`}
                            source={{ uri: srcOf(item) }}
                            style={styles.sideBanner}
                            resizeMode="cover"
                            accessibilityLabel={item.title}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: H_PADDING,
        marginBottom: SECTION_GAP,
    },
    mainBanner: {
        width: CONTENT_WIDTH,
        height: CONTENT_WIDTH / MAIN_RATIO,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
    },
    dots: {
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 6,
        marginTop: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
    },
    dotActive: {
        width: 18,
        backgroundColor: '#2563EB',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
        marginTop: 14,
    },
    sideBanner: {
        width: SIDE_TILE_WIDTH,
        height: SIDE_TILE_WIDTH / SIDE_RATIO,
        borderRadius: 14,
        backgroundColor: '#E5E7EB',
    },
});

export default WebsiteBanners;
