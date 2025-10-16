'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  personId: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
  showTooltip?: boolean
  previewPhoto?: string // Base64 photo data for preview
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm', 
  lg: 'w-16 h-16 text-base',
  xl: 'w-20 h-20 text-lg'
}

export function Avatar({ 
  personId, 
  name, 
  size = 'md', 
  className, 
  showTooltip = true,
  previewPhoto
}: AvatarProps) {
  const [hasPhoto, setHasPhoto] = useState(true)
  const [isLoading, setIsLoading] = useState(!previewPhoto) // Don't show loading for preview photos
  const [imageKey, setImageKey] = useState(0) // For cache busting

  // Get initials from name (first letter of first and last name)
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ')
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase()
    }
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
  }

  const handleImageError = () => {
    // Don't show error for preview photos, they should always work
    if (!isPreview) {
      // Try cache busting once before giving up
      if (imageKey === 0) {
        setImageKey(Date.now())
        setIsLoading(true)
        return
      }
      setHasPhoto(false)
    }
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const initials = getInitials(name)
  const photoUrl = previewPhoto || `/api/avatar/${personId}/photo.jpg${imageKey ? `?v=${imageKey}` : ''}`
  const isPreview = !!previewPhoto

  const getAvatarStyles = () => {
    if (typeof size === 'number') {
      return {
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(size * 0.4, 12)}px`
      }
    }
    return {}
  }

  const getAvatarClasses = () => {
    if (typeof size === 'number') {
      return 'rounded-full flex items-center justify-center border-2 border-background overflow-hidden'
    }
    return cn(
      'rounded-full flex items-center justify-center border-2 border-background overflow-hidden',
      sizeClasses[size as keyof typeof sizeClasses]
    )
  }

  const avatarContent = (
    <div 
      className={cn(getAvatarClasses(), className)}
      style={getAvatarStyles()}
    >
      {hasPhoto ? (
        <>
          {isLoading && (
            <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
              <span className="text-muted-foreground font-medium">
                {initials}
              </span>
            </div>
          )}
          <img
            src={photoUrl}
            alt={`${name}'s avatar`}
            className={cn(
              'w-full h-full object-cover',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        </>
      ) : (
        <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
          {initials}
        </div>
      )}
    </div>
  )

  if (showTooltip) {
    return (
      <div className="group relative inline-block">
        {avatarContent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {name}
        </div>
      </div>
    )
  }

  return avatarContent
}