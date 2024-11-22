import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Type for our car request
interface CarRequest {
  marca: string
  modelo: string
  año: number
  color: string
  kilometraje: number
  precio: number
  email: string
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()

    // Validate the data
    if (!body.marca || !body.modelo || !body.año || !body.color || !body.kilometraje || !body.precio || !body.email) {
      return NextResponse.json(
        { error: 'Todos los campos marcados con * son requeridos' },
        { status: 400 }
      )
    }

    // Format the data
    const carRequest: CarRequest = {
      marca: body.marca,
      modelo: body.modelo,
      año: parseInt(body.año),
      color: body.color || '',
      kilometraje: parseInt(body.kilometraje),
      precio: parseFloat(body.precio),
      email: body.email
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('car_requests')
      .insert([carRequest])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Error al guardar la solicitud' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Solicitud guardada exitosamente',
        data 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Optional: Add GET method to retrieve requests
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('car_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener las solicitudes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 