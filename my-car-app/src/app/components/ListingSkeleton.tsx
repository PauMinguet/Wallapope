import { Card, CardContent, Grid, Skeleton, Box } from '@mui/material'

export default function ListingSkeleton() {
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: 'background.paper',
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
              borderRadius: 2
            }}
          />
        </Box>
        <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
        
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={4} key={i}>
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="80%" height={24} />
            </Grid>
          ))}
        </Grid>
        
        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  )
} 