// hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { chatService, ChatMessage } from '../services/chatService'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface ChatState {
    messages: ChatMessage[]
    isLoading: boolean
    isConnected: boolean
    error: string | null
    products: any[]
    suggestedReplies: string[]
}

// All reconnect/backoff/token-refresh decisions live here, in ONE place.
// The service (chatService.ts) does not auto-reconnect on its own anymore —
// it just opens a socket and reports what happened. This file is the only
// place that decides what to do next, so there's no race between two
// independent retry loops fighting over the same token.
export const useChat = () => {
    const [state, setState] = useState<ChatState>({
        messages: [],
        isLoading: false,
        isConnected: false,
        error: null,
        products: [],
        suggestedReplies: [],
    })

    const isConnectedRef = useRef(false)
    const isLoadingRef = useRef(false)
    const attemptsRef = useRef(0)
    const triedFreshTokenRef = useRef(false)
    const maxAttempts = 4
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const setupListeners = useCallback(() => {
        // Clear old listeners so they don't pile up across re-init calls.
        chatService['messageListeners'] = []
        chatService['connectListeners'] = []
        chatService['disconnectListeners'] = []
        chatService['errorListeners'] = []
        chatService['connectErrorListeners'] = []

        chatService.onConnect(() => {
            console.log('✅ Socket connected!')
            attemptsRef.current = 0
            triedFreshTokenRef.current = false
            isConnectedRef.current = true
            isLoadingRef.current = false
            setState(prev => ({
                ...prev,
                isConnected: true,
                isLoading: false,
                error: null,
            }))
        })

        chatService.onDisconnect(() => {
            console.log('🔌 Socket disconnected')
            isConnectedRef.current = false
            setState(prev => ({ ...prev, isConnected: false }))
        })

        chatService.onError((error) => {
            console.log('❌ Socket error:', error?.message ?? error)
        })

        chatService.onConnectError((error: any) => {
            console.log('❌ Connect error:', error?.message ?? error)
            handleConnectFailure(error)
        })

        chatService.onMessage((data) => {
            console.log('📥 Message received')
            setState(prev => ({
                ...prev,
                messages: [...prev.messages, data],
                products: data.products || [],
                suggestedReplies: data.suggested_replies || [],
                isLoading: false,
            }))
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleConnectFailure = useCallback((error: any) => {
        const isHandshakeRejection = !!error?.isHandshakeRejection

        // Case 1: server rejected the handshake itself (likely a stale/expired
        // guest token). Try exactly once with a freshly-fetched token.
        if (isHandshakeRejection && !triedFreshTokenRef.current) {
            triedFreshTokenRef.current = true
            console.log('🔄 Handshake rejected — fetching a fresh token and retrying once')
            isLoadingRef.current = false
            setState(prev => ({ ...prev, error: null }))
            // Small delay so we don't hammer the server immediately.
            retryTimerRef.current = setTimeout(() => doInitialize(true), 800)
            return
        }

        attemptsRef.current += 1

        if (attemptsRef.current >= maxAttempts) {
            console.log('🛑 Giving up after', attemptsRef.current, 'attempts')
            isLoadingRef.current = false
            setState(prev => ({
                ...prev,
                error: 'Failed to connect after multiple attempts. Please try again.',
                isLoading: false,
                isConnected: false,
            }))
            return
        }

        const delay = 2000 * attemptsRef.current
        console.log(`🔁 Will retry connection in ${delay}ms (attempt ${attemptsRef.current + 1}/${maxAttempts})`)
        retryTimerRef.current = setTimeout(() => doInitialize(false), delay)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const doInitialize = useCallback(async (forceFreshToken: boolean) => {
        if (isLoadingRef.current || isConnectedRef.current) return

        isLoadingRef.current = true
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        try {
            console.log('🔄 Initializing chat... (attempt', attemptsRef.current + 1, ')')
            const token = await chatService.getGuestToken(forceFreshToken)
            setupListeners()
            await chatService.connect(token)
            // onConnect listener handles success state.
        } catch (error: any) {
            console.error('❌ Chat initialization error:', error?.message ?? error)
            // connect() rejecting here means onConnectError already ran via the
            // listener in most cases, but guard in case it threw before listeners
            // were attached (e.g. getGuestToken failed).
            if (error?.isHandshakeRejection || /403|forbidden/i.test(error?.message || '')) {
                handleConnectFailure({ ...error, isHandshakeRejection: true })
            } else {
                handleConnectFailure(error)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setupListeners, handleConnectFailure])

    const initializeChat = useCallback(async () => {
        attemptsRef.current = 0
        triedFreshTokenRef.current = false
        await doInitialize(false)
    }, [doInitialize])

    const sendMessage = useCallback((message: string) => {
        if (!message.trim()) return

        if (!isConnectedRef.current) {
            setState(prev => ({
                ...prev,
                error: 'Not connected to chat server. Please wait...',
            }))
            return
        }

        setState(prev => ({ ...prev, isLoading: true }))

        const userMessage: ChatMessage = {
            reply_text: message,
            products: [],
            suggested_replies: [],
        }
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
        }))

        try {
            chatService.sendMessage(message)
        } catch (error: any) {
            console.error('❌ Send message error:', error)
            setState(prev => ({
                ...prev,
                error: error?.message || 'Failed to send message',
                isLoading: false,
            }))
        }
    }, [])

    const disconnect = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = null
        }
        chatService.disconnect()
        isConnectedRef.current = false
        isLoadingRef.current = false
        attemptsRef.current = 0
        setState(prev => ({ ...prev, isConnected: false }))
    }, [])

    const clearMessages = useCallback(() => {
        setState(prev => ({
            ...prev,
            messages: [],
            products: [],
            suggestedReplies: [],
        }))
    }, [])

    const retryConnection = useCallback(async () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = null
        }
        attemptsRef.current = 0
        triedFreshTokenRef.current = false
        chatService.disconnect()
        isConnectedRef.current = false

        await AsyncStorage.removeItem('chat_guest_token')
        await AsyncStorage.removeItem('chat_guest_user_id')

        await doInitialize(true)
    }, [doInitialize])

    useEffect(() => {
        return () => {
            disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return {
        ...state,
        sendMessage,
        disconnect,
        clearMessages,
        initializeChat,
        retryConnection,
    }
}