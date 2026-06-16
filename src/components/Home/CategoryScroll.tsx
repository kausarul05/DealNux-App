// components/CategoryScroll.tsx (Alternative with varied icon sets)
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  Feather,
  AntDesign,
  Entypo,
  SimpleLineIcons,
  Fontisto,
  MaterialCommunityIcons
} from '@expo/vector-icons';

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

// More diverse icon mappings using different icon sets
const categoryIcons: Record<string, any> = {
  'all': { component: Ionicons, name: 'apps-outline' },
  'electronics': { component: MaterialIcons, name: 'devices' },
  'fashion': { component: Ionicons, name: 'shirt-outline' },
  'groceries': { component: FontAwesome5, name: 'shopping-basket' },
  'home': { component: Ionicons, name: 'home-outline' },
  'beauty': { component: MaterialCommunityIcons, name: 'face-woman' },
  'sports': { component: MaterialCommunityIcons, name: 'basketball' },
  'books': { component: Ionicons, name: 'book-outline' },
  'toys': { component: FontAwesome5, name: 'puzzle-piece' },
  'automotive': { component: MaterialIcons, name: 'car-rental' },
  'health': { component: Ionicons, name: 'fitness-outline' },
  'jewelry': { component: FontAwesome5, name: 'gem' },
  'music': { component: Ionicons, name: 'musical-notes-outline' },
  'gaming': { component: FontAwesome5, name: 'gamepad' },
  'food': { component: MaterialCommunityIcons, name: 'food' },
  'travel': { component: FontAwesome5, name: 'plane' },
  'furniture': { component: MaterialCommunityIcons, name: 'sofa' },
  'garden': { component: MaterialCommunityIcons, name: 'flower' },
  'tools': { component: MaterialCommunityIcons, name: 'toolbox' },
  'pets': { component: FontAwesome5, name: 'paw' },
  'baby': { component: FontAwesome5, name: 'baby' },
  'office': { component: MaterialIcons, name: 'business' },
  'school': { component: MaterialCommunityIcons, name: 'school' },
  'art': { component: MaterialCommunityIcons, name: 'palette' },
  'audio': { component: Ionicons, name: 'headset-outline' },
  'camera': { component: Ionicons, name: 'camera-outline' },
  'computer': { component: Ionicons, name: 'laptop-outline' },
  'mobile': { component: Ionicons, name: 'phone-portrait-outline' },
  'watch': { component: Ionicons, name: 'watch-outline' },
  'bags': { component: Ionicons, name: 'bag-outline' },
  'shoes': { component: MaterialCommunityIcons, name: 'shoe-sneaker' },
  'watches': { component: MaterialCommunityIcons, name: 'watch' },
  'sunglasses': { component: FontAwesome5, name: 'sunglasses' },
  'perfume': { component: MaterialCommunityIcons, name: 'perfume' },
  'skincare': { component: MaterialCommunityIcons, name: 'spa' },
  'haircare': { component: MaterialCommunityIcons, name: 'hair-dryer' },
  'fitness': { component: MaterialCommunityIcons, name: 'dumbbell' },
  'outdoor': { component: FontAwesome5, name: 'campground' },
  'kitchen': { component: MaterialCommunityIcons, name: 'silverware-fork-knife' },
  'dining': { component: Ionicons, name: 'restaurant-outline' },
  'bathroom': { component: MaterialCommunityIcons, name: 'shower' },
  'bedroom': { component: MaterialCommunityIcons, name: 'bed-queen' },
  'decor': { component: MaterialCommunityIcons, name: 'lamp' },
  'lighting': { component: Ionicons, name: 'bulb-outline' },
  'stationery': { component: FontAwesome5, name: 'pen-fancy' },
  'crafts': { component: MaterialCommunityIcons, name: 'scissors-cutting' },
  'hardware': { component: MaterialCommunityIcons, name: 'wrench' },
  'toiletries': { component: MaterialCommunityIcons, name: 'toothbrush' },
  'party': { component: FontAwesome5, name: 'gift' },
  'gifts': { component: FontAwesome5, name: 'gift' },
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
        snapToAlignment="center"
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          const iconConfig = categoryIcons[cat.slug] || categoryIcons['all'];
          const IconComponent = iconConfig.component;
          
          // Calculate dynamic padding based on text length
          const textLength = cat.name.length;
          const horizontalPadding = textLength > 10 ? 18 : textLength > 6 ? 14 : 12;
          
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                isActive && styles.categoryButtonActive,
                { paddingHorizontal: horizontalPadding }
              ]}
              onPress={() => onCategoryPress(cat.slug)}
              activeOpacity={0.7}
            >
              {/* <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <IconComponent 
                  name={iconConfig.name} 
                  size={18} 
                  color={isActive ? '#FFFFFF' : '#475569'} 
                />
              </View> */}
              <Text 
                style={[styles.categoryText, isActive && styles.categoryTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
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
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 6,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 44,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
});