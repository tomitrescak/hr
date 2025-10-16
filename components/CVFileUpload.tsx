'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

interface CVFileUploadProps {
  onFileProcessed: (content: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ProcessedFile {
  name: string;
  size: number;
  content: string;
}

export default function CVFileUpload({ onFileProcessed, onError, className = '' }: CVFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);

  const acceptedTypes = '.pdf';
  const maxSize = 5 * 1024 * 1024; // 5MB

  const validateFile = useCallback((file: File): string | null => {
    const validTypes = ['application/pdf'];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf)$/i)) {
      return 'Please upload a PDF file only';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }
    
    return null;
  }, [maxSize]);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError?.(validationError);
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-cv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process file');
      }

      const result = await response.json();
      const processedData: ProcessedFile = {
        name: file.name,
        size: file.size,
        content: result.content,
      };

      setProcessedFile(processedData);
      onFileProcessed(result.content);
    } catch (error) {
      console.error('Error processing file:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed, onError, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const removeFile = () => {
    setProcessedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!processedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInput}
            className="hidden"
            id="cv-file-upload"
            disabled={isProcessing}
          />
          
          {isProcessing ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-700">Processing your CV...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <label htmlFor="cv-file-upload" className="cursor-pointer">
                  <p className="text-lg font-medium text-gray-700">
                    Drop your CV here or <span className="text-blue-600 hover:text-blue-700">browse</span>
                  </p>
                </label>
                  <p className="text-sm text-gray-500">
                    Supports PDF files up to 5MB
                  </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{processedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(processedFile.size)} • Processed successfully
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded border">
            <p className="text-sm font-medium text-gray-700 mb-2">Processed Content Preview:</p>
            <div className="max-h-40 overflow-y-auto text-xs text-gray-600 whitespace-pre-wrap">
              {processedFile.content.substring(0, 500)}
              {processedFile.content.length > 500 && '...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}