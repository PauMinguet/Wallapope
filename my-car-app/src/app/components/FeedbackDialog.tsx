import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Box,
} from '@mui/material'
import { Feedback as FeedbackIcon } from '@mui/icons-material'
import { useUser } from '@clerk/nextjs'

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { user } = useUser()
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!feedback.trim()) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          feedback_text: feedback.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setSuccess(true)
      setFeedback('')
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError('Error submitting feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(25,25,25,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          color: 'white',
          minWidth: { xs: '90%', sm: 400 }
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center',
        pb: 1,
        pt: 3,
        background: 'linear-gradient(45deg, #4169E1, #9400D3)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold'
      }}>
        Enviar Feedback
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <FeedbackIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.7)' }} />
          </Box>
          <TextField
            multiline
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Cuéntanos tu experiencia o sugerencias para mejorar CholloCars..."
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.2)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#4169E1',
                },
              },
            }}
          />
          {error && (
            <Alert severity="error" sx={{ bgcolor: 'rgba(211,47,47,0.1)' }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ bgcolor: 'rgba(46,125,50,0.1)' }}>
              ¡Gracias por tu feedback!
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!feedback.trim() || submitting}
          sx={{
            px: 3,
            py: 1,
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            color: 'white',
            borderRadius: '20px',
            textTransform: 'none',
            fontSize: '0.9rem',
            minWidth: '140px',
            '&:hover': {
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              opacity: 0.9
            }
          }}
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            px: 3,
            py: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '20px',
            textTransform: 'none',
            fontSize: '0.9rem',
            minWidth: '140px',
            '&:hover': {
              borderColor: '#4169E1',
              background: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  )
} 