// components/Home/WebsiteBanners.tsx
//
// Shows the DealNux website's main promotional banners, pulled live from
// `banners/images/` so the client can change them from the admin panel without
// an app release. The endpoint is public and returns a bare object (no
// {success, data} envelope). Only `main_banners` is used — the website's side
// banners were dropped because the grid made the home screen too tall and did
// not read well at phone width.
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

// The carousel advances on its own, like the website's banner does.
const AUTO_ADVANCE_MS = 10000;

const H_PADDING = SCREEN_PADDING;   // matches the Premium card, so the edges line up

const CONTENT_WIDTH = SCREEN_WIDTH - H_PADDING * 2;
const MAIN_RATIO = 920 / 460;   // artwork is 2:1

interface MainBanner {
    id: number;
    title: string;
    image_url: string;
    image: string;
    order: number;
    is_active: boolean;
}

const srcOf = (b: { image_url?: string; image?: string }) => b.image_url || b.image || '';

export const WebsiteBanners: React.FC = () => {
    const [banners, setBanners] = useState<MainBanner[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const mounted = useRef(true);
    const listRef = useRef<FlatList<MainBanner>>(null);
    const indexRef = useRef(0);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const apply = useCallback((data: any) => {
        const main: MainBanner[] = Array.isArray(data?.main_banners) ? data.main_banners : [];

        const next = main
            .filter((b) => b.is_active !== false && srcOf(b))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        setBanners(next);

        // Warm the image cache so the artwork is ready before it scrolls into view.
        next.forEach((b) => Image.prefetch(srcOf(b)).catch(() => {}));
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
        const i = Math.round(e.nativeEvent.contentOffset.x / CONTENT_WIDTH);
        indexRef.current = i;
        setActiveIndex(i);
    };

    // Step to the next banner every few seconds, wrapping at the end. Swiping by
    // hand still works — the timer simply picks up from wherever the user left it.
    useEffect(() => {
        if (banners.length < 2) return;
        const id = setInterval(() => {
            const next = (indexRef.current + 1) % banners.length;
            indexRef.current = next;
            setActiveIndex(next);
            listRef.current?.scrollToOffset({ offset: next * CONTENT_WIDTH, animated: true });
        }, AUTO_ADVANCE_MS);
        return () => clearInterval(id);
    }, [banners.length]);

    // Nothing to show yet: stay out of the layout rather than holding the screen
    // behind a spinner. Once the banners arrive they simply appear.
    if (banners.length === 0) return null;

    return (
        <View style={styles.container}>
            <FlatList
                ref={listRef}
                horizontal
                pagingEnabled
                data={banners}
                keyExtractor={(item) => `main-${item.id}`}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onCarouselScroll}
                decelerationRate="fast"
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: srcOf(item) }}
                        style={styles.banner}
                        resizeMode="cover"
                        accessibilityLabel={item.title}
                    />
                )}
            />

            {banners.length > 1 && (
                <View style={styles.dots}>
                    {banners.map((b, i) => (
                        <View
                            key={`dot-${b.id}`}
                            style={[styles.dot, i === activeIndex && styles.dotActive]}
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
        marginTop: 5,
        marginBottom: SECTION_GAP,
    },
    banner: {
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
});

export default WebsiteBanners;
