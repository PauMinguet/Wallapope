'use client'

import { useEffect, useState } from 'react'
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material'
import { Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PriceAnalysis {
  brand: string
  model: string
  year_range: string
  engine_type: string
  price_gap: number
  regular_min: number
  regular_max: number
  relevance_min: number
  relevance_max: number
  regular_search_url: string
  relevance_search_url: string
  timestamp: string
}

export default function StatsPage() {
  const [analyses, setAnalyses] = useState<PriceAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        const data = await response.json()
        console.log('First analysis item:', data[0])
        setAnalyses(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(price)

  const SearchButton = ({ url, label }: { url: string; label: string }) => (
    <Tooltip title={`Open ${label} search`}>
      <IconButton
        size="small"
        className="opacity-50 hover:opacity-100 transition-opacity"
        onClick={() => window.open(url, '_blank')}
      >
        <Search className="w-4 h-4" />
      </IconButton>
    </Tooltip>
  )

  if (loading) {
    return (
      <Container className="flex justify-center items-center min-h-screen bg-gray-900">
        <CircularProgress className="text-white" />
      </Container>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="no-underline">
          <Tooltip title="Back to Listings">
            <IconButton 
              className="!bg-gray-800/50 hover:!bg-gray-800/70 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
          </Tooltip>
        </Link>
      </div>

      <Container className="py-8">
        <Typography variant="h4" component="h1" gutterBottom className="text-center mb-8 text-white">
          Price Analysis by Model
        </Typography>

        <TableContainer 
          component={Paper} 
          className="bg-gray-800/50 backdrop-blur-sm shadow-xl border border-gray-700"
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="text-gray-300 font-semibold border-gray-700">Model</TableCell>
                <TableCell className="text-gray-300 font-semibold border-gray-700">Year Range</TableCell>
                <TableCell className="text-gray-300 font-semibold border-gray-700">Engine</TableCell>
                <TableCell className="text-gray-300 font-semibold border-gray-700">
                  Regular Price Range
                  <br />
                  <span className="text-xs text-gray-400">(ordered by price)</span>
                </TableCell>
                <TableCell className="text-gray-300 font-semibold border-gray-700">
                  Relevance Price Range
                  <br />
                  <span className="text-xs text-gray-400">(ordered by relevance)</span>
                </TableCell>
                <TableCell className="text-gray-300 font-semibold border-gray-700">Price Gap</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analyses.map((analysis, index) => (
                <TableRow 
                  key={`${analysis.brand}-${analysis.model}-${index}`}
                  sx={{
                    backgroundColor: analysis.price_gap > 0 
                      ? 'rgba(0, 255, 0, 0.03)' 
                      : 'rgba(255, 0, 0, 0.03)',
                    '&:hover': {
                      backgroundColor: analysis.price_gap > 0 
                        ? 'rgba(0, 255, 0, 0.05)' 
                        : 'rgba(255, 0, 0, 0.05)'
                    }
                  }}
                >
                  <TableCell className="text-gray-100 border-gray-700">
                    <div className="font-semibold">{analysis.brand}</div>
                    <div className="text-gray-300">{analysis.model}</div>
                  </TableCell>
                  <TableCell className="text-gray-100 border-gray-700">{analysis.year_range}</TableCell>
                  <TableCell className="text-gray-100 border-gray-700">{analysis.engine_type}</TableCell>
                  <TableCell className="text-gray-100 border-gray-700">
                    <div className="flex items-center gap-2">
                      <span>
                        {formatPrice(analysis.regular_min)} - {formatPrice(analysis.regular_max)}
                      </span>
                      {analysis.regular_search_url && (
                        <SearchButton url={analysis.regular_search_url} label="regular" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-100 border-gray-700">
                    <div className="flex items-center gap-2">
                      <span>
                        {formatPrice(analysis.relevance_min)} - {formatPrice(analysis.relevance_max)}
                      </span>
                      {analysis.relevance_search_url && (
                        <SearchButton url={analysis.relevance_search_url} label="relevance" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell 
                    className={`border-gray-700 ${
                      analysis.price_gap > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatPrice(Math.abs(analysis.price_gap))}
                    <span className="text-xs ml-1">
                      {analysis.price_gap > 0 ? '↑' : '↓'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </div>
  )
} 