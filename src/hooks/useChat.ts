// hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { Alert } from 'react-native'
import { chatService, ChatMessage, ChatProduct } from '../services/chatService'
import { Socket } from 'socket.io-client'

export interface ChatState {
    messages: ChatMessage[]
    isLoading: boolean
    isConnected: boolean
    error: string | null
    products: ChatProduct[]
    suggestedReplies: string[]
}

export const useChat = () => {
    const [state, setState] = useState<ChatState>({
        messages: [],
        isLoading: false,
        isConnected: false,
        error: null,
        products: [],
        suggestedReplies: [],
    })
    
    const socketRef = useRef<Socket | null>(null)
    const initializedRef = useRef(false)

    const initializeChat = useCallback(async () => {
        if (initializedRef.current) return

        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }))
            
            const token = await chatService.getGuestToken()
            const socket = chatService.connect(token)
            socketRef.current = socket

            // Connection events
            chatService.onConnect(() => {
                setState(prev => ({ ...prev, isConnected: true, isLoading: false }))
            })

            chatService.onDisconnect(() => {
                setState(prev => ({ ...prev, isConnected: false }))
            })

            chatService.onError((error) => {
                setState(prev => ({ 
                    ...prev, 
                    error: error?.message || 'Connection error',
                    isLoading: false 
                }))
            })

            // Message handler
            chatService.onMessage((data) => {
                setState(prev => ({
                    ...prev,
                    messages: [...prev.messages, data],
                    products: data.products || [],
                    suggestedReplies: data.suggested_replies || [],
                    isLoading: false,
                }))
            })

            initializedRef.current = true
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                error: error?.message || 'Failed to initialize chat',
                isLoading: false,
            }))
        }
    }, [])

    const sendMessage = useCallback((message: string) => {
        if (!message.trim()) return
        
        setState(prev => ({ ...prev, isLoading: true }))
        
        // Add user message to UI
        const userMessage: ChatMessage = {
            reply_text: message,
            products: [],
            suggested_replies: [],
        }
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
        }))

        chatService.sendMessage(message)
    }, [])

    const disconnect = useCallback(() => {
        chatService.disconnect()
        socketRef.current = null
        initializedRef.current = false
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

    // Auto-initialize on mount
    useEffect(() => {
        initializeChat()
        return () => {
            disconnect()
        }
    }, [])

    return {
        ...state,
        sendMessage,
        disconnect,
        clearMessages,
        initializeChat,
    }
}