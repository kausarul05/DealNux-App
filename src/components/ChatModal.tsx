// components/ChatModal.tsx
import React, { useState, useRef, useEffect } from 'react'
import {
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    Linking,
    Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChat } from '../hooks/useChat'
import SuggestedReplies from './chat/SuggestedReplies'
import { WebView } from 'react-native-webview'

const { height } = Dimensions.get('window')

interface ChatBotModalProps {
    visible: boolean
    onClose: () => void
}

const ChatModal = ({ visible, onClose }: ChatBotModalProps) => {
    const insets = useSafeAreaInsets()
    const [inputText, setInputText] = useState('')
    const scrollViewRef = useRef<ScrollView>(null)
    const initializedRef = useRef(false)
    const [webViewUrl, setWebViewUrl] = useState<string | null>(null)

    const {
        messages,
        isLoading,
        isConnected,
        error,
        sendMessage,
        initializeChat,
        retryConnection,
    } = useChat()

    useEffect(() => {
        if (visible && !initializedRef.current) {
            console.log('🚀 Initializing chat on modal open...')
            initializeChat()
            initializedRef.current = true
        }
    }, [visible])

    useEffect(() => {
        if (!visible) {
            initializedRef.current = false
        }
    }, [visible])

    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true })
            }, 200)
        }
    }, [messages])

    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(inputText.trim())
            setInputText('')
        }
    }

    const handleSuggestedReply = (reply: string) => {
        sendMessage(reply)
    }

    const handleProductPress = (url: string) => {
        setWebViewUrl(url) // opens in-app WebView instead of external browser
    }

    const formatTime = () => {
        const now = new Date()
        return now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    // Clean reply text - remove markdown links and images
    const cleanReplyText = (text: string, hasProducts?: boolean) => {
        if (!text) return ''
        let cleaned = text

        if (hasProducts) {
            // When product cards are shown, the bot's text often repeats each
            // product as a markdown list — strip those lines, keep only prose.
            cleaned = cleaned
                .split('\n')
                .filter((line) => {
                    const t = line.trim()
                    if (!t) return true
                    if (/^\d+[.)]\s/.test(t)) return false
                    if (/^[-*]\s/.test(t)) return false
                    if (/^!\[/.test(t)) return false
                    if (/^https?:\/\/\S+$/.test(t)) return false
                    return true
                })
                .join('\n')
        } else {
            cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '')
            cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        }

        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()
        return cleaned
    }

    // Check if message has products
    const hasProducts = (msg: any) => {
        return msg.products && msg.products.length > 0
    }

    // Check if message has suggestions
    const hasSuggestions = (msg: any) => {
        return msg.suggested_replies && msg.suggested_replies.length > 0
    }

    // Check if it's a user message
    const isUserMessage = (msg: any) => msg.sender === 'user'

    // Render product card
    const renderProductCard = (product: any, index: number) => {
        const uniqueKey = `${product.id}-${index}-${Date.now()}`

        return (
            <TouchableOpacity
                key={uniqueKey}
                style={styles.productCard}
                onPress={() => handleProductPress(product.external_url)}
                activeOpacity={0.7}
            >
                <Image
                    source={{
                        uri: product.image_url.startsWith('http')
                            ? product.image_url
                            : `https://ai.dealnux.shop${product.image_url}`
                    }}
                    style={styles.productImage}
                    resizeMode="cover"
                // defaultSource={require('../assets/placeholder.png')}
                />
                <View style={styles.productInfo}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                        {product.title}
                    </Text>
                    <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>
                            ${product.price.toFixed(2)}
                        </Text>
                        {product.original_price && (
                            <Text style={styles.productOriginalPrice}>
                                ${product.original_price.toFixed(2)}
                            </Text>
                        )}
                        {product.discount_percentage && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>
                                    -{Math.round(product.discount_percentage)}%
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.productMeta}>
                        <Text style={styles.productPlatform}>
                            {product.platform_name}
                        </Text>
                        {product.free_shipping && (
                            <View style={styles.freeShippingBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                <Text style={styles.freeShippingText}>Free Shipping</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    // Render a single message
    const renderMessage = (msg: any, msgIndex: number) => {
        const hasProd = hasProducts(msg)
        const hasSugg = hasSuggestions(msg)
        const isUser = isUserMessage(msg)

        // User message
        if (isUser && msg.reply_text) {
            return (
                <View key={`user-${msgIndex}`} style={styles.userMessageContainer}>
                    <View style={styles.userMessage}>
                        <Text style={styles.userMessageText}>{msg.reply_text}</Text>
                    </View>
                </View>
            )
        }

        // Assistant message with products
        if (hasProd) {
            // Clean the reply text to remove markdown/duplicate product listing
            const cleanText = cleanReplyText(msg.reply_text || '', true)

            return (
                <View key={`assistant-${msgIndex}`} style={styles.messageContainer}>
                    <View style={styles.assistantIcon}>
                        <Ionicons name="chatbubbles" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.messageContent}>
                        <Text style={styles.assistantLabel}>Assistant</Text>

                        {/* Show cleaned text without markdown */}
                        {cleanText && (
                            <Text style={styles.messageText}>{cleanText}</Text>
                        )}

                        {/* Show products as cards */}
                        <View style={styles.productsContainer}>
                            {msg.products.map((product: any, idx: number) =>
                                renderProductCard(product, idx)
                            )}
                        </View>

                        {/* Show suggestions if any */}
                        {hasSugg && (
                            <SuggestedReplies
                                replies={msg.suggested_replies}
                                onPress={handleSuggestedReply}
                            />
                        )}
                    </View>
                </View>
            )
        }

        // Assistant message with suggestions only
        if (hasSugg && msg.reply_text) {
            return (
                <View key={`assistant-${msgIndex}`} style={styles.messageContainer}>
                    <View style={styles.assistantIcon}>
                        <Ionicons name="chatbubbles" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.messageContent}>
                        <Text style={styles.assistantLabel}>Assistant</Text>
                        <Text style={styles.messageText}>{msg.reply_text}</Text>
                        <SuggestedReplies
                            replies={msg.suggested_replies}
                            onPress={handleSuggestedReply}
                        />
                    </View>
                </View>
            )
        }

        // Assistant message only (text only)
        if (msg.reply_text) {
            return (
                <View key={`assistant-${msgIndex}`} style={styles.messageContainer}>
                    <View style={styles.assistantIcon}>
                        <Ionicons name="chatbubbles" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.messageContent}>
                        <Text style={styles.assistantLabel}>Assistant</Text>
                        <Text style={styles.messageText}>{msg.reply_text}</Text>
                    </View>
                </View>
            )
        }

        return null
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Fixed-height container — no longer a KeyboardAvoidingView,
                    so opening the keyboard can no longer shrink/collapse the
                    whole modal. Only the input row below reacts to the
                    keyboard. */}
                <View
                    style={[
                        styles.modalContainer,
                        { paddingBottom: insets.bottom },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.botIcon}>
                                <Ionicons name="chatbubbles" size={24} color="#2563EB" />
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>ChatBot Assistant</Text>
                                <View style={styles.statusRow}>
                                    <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
                                    <Text style={styles.statusText}>
                                        {isConnected ? 'Online' : isLoading ? 'Connecting...' : 'Offline'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={retryConnection}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Chat Messages */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.chatContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.chatContentContainer}
                    >
                        {messages.length === 0 && !isLoading && !error ? (
                            <View style={styles.welcomeContainer}>
                                <View style={styles.welcomeIcon}>
                                    <Ionicons name="chatbubbles" size={48} color="#2563EB" />
                                </View>
                                <Text style={styles.welcomeTitle}>Welcome to ChatBot!</Text>
                                <Text style={styles.welcomeText}>
                                    Ask me about products, prices, or anything else!
                                </Text>
                                <Text style={styles.welcomeSubText}>
                                    Try: "Show me running shoes under $100"
                                </Text>
                            </View>
                        ) : messages.length === 0 && isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#2563EB" />
                                <Text style={styles.loadingText}>Connecting to chat server...</Text>
                            </View>
                        ) : (
                            <>
                                {messages.length > 0 && (
                                    <Text style={styles.timeText}>{formatTime()}</Text>
                                )}

                                {messages.map((msg, index) => renderMessage(msg, index))}

                                {isLoading && messages.length > 0 && (
                                    <View style={styles.typingContainer}>
                                        <ActivityIndicator size="small" color="#2563EB" />
                                        <Text style={styles.typingText}>Assistant is typing...</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Input Area — only this part reacts to the keyboard now */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
                    >
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                                placeholderTextColor="#9CA3AF"
                                value={inputText}
                                onChangeText={setInputText}
                                returnKeyType="send"
                                onSubmitEditing={handleSend}
                                editable={isConnected && !isLoading}
                            />
                            <TouchableOpacity
                                style={[styles.sendButton, (!inputText.trim() || !isConnected || isLoading) && styles.sendButtonDisabled]}
                                onPress={handleSend}
                                disabled={!inputText.trim() || !isConnected || isLoading}
                            >
                                <Ionicons
                                    name="send"
                                    size={20}
                                    color={(inputText.trim() && isConnected && !isLoading) ? 'white' : '#94A3B8'}
                                />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>

            {/* In-app browser for product links — separate top-level Modal so
                it isn't nested inside the chat modal's view tree. */}
            <Modal
                visible={!!webViewUrl}
                animationType="slide"
                onRequestClose={() => setWebViewUrl(null)}
            >
                <View style={[styles.webviewContainer, { paddingTop: insets.top }]}>
                    <View style={styles.webviewHeader}>
                        <TouchableOpacity onPress={() => setWebViewUrl(null)} style={styles.webviewCloseButton}>
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.webviewTitle} numberOfLines={1}>
                            {webViewUrl}
                        </Text>
                    </View>
                    {webViewUrl && (
                        <WebView
                            source={{ uri: webViewUrl }}
                            style={{ flex: 1 }}
                            startInLoadingState
                            renderLoading={() => (
                                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
                            )}
                        />
                    )}
                </View>
            </Modal>
        </Modal>
    )
}

export default ChatModal

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: height * 0.85,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    botIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2563EB',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9CA3AF',
    },
    statusDotConnected: {
        backgroundColor: '#10B981',
    },
    statusText: {
        fontSize: 11,
        color: '#94A3B8',
    },
    closeButton: {
        padding: 4,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#FEE2E2',
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: '#DC2626',
    },
    retryText: {
        fontSize: 13,
        color: '#2563EB',
        fontWeight: '600',
    },
    chatContent: {
        flex: 1,
    },
    chatContentContainer: {
        padding: 16,
        paddingBottom: 8,
        flexGrow: 1,
    },
    welcomeContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    welcomeIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeSubText: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    timeText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 16,
    },
    messageContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    assistantIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    messageContent: {
        flex: 1,
    },
    assistantLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 8,
    },
    userMessageContainer: {
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    userMessage: {
        backgroundColor: '#DBEAFE',
        borderRadius: 16,
        borderTopRightRadius: 4,
        padding: 12,
        maxWidth: '80%',
    },
    userMessageText: {
        fontSize: 14,
        color: '#1F2937',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingLeft: 44,
    },
    typingText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 14,
        color: '#1F2937',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    // Product Card Styles
    productsContainer: {
        marginTop: 8,
        gap: 10,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
        marginBottom: 8,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    productInfo: {
        flex: 1,
        justifyContent: 'space-between',
    },
    productTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 4,
    },
    productPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2563EB',
    },
    productOriginalPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    discountBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#DC2626',
    },
    productMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 4,
    },
    productPlatform: {
        fontSize: 11,
        color: '#6B7280',
    },
    freeShippingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    freeShippingText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '500',
    },

    webviewContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    webviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    webviewCloseButton: {
        padding: 4,
    },
    webviewTitle: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
    },
})