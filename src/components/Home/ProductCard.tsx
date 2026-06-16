// components/ProductCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export interface UiProduct {
  id: string;
  productId: number;
  name: string;
  price: number;
  originalPrice: number;
  discount: string;
  review_count: number;
  rating: number;
  image: string;
  seller: string;
  source: 'local' | 'external';
}

export type ProductSource = 'local' | 'external';

interface ProductCardProps {
  product: UiProduct;
  size?: 'small' | 'medium' | 'large';
  isFavorite: boolean;
  isLoading: boolean;
  onToggle: (productId: number) => void;
  onPress: (productId: number, source: ProductSource) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  size = 'small',
  isFavorite,
  isLoading,
  onToggle,
  onPress,
}) => {
  const [imageError, setImageError] = useState(false);
  const isMedium = size === 'medium';
  const isLarge = size === 'large';

  const handlePress = () => {
    onPress(product.productId, product.source);
  };

  const handleFavoritePress = () => {
    if (!isLoading) {
      onToggle(product.productId);
    }
  };

  const renderStars = () => {
    const stars = [];
    const rating = Math.round(product.rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < rating ? 'star' : 'star-outline'}
          size={12}
          color={i < rating ? '#F59E0B' : '#D1D5DB'}
        />
      );
    }
    return stars;
  };

  // Card size configurations
  const cardStyles = isMedium ? styles.mediumCard : isLarge ? styles.largeCard : styles.smallCard;
  const imageStyles = isMedium ? styles.mediumImage : isLarge ? styles.largeImage : styles.smallImage;
  const titleStyles = isMedium ? styles.mediumTitle : isLarge ? styles.largeTitle : styles.smallTitle;
  const priceStyles = isMedium ? styles.mediumPrice : isLarge ? styles.largePrice : styles.smallPrice;

  return (
    <TouchableOpacity
      style={[styles.card, cardStyles]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Image Container with Gradient Overlay */}
      <View style={[styles.imageContainer, imageStyles]}>
        {!imageError ? (
          <Image
            source={{ uri: product.image }}
            style={[styles.image, imageStyles]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.image, imageStyles, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={40} color="#CBD5E1" />
          </View>
        )}
        
        {/* Discount Badge */}
        {product.discount && (
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.discountBadge}
          >
            <Text style={styles.discountText}>{product.discount}</Text>
          </LinearGradient>
        )}

        {/* Source Badge */}
        {product.source === 'local' && (
          <View style={styles.sourceBadge}>
            <Ionicons name="storefront" size={10} color="#FFFFFF" />
            <Text style={styles.sourceText}>Local</Text>
          </View>
        )}

        {/* Rating */}
        {product.rating > 0 && (
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>{renderStars()}</View>
            <Text style={styles.ratingCount}>({product.review_count})</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Seller */}
        <Text style={styles.seller} numberOfLines={1}>
          {product.seller}
        </Text>

        {/* Product Name */}
        <Text style={[styles.title, titleStyles]} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price Section */}
        <View style={styles.priceContainer}>
          <Text style={[styles.price, priceStyles]}>${product.price.toFixed(2)}</Text>
          {product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
          )}
        </View>

        {/* Add to Cart / Quick Action */}
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handlePress}
        >
          <Ionicons name="bag-add-outline" size={16} color="#2563EB" />
          <Text style={styles.quickActionText}>View</Text>
        </TouchableOpacity>
      </View>

      {/* Favorite Button */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={handleFavoritePress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? '#EF4444' : '#64748B'}
        />
        {isLoading && (
          <View style={styles.loadingOverlay} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  smallCard: {
    width: CARD_WIDTH,
  },
  mediumCard: {
    width: CARD_WIDTH * 0.75,
  },
  largeCard: {
    width: CARD_WIDTH,
  },
  imageContainer: {
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  smallImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.1,
  },
  mediumImage: {
    width: CARD_WIDTH * 0.75,
    height: CARD_WIDTH * 0.9,
  },
  largeImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sourceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
  ratingContainer: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingCount: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '500',
  },
  infoContainer: {
    padding: 10,
  },
  seller: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  smallTitle: {
    fontSize: 13,
  },
  mediumTitle: {
    fontSize: 14,
  },
  largeTitle: {
    fontSize: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  price: {
    fontWeight: '700',
    color: '#2563EB',
  },
  smallPrice: {
    fontSize: 14,
  },
  mediumPrice: {
    fontSize: 16,
  },
  largePrice: {
    fontSize: 18,
  },
  originalPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quickActionText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductCard;