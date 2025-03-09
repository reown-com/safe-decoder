import React, { useRef } from 'react';

interface ImageUploadProps {
  onImageProcessed: (data: any) => void;
  isLoading: boolean;
  setIsLoading?: (loading: boolean) => void;
  buttonText?: string;
  loadingText?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageProcessed,
  isLoading,
  setIsLoading,
  buttonText = 'Extract JSON from Screenshot',
  loadingText = 'Processing...',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = () => {
    // Trigger the file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set loading state
    if (setIsLoading) {
      setIsLoading(true);
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/extract-json', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        onImageProcessed(data);
      } else {
        console.error('Error extracting JSON:', data.error);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      // Reset loading state if the parent component doesn't handle it
      if (!setIsLoading) {
        setTimeout(() => {
          // Give the parent component time to process the data
          // before resetting the loading state
          onImageProcessed({ _resetLoading: true });
        }, 500);
      }
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      {/* Button to trigger file selection */}
      <button 
        onClick={handleFileUpload}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
        disabled={isLoading}
        type="button"
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {loadingText}
          </span>
        ) : (
          buttonText
        )}
      </button>
    </>
  );
};

export default ImageUpload; 