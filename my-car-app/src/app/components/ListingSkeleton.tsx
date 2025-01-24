import { Card, CardContent, Grid, Skeleton, Box } from '@mui/material'

export default function ListingSkeleton() {
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
      borderRadius: 2,
      border: '1px solid rgba(255,255,255,0.1)',
      position: 'relative',
      overflow: 'visible',
      transition: 'all 0.3s ease-in-out'
    }}>
      <CardContent sx={{ flex: 1, p: 2 }}>
        <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 2 }}>
          <Skeleton 
            variant="rectangular" 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)'
            }}
          />
        </Box>
        <Skeleton 
          variant="text" 
          width="80%" 
          height={32} 
          sx={{ 
            mb: 1,
            bgcolor: 'rgba(255,255,255,0.1)'
          }} 
        />
        <Skeleton 
          variant="text" 
          width="40%" 
          height={40} 
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(255,255,255,0.1)'
          }} 
        />
        
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={4} key={i}>
              <Skeleton 
                variant="text" 
                width="60%" 
                height={16} 
                sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
              />
              <Skeleton 
                variant="text" 
                width="80%" 
                height={24} 
                sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
              />
            </Grid>
          ))}
        </Grid>
        
        <Skeleton 
          variant="rectangular" 
          height={36} 
          sx={{ 
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.1)'
          }} 
        />
      </CardContent>
    </Card>
  )
} 