import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Export a middleware function, then intercept and log any errors
const middleware = clerkMiddleware()

// Create a wrapped version to catch errors
// Using 'any' explicitly for evt since we don't know its exact type
// but need to pass it through
const wrappedMiddleware = (req: NextRequest, evt: any) => {
  try {
    // Call the original Clerk middleware
    return middleware(req, evt)
  } catch (error) {
    console.error('Middleware error:', error)
    
    // On failure, let the request continue normally
    return NextResponse.next()
  }
}

export default wrappedMiddleware

// Keep the config stable to avoid middleware errors
export const config = {
  matcher: [
    // Skip all static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Always protect API routes
    '/(api|trpc)(.*)',
  ],
}