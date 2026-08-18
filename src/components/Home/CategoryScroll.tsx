// components/Home/CategoryScroll.tsx
//
// Compact, horizontally scrollable category chips with an icon to the left of
// each label. The website shows a photographic collage per category, but those
// cannot be recoloured white for the selected state and would not read at chip
// size, so we use one uniform outline icon set instead — every icon is the same
// size and stroke weight, matching the "same size and style" requirement.
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Category {
    id: number;
    name: string;
    slug: string;
}

interface CategoryScrollProps {
    categories: Category[];
    selectedCategory: string;
    onCategoryPress: (slug: string) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Keep the chip text and icon the same height so adding icons does not make
// the chips any taller than they were before.
const ICON_SIZE = 16;

const DEALNUX_BLUE = '#2563EB';
const CHIP_TEXT = '#1F2937';

// One entry per category on the DealNux website, keyed by the slug the backend
// returns (same slugs the website uses in `?category=`).
const CATEGORY_ICONS: Record<string, IoniconName> = {
    'all': 'apps-outline',
    'electronics': 'hardware-chip-outline',
    'mens-fashion': 'shirt-outline',
    'womens-fashion': 'woman-outline',
    'home-kitchen': 'home-outline',
    'health-beauty': 'sparkles-outline',
    'sports-outdoors': 'basketball-outline',
    'baby-kids': 'balloon-outline',
    'books-entertainment': 'book-outline',
    'automotive': 'car-sport-outline',
    'food-grocery': 'basket-outline',
    'office-business': 'briefcase-outline',
    'travel-experiences': 'airplane-outline',
    'arts-crafts-collectibles': 'color-palette-outline',
    'digital-products-services': 'cloud-download-outline',
    'financial-products': 'card-outline',
    'wedding-events': 'heart-circle-outline',
};

// Categories are managed in the backend, so new ones can appear at any time.
// Match on a keyword in the name before falling back to a neutral tag icon.
const KEYWORD_ICONS: [RegExp, IoniconName][] = [
    [/phone|mobile/i, 'phone-portrait-outline'],
    [/laptop|computer/i, 'laptop-outline'],
    [/camera|photo/i, 'camera-outline'],
    [/music|audio|headphone/i, 'headset-outline'],
    [/game|gaming|toy/i, 'game-controller-outline'],
    [/watch/i, 'watch-outline'],
    [/shoe|footwear|sneaker/i, 'footsteps-outline'],
    [/bag|luggage/i, 'bag-handle-outline'],
    [/jewel|accessor/i, 'diamond-outline'],
    [/pet|animal/i, 'paw-outline'],
    [/garden|plant|flower/i, 'leaf-outline'],
    [/tool|hardware|diy/i, 'construct-outline'],
    [/furniture|decor/i, 'bed-outline'],
    [/health|fitness|medic|pharma/i, 'fitness-outline'],
    [/beauty|cosmetic|skin/i, 'sparkles-outline'],
    [/fashion|cloth|apparel|wear/i, 'shirt-outline'],
    [/food|grocer|drink|beverage/i, 'basket-outline'],
    [/book|stationer/i, 'book-outline'],
    [/travel|tour|flight/i, 'airplane-outline'],
    [/car|auto|vehicle|bike/i, 'car-sport-outline'],
    [/baby|kid|child/i, 'balloon-outline'],
    [/office|business|work/i, 'briefcase-outline'],
    [/finance|bank|insur|card/i, 'card-outline'],
    [/digital|software|online|service/i, 'cloud-download-outline'],
    [/art|craft|collect/i, 'color-palette-outline'],
    [/wedding|event|party/i, 'heart-circle-outline'],
    [/sport|outdoor/i, 'basketball-outline'],
    [/home|kitchen/i, 'home-outline'],
    [/electronic|gadget|device|tech/i, 'hardware-chip-outline'],
];

const getCategoryIcon = (cat: Category): IoniconName => {
    const bySlug = CATEGORY_ICONS[cat.slug?.toLowerCase?.() ?? ''];
    if (bySlug) return bySlug;

    const haystack = `${cat.name ?? ''} ${cat.slug ?? ''}`;
    for (const [pattern, icon] of KEYWORD_ICONS) {
        if (pattern.test(haystack)) return icon;
    }
    return 'pricetag-outline';
};

export const CategoryScroll: React.FC<CategoryScrollProps> = ({
    categories,
    selectedCategory,
    onCategoryPress,
}) => {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {categories.map((cat) => {
                    const isActive = selectedCategory === cat.slug;
                    const iconName = getCategoryIcon(cat);
                    const tint = isActive ? '#FFFFFF' : DEALNUX_BLUE;

                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
                            onPress={() => onCategoryPress(cat.slug)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={cat.name}
                        >
                            <Ionicons name={iconName} size={ICON_SIZE} color={tint} />
                            <Text
                                style={[styles.categoryText, isActive && styles.categoryTextActive]}
                                numberOfLines={1}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {},
    scrollContent: {
        paddingHorizontal: 16,
        gap: 8,
        paddingVertical: 6,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        minHeight: 35,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    categoryButtonActive: {
        backgroundColor: DEALNUX_BLUE,
        borderColor: DEALNUX_BLUE,
        shadowColor: DEALNUX_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    categoryText: {
        fontSize: 14,
        lineHeight: 18,
        color: CHIP_TEXT,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
});
