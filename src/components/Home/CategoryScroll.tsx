// components/CategoryScroll.tsx
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

interface CategoryScrollProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryPress: (slug: string) => void;
}

const categoryIcons: Record<string, any> = {
  'all': { component: Ionicons, name: 'grid' },
  'electronics': { component: Ionicons, name: 'phone-portrait' },
  'fashion': { component: Ionicons, name: 'shirt' },
  'groceries': { component: Ionicons, name: 'basket' },
  'home': { component: Ionicons, name: 'home' },
  'beauty': { component: Ionicons, name: 'flower' },
  'sports': { component: Ionicons, name: 'football' },
  'books': { component: Ionicons, name: 'book' },
  'toys': { component: Ionicons, name: 'game-controller' },
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
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          const iconConfig = categoryIcons[cat.slug] || categoryIcons['all'];
          const IconComponent = iconConfig.component;
          
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
              onPress={() => onCategoryPress(cat.slug)}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <IconComponent 
                  name={iconConfig.name} 
                  size={22} 
                  color={isActive ? '#FFFFFF' : '#64748B'} 
                />
              </View>
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
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
    gap: 8,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    minWidth: 70,
  },
  categoryButtonActive: {
    backgroundColor: '#2563EB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
});