// Scanning.tsx - Fixed with Stop Scanning on Modal
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useRef, useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthStackParamList } from '../../Navigation/types'
import { IPA_BASE } from '@env'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width, height } = Dimensions.get('window')
const API_BASE_URL = IPA_BASE

type ScanMode = 'barcode' | 'gallery'

const Scanning = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
  const cameraRef = useRef<CameraView>(null)

  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<ScanMode>('barcode')
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Animation values
  const scanLineAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // ─── Animations ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Pulse animation for capture button (if needed later)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  })

  // ─── Stop Scanning ──────────────────────────────────────────────────────────
  const stopScanning = () => {
    setIsScanning(true)
    // This prevents any further barcode scans
  }

  const resumeScanning = () => {
    setScannedData(null)
    setIsScanning(false)
  }

  // ─── Barcode Scanner ──────────────────────────────────────────────────────
  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // ✅ Don't scan if modal is open or already scanning
    if (isScanning || loading || isModalOpen) return
    
    // ✅ Stop scanning immediately
    stopScanning()

    const barcodeData = result.data
    setScannedData(barcodeData)

    try {
      setLoading(true)
      const token = await AsyncStorage.getItem('vToken')

      console.log('📦 Barcode scanned:', barcodeData)

      const response = await axios.get(
        `${API_BASE_URL}fetch-products/decode-barcode/?code=${encodeURIComponent(barcodeData)}`,
        {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      console.log('📦 API Response:', response.data)

      const data = response?.data?.data || response?.data
      const product = data?.product
      const bestDeal = data?.best_deal
      const priceComparison = data?.price_comparison || []

      if (product) {
        const productId = product.id
        
        // ✅ Set modal open state to prevent scanning
        setIsModalOpen(true)

        Alert.alert(
          '✅ Product Found!',
          `${product.title || 'Product found'}\n\n💰 Best Price: $${bestDeal?.price || 'N/A'}\n🏷️ ${priceComparison.length} deals found`,
          [
            {
              text: 'View Product',
              onPress: () => {
                // ✅ Navigate and keep modal state
                navigation.navigate('ProductDetails', {
                  productId: productId,
                  source: 'external',
                } as never)
                // ✅ Resume scanning after navigation
                setTimeout(() => {
                  setIsModalOpen(false)
                  resumeScanning()
                }, 500)
              },
            },
            {
              text: 'Scan Again',
              onPress: () => {
                // ✅ Resume scanning immediately
                setIsModalOpen(false)
                resumeScanning()
              }
            },
          ]
        )
      } else {
        Alert.alert('Not Found', 'Could not find product for this barcode.')
        // ✅ Resume scanning after alert
        resumeScanning()
      }
    } catch (error: any) {
      console.error('❌ Barcode lookup error:', error)
      Alert.alert('Error', error?.response?.data?.message || 'Failed to lookup barcode')
      // ✅ Resume scanning after error
      resumeScanning()
    } finally {
      setLoading(false)
    }
  }

  // ─── Pick from Gallery ────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    try {
      if (loading) return
      
      // ✅ Stop scanning when opening gallery
      stopScanning()
      
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.')
        resumeScanning()
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      })

      if (result.canceled) {
        resumeScanning()
        return
      }
      
      const uri = result.assets?.[0]?.uri
      if (!uri) {
        resumeScanning()
        return
      }

      // For gallery images, we show a message since backend only supports barcode
      Alert.alert(
        '📷 Image Selected',
        'The backend currently supports barcode scanning. Please use the barcode mode for product lookup.',
        [
          {
            text: 'Switch to Barcode',
            onPress: () => {
              setScanMode('barcode')
              resumeScanning()
            },
          },
          { 
            text: 'OK',
            onPress: () => resumeScanning()
          },
        ]
      )
    } catch (e: any) {
      Alert.alert('Gallery error', e?.message || 'Could not pick image')
      resumeScanning()
    }
  }

  // ─── Request Permission ──────────────────────────────────────────────────
  if (!permission) return <View />
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1E2F73', '#2946A6']}
          style={styles.permissionContainer}
        >
          <View style={styles.permissionIconWrapper}>
            <Ionicons name="camera-outline" size={56} color="#FFFFFF" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan product barcodes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <LinearGradient
              colors={['#2355B6', '#1A4D8F']}
              style={styles.permissionGradient}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
          style={styles.cameraOverlay}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                Scan Barcode
              </Text>
              <TouchableOpacity
                style={styles.flashButton}
                onPress={() => {
                  // Toggle flash
                }}
              >
                <Ionicons name="flash-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mode Selector - Only Barcode & Gallery */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
              onPress={() => setScanMode('barcode')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="barcode-outline"
                size={20}
                color={scanMode === 'barcode' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.modeText, scanMode === 'barcode' && styles.modeTextActive]}>
                Barcode
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, scanMode === 'gallery' && styles.modeButtonActive]}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color={scanMode === 'gallery' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.modeText, scanMode === 'gallery' && styles.modeTextActive]}>
                Gallery
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scan Frame */}
          <View style={styles.scanFrameWrapper}>
            <Animated.View style={[styles.scanFrame, { opacity: fadeAnim }]}>
              {/* Corner borders */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scan line animation */}
              {scanMode === 'barcode' && !isScanning && !isModalOpen && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslateY }] },
                  ]}
                />
              )}

              {/* Loading overlay */}
              {loading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>
                    Looking up product...
                  </Text>
                </View>
              )}

              {/* Scanner instructions */}
              <View style={styles.scanInstructions}>
                <Text style={styles.scanInstructionText}>
                  {scanMode === 'barcode'
                    ? 'Align barcode within the frame'
                    : 'Select an image from your gallery'}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {scanMode === 'barcode' && (
              <View style={styles.barcodeHint}>
                <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
                <Text style={styles.barcodeHintText}>
                  {isScanning || loading ? 'Processing...' : 'Scanning will start automatically'}
                </Text>
              </View>
            )}

            {scanMode === 'gallery' && (
              <View style={styles.galleryHint}>
                <Ionicons name="images-outline" size={24} color="#FFFFFF" />
                <Text style={styles.galleryHintText}>
                  Select an image from your gallery
                </Text>
              </View>
            )}

            {/* Upload Button */}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickFromGallery}
              disabled={loading}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                style={styles.uploadGradient}
              >
                <Ionicons name="image-outline" size={20} color="#FFFFFF" />
                <Text style={styles.uploadText}>Upload</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.5)',
    borderColor: '#2355B6',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },

  // Scan Frame
  scanFrameWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },

  scanLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#2355B6',
    shadowColor: '#2355B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },

  scanInstructions: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanInstructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    gap: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Bottom Controls
  bottomControls: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    alignItems: 'center',
    gap: 16,
  },
  barcodeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  barcodeHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  galleryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  uploadButton: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  uploadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  permissionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default Scanning