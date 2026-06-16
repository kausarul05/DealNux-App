// components/Home/StickyHeader.tsx
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { EvilIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { HomeHeader } from './HomeHeader';
import { CategoryScroll } from './CategoryScroll';

const { height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 180 : 160;

interface StickyHeaderProps {
    userName: string;
    categories: any[];
    selectedCategory: string;
    onCategoryPress: (slug: string) => void;
    // scrollY: Animated.Value;  // This is the animated value from parent
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
    userName,
    categories,
    selectedCategory,
    onCategoryPress,
    scrollY,
}) => {
    const navigation = useNavigation();
    const [isScrolled, setIsScrolled] = useState(false);

    // Animated values for header
    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, -80],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 50, 100],
        outputRange: [1, 0.8, 0],
        extrapolate: 'clamp',
    });

    const searchTranslateY = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, -60],
        extrapolate: 'clamp',
    });

    const categoryTranslateY = scrollY.interpolate({
        inputRange: [0, 150],
        outputRange: [0, -40],
        extrapolate: 'clamp',
    });

    // For compact header when scrolled
    const compactHeaderOpacity = scrollY.interpolate({
        inputRange: [80, 120],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Main Header - Slides up on scroll */}
            <Animated.View
                style={[
                    styles.headerWrapper,
                    {
                        transform: [{ translateY: headerTranslateY }],
                        opacity: headerOpacity,
                    },
                ]}
            >
                <HomeHeader userName={userName} />

                {/* Search Bar */}
                <Animated.View
                    style={[
                        styles.searchWrapper,
                        {
                            transform: [{ translateY: searchTranslateY }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.searchContainer}
                        onPress={() => navigation.navigate('SearchProduct' as never)}
                        activeOpacity={0.7}
                    >
                        <EvilIcons name="search" size={26} color="#94A3B8" />
                        <Text style={styles.searchInput}>Search products, brands....</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Categories */}
                <Animated.View
                    style={[
                        styles.categoryWrapper,
                        {
                            transform: [{ translateY: categoryTranslateY }],
                        },
                    ]}
                >
                    <CategoryScroll
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryPress={onCategoryPress}
                    />
                </Animated.View>
            </Animated.View>

            {/* Compact Header - Appears when scrolled */}
            <Animated.View
                style={[
                    styles.compactHeader,
                    {
                        opacity: compactHeaderOpacity,
                    },
                ]}
            >
                <View style={styles.compactContent}>
                    <TouchableOpacity
                        style={styles.compactSearch}
                        onPress={() => navigation.navigate('SearchProduct' as never)}
                    >
                        <EvilIcons name="search" size={22} color="#94A3B8" />
                        <Text style={styles.compactSearchText}>Search...</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notification' as never)}
                        style={styles.compactNotification}
                    >
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F9F9FB',
        zIndex: 10,
    },
    headerWrapper: {
        backgroundColor: '#F9F9FB',
        paddingBottom: 4,
        zIndex: 10,
    },
    searchWrapper: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchContainer: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#636F85',
        paddingHorizontal: 6,
    },
    categoryWrapper: {
        paddingVertical: 4,
    },
    // Compact Header Styles
    compactHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F9F9FB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        zIndex: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 4,
    },
    compactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    compactSearch: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 4,
    },
    compactSearchText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    compactNotification: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    notificationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        position: 'absolute',
        top: 8,
        right: 8,
    },
});