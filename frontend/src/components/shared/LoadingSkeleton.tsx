import React from 'react'

interface Props {
  lines?: number
  className?: string
}

export function LoadingSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-bg-surface animate-pulse"
          style={{ width: `${85 - i * 10}%` }}
        />
      ))}
    </div>
  )
}
