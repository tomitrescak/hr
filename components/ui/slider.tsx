'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  className?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, onValueChange, max = 100, min = 0, step = 1, className, ...props }, ref) => {
    const currentValue = value[0] || 0
    const percentage = ((currentValue - min) / (max - min)) * 100

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      const sliderElement = e.currentTarget
      const rect = sliderElement.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      let newValue = min + percent * (max - min)
      
      // Round to nearest step
      newValue = Math.round(newValue / step) * step
      newValue = Math.max(min, Math.min(max, newValue))
      
      onValueChange([newValue])
      
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        const rect = sliderElement.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        let moveValue = min + percent * (max - min)
        
        moveValue = Math.round(moveValue / step) * step
        moveValue = Math.max(min, Math.min(max, moveValue))
        
        onValueChange([moveValue])
      }
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return (
      <div
        ref={ref}
        className={cn('relative flex w-full touch-none select-none items-center', className)}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
          <div
            className="absolute h-full bg-blue-500 transition-all duration-150 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute block h-5 w-5 rounded-full border-2 border-blue-500 bg-white shadow-md hover:shadow-lg transition-all duration-150 ease-in-out cursor-pointer hover:scale-110"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }