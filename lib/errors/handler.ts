import { NextResponse } from 'next/server'
import { AppError } from './index'

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    )
  }

  if (process.env.NODE_ENV === 'development') {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
    { status: 500 },
  )
}
