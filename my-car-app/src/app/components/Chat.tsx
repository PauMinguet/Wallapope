'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'
import { IconButton, Fade, Box } from '@mui/material'
import '../globals.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Chat({ }: ChatProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleChatToggle = () => {
    setIsChatOpen(prev => !prev)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMessage.trim()) return

    const newMessage: Message = { role: 'user', content: currentMessage }
    setMessages(prev => [...prev, newMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedResponse = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        accumulatedResponse += chunk

        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: accumulatedResponse
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box>
      {/* Chat Button */}
      <Box
        sx={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1200,
        }}
      >
        <IconButton
          onClick={handleChatToggle}
          sx={{
            width: 56,
            height: 56,
            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            },
            transition: 'all 0.3s ease',
            transform: isChatOpen ? 'scale(0.9)' : 'scale(1)',
          }}
        >
          <MessageSquare className="h-6 w-6" />
        </IconButton>
      </Box>

      {/* Chat Window */}
      <Fade in={isChatOpen}>
        <Box
          sx={{
            position: 'fixed',
            bottom: '96px',
            right: { xs: '12px', sm: '24px' },
            width: { xs: 'calc(100% - 24px)', sm: '380px' },
            height: '500px',
            bgcolor: '#111111',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            zIndex: 1150,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageSquare className="h-4 w-4 text-white" />
              <Box component="h3" sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                Chatea con ChollosCarFinder
              </Box>
            </Box>
            <IconButton
              onClick={handleChatToggle}
              size="small"
              sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: 'white' } }}
            >
              <X className="h-5 w-5" />
            </IconButton>
          </Box>

          {/* Messages Container */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {messages.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageSquare className="h-8 w-8 text-white" />
                </Box>
                <Box>
                  <Box component="p" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    ¡Bienvenido al Chat!
                  </Box>
                  <Box component="p" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                    ¿En qué puedo ayudarte a encontrar tu coche ideal?
                  </Box>
                </Box>
              </Box>
            )}
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    borderRadius: '16px',
                    p: 2,
                    ...(message.role === 'user'
                      ? {
                          background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                          color: 'white',
                        }
                      : {
                          bgcolor: 'rgba(255,255,255,0.05)',
                          color: 'white',
                        }),
                  }}
                >
                  {message.content}
                </Box>
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    maxWidth: '80%',
                    borderRadius: '16px',
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        bgcolor: 'white',
                        borderRadius: '50%',
                        animation: 'bounce 1s infinite',
                        animationDelay: '0ms',
                      }}
                    />
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        bgcolor: 'white',
                        borderRadius: '50%',
                        animation: 'bounce 1s infinite',
                        animationDelay: '150ms',
                      }}
                    />
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        bgcolor: 'white',
                        borderRadius: '50%',
                        animation: 'bounce 1s infinite',
                        animationDelay: '300ms',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Form */}
          <Box
            component="form"
            onSubmit={handleChatSubmit}
            sx={{
              p: 2,
              bgcolor: '#111111',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: 1,
            }}
          >
            <Box
              component="input"
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              sx={{
                flex: 1,
                bgcolor: 'rgba(255,255,255,0.05)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                px: 2,
                py: 1.5,
                '&:focus': {
                  outline: 'none',
                  boxShadow: '0 0 0 2px #4169E1',
                },
                '&::placeholder': {
                  color: 'rgba(255,255,255,0.4)',
                },
              }}
            />
            <IconButton
              type="submit"
              disabled={isLoading || !currentMessage.trim()}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                width: 42,
                height: 42,
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                },
                '&:disabled': {
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              <Send className="h-5 w-5" />
            </IconButton>
          </Box>
        </Box>
      </Fade>
    </Box>
  )
} 