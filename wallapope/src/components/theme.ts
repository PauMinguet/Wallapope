import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // blue-500
    },
    background: {
      default: '#111827', // gray-900
      paper: '#1f2937', // gray-800
    },
  },
})

export default theme 