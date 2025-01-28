import { useState, useRef, useEffect } from 'react'
import { Box, IconButton } from '@mui/material'
import { Send, MessageSquare } from 'lucide-react'

export default function ContactChat() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente de ChollosCarFinder. Puedo ayudarte a:\n\n• Encontrar el coche perfecto para ti\n• Resolver dudas sobre precios y mercado\n• Explicarte cómo funcionan nuestras alertas\n• Asesorarte en tu búsqueda\n\n¿En qué puedo ayudarte hoy?'
    }
  ])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialRender = useRef(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    scrollToBottom()
  }, [messages])

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMessage.trim() || isLoading) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#111111',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 3,
          py: 2,
          background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MessageSquare className="h-4 w-4 text-white" />
          <Box component="h3" sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', m: 0 }}>
            Chatea con ChollosCarFinder
          </Box>
        </Box>
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
                whiteSpace: 'pre-line',
                ...(message.role === 'user'
                  ? {
                      background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                      color: 'white',
                      borderBottomRightRadius: '4px',
                    }
                  : {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      borderBottomLeftRadius: '4px',
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
                bgcolor: 'rgba(255,255,255,0.1)',
                color: 'white',
                maxWidth: '80%',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
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
            fontSize: '0.9rem',
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
  )
} 