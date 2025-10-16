'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from './button'
import { Slider } from './slider'
import { cn } from '@/lib/utils'
import { ZoomIn } from 'lucide-react'

interface ImageCropperProps {
  onCrop: (croppedBase64: string) => void
  onCancel: () => void
  className?: string
}

export function ImageCropper({ onCrop, onCancel, className }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState([100]) // Zoom from 0-200%
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const cropSize = 200 // Fixed crop size (square)
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit for original file
      alert('Image must be under 2MB')
      return
    }
    
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert('Only JPEG images are supported')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImageSrc(result)
      // Reset position when new image is loaded
      setImagePosition({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }
  
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  console.log(imagePosition)
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !imageSrc) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // Calculate movement bounds (20% of container size in each direction)
    const maxMoveX = cropSize * (0.3 * zoom[0] / 100) // Adjust bounds based on zoom level
    const maxMoveY = cropSize * (0.3 * zoom[0] / 100) // Adjust bounds based on zoom level

    // Constrain movement to bounds
    const constrainedX = Math.max(-maxMoveX, Math.min(maxMoveX, newX))
    const constrainedY = Math.max(-maxMoveY * (imageRef.current?.clientHeight || 1) / (imageRef.current?.clientWidth || 1), Math.min(maxMoveY, newY))

    setImagePosition({ x: constrainedX, y: constrainedY })
  }, [isDragging, dragStart, imageSrc, cropSize])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  
  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size to desired output size
    canvas.width = cropSize
    canvas.height = cropSize
    
    const img = imageRef.current
    
    // Clear the canvas
    ctx.clearRect(0, 0, cropSize, cropSize)
    
    // Replicate what CSS does with zoom applied
    const containerSize = cropSize
    const zoomFactor = zoom[0] / 100
    
    // Base size is 140% of container, then apply zoom
    const baseScale = 1
    const effectiveScale = baseScale * zoomFactor
    
    // Calculate how object-fit: cover would scale the image
    const targetWidth = containerSize * effectiveScale
    const targetHeight = containerSize * effectiveScale
    
    const scaleX = targetWidth / img.naturalWidth
    const scaleY = targetHeight / img.naturalHeight
    const scale = Math.max(scaleX, scaleY) // object-fit: cover uses larger scale
    
    const scaledWidth = img.naturalWidth * scale
    const scaledHeight = img.naturalHeight * scale
    
    // Position starts at -20% of container (same as CSS left/top)
    const baseLeft = 0
    const baseTop = 0
    
    // Center the scaled image within the target area
    const centerX = baseLeft + (targetWidth - scaledWidth) / 2
    const centerY = baseTop + (targetWidth - scaledWidth) / 2
    
    // Debug logging to see what's happening
    console.log('Crop Debug:', {
      containerSize,
      zoomFactor,
      effectiveScale,
      targetWidth, targetHeight,
      scale,
      scaledWidth, scaledHeight,
      baseLeft, baseTop,
      centerX, centerY,
      imagePosition
    })
    
    // Apply CSS transform to the canvas context (like CSS transform does)
    ctx.save()
    ctx.translate(imagePosition.x, imagePosition.y)
    
    // Draw the image at the calculated position
    ctx.drawImage(
      img,
      centerX, centerY,
      scaledWidth, scaledHeight
    )
    
    ctx.restore()
    
    // Convert to base64 with quality compression to meet 200KB limit
    let quality = 0.9
    let croppedBase64 = canvas.toDataURL('image/jpeg', quality)
    
    // Reduce quality until under 200KB
    while (croppedBase64.length * 0.75 > 200 * 1024 && quality > 0.1) {
      quality -= 0.1
      croppedBase64 = canvas.toDataURL('image/jpeg', quality)
    }
    
    if (croppedBase64.length * 0.75 > 200 * 1024) {
      alert('Unable to compress image under 200KB. Please use a smaller image.')
      return
    }
    
    onCrop(croppedBase64)
  }
  
  if (!imageSrc) {
    return (
      <div className={cn('p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50', className)}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Upload Profile Photo</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select a JPEG image to crop for your profile photo
          </p>
          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-2">Maximum 2MB • JPEG only</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Crop Your Photo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Drag to position and use the slider to zoom, then click crop
        </p>
      </div>
      
      {/* Crop Area */}
      <div className="flex justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 mb-2">Drag to position</p>
          <div
            ref={containerRef}
            className="relative bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden cursor-move"
            style={{ width: cropSize, height: cropSize }}
            onMouseDown={handleMouseDown}
          >
            {imageSrc && (
              <>
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop area"
                  className="absolute pointer-events-none select-none"
                  style={{
                    width: `${100 * (zoom[0] / 100)}%`,
                    maxWidth: 'unset',
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease',
                    left: '0%',
                    top: '0%'
                  }}
                  draggable={false}
                />
                
                {/* Crop overlay square with circle guide */}
                <div className="absolute inset-0 border-2 border-blue-500 border-opacity-60 pointer-events-none" />
                <div className="absolute inset-0 border-2 border-blue-300 border-dashed rounded-full pointer-events-none" />
                
                
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Zoom Control */}
      {imageSrc && (
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 text-gray-500" />
            <div className="flex-1">
              <Slider
                value={zoom}
                onValueChange={setZoom}
                max={200}
                min={50}
                step={5}
                className="w-full"
              />
            </div>
            <span className="text-sm text-gray-600 min-w-[45px]">{zoom[0]}%</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">Zoom: 50% - 200%</p>
        </div>
      )}
      
      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleCrop} disabled={!imageSrc}>
          Crop & Use Photo
        </Button>
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center">
        <p>• Drag to reposition the image • Use slider to zoom in/out</p>
        <p>• The final image will be 200×200 pixels and under 200KB</p>
      </div>
    </div>
  )
}