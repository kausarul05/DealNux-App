import { Ionicons } from '@expo/vector-icons'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import React, { useRef, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthStackParamList } from '../../Navigation/types'

const UPLOAD_URL = 'https://YOUR_API_DOMAIN.com/scan-product' // <-- change this

const Scanning = () => {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
  const cameraRef = useRef<CameraView>(null)

  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)

  // ---- helper: send image to API ----
  const sendToServer = async (uri: string) => {
    try {
      setLoading(true)

      const form = new FormData()
      form.append('image', {
        uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as any)

      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: form,
        headers: {
          // fetch will set multipart boundary automatically in RN if you DON'T set Content-Type manually
          // 'Content-Type': 'multipart/form-data',
        },
      })

      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `Request failed: ${res.status}`)
      }

      const data = await res.json()
      /**
       * Expected backend response example:
       * {
       *   found: true,
       *   product: { id: "123", name: "...", image: "...", price: ... }
       * }
       */
      if (data?.found && data?.product) {
        Alert.alert('Product Found!', data.product.name, [
          {
            text: 'View Product',
            onPress: () => {
              // navigation.navigate("ProductDetails", { id: data.product.id })
              console.log('Go to product:', data.product)
            },
          },
          { text: 'Scan Again' },
        ])
      } else {
        Alert.alert('Not Found', 'Could not recognize this product. Try again with better lighting.')
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ---- capture from camera ----
  const capturePhoto = async () => {
    try {
      if (loading) return
      const cam: any = cameraRef.current
      if (!cam?.takePictureAsync) {
        Alert.alert('Camera not ready', 'Please try again.')
        return
      }

      const photo = await cam.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      })

      if (!photo?.uri) return
      await sendToServer(photo.uri)
    } catch (e: any) {
      Alert.alert('Capture failed', e?.message || 'Could not capture photo')
    }
  }

  // ---- pick from gallery ----
  const pickFromGallery = async () => {
    try {
      if (loading) return
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      })

      if (result.canceled) return
      const uri = result.assets?.[0]?.uri
      if (!uri) return
      await sendToServer(uri)
    } catch (e: any) {
      Alert.alert('Gallery error', e?.message || 'Could not pick image')
    }
  }

  // Request permission if not granted
  if (!permission) return <View />
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to capture product images
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>Scan Product</Text>
      </SafeAreaView>

      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.topInstruction}>
            <Text style={styles.instructionText}>
              Center the product & tap capture
            </Text>
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Finding product...</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={pickFromGallery} disabled={loading}>
            <Text style={styles.uploadButtonText}>Upload From Gallery</Text>
            <Ionicons name="image-outline" size={20} color="#1F2937" />
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity style={styles.captureButton} onPress={capturePhoto} disabled={loading}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  )
}

export default Scanning

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: 'transparent', paddingHorizontal: 20, paddingTop: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.35)', // remove this
    backgroundColor: 'transparent',            // or this
    justifyContent: 'center',
    alignItems: 'center',
  },
  topInstruction: {
    position: 'absolute', top: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20,
  },
  instructionText: { fontSize: 15, color: '#1F2937', fontWeight: '500' },
  scanFrame: { width: 280, height: 280, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFFFFF' },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },

  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    gap: 10,
  },
  loadingText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  uploadButton: {
    position: 'absolute', bottom: 100,
    backgroundColor: '#FFFFFF', flexDirection: 'row',
    alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30,
  },
  uploadButtonText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },

  captureButton: {
    position: 'absolute', bottom: 160,
    width: 74, height: 74,
    borderRadius: 37,
    borderWidth: 5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  captureInner: {
    width: 54, height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },

  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 20, backgroundColor: '#F9F9FB',
  },
  permissionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginTop: 20, marginBottom: 8 },
  permissionText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  permissionButton: { backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  permissionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
})