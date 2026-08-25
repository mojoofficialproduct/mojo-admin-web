'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, X, ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';

export interface LocalImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
}

interface ImageUploaderProps {
  images: LocalImageItem[];
  onChange: (images: LocalImageItem[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: LocalImageItem[] = [];
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    Array.from(fileList).forEach((file) => {
      if (validExtensions.includes(file.type) || file.name.match(/\.(jpe?g|png|webp)$/i)) {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          sizeFormatted: formatFileSize(file.size),
        });
      }
    });

    onChange([...images, ...newItems]);
  };

  const handleRemove = (id: string) => {
    const itemToRemove = images.find((img) => img.id === id);
    if (itemToRemove) {
      URL.revokeObjectURL(itemToRemove.previewUrl);
    }
    onChange(images.filter((img) => img.id !== id));
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #000000' : '2px dashed #D1D5DB',
          backgroundColor: isDragging ? '#F9FAFB' : '#FAFAFA',
          borderRadius: 'var(--radius-md)',
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <UploadCloud size={22} color="#111827" />
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            Görselleri sürükleyip bırakın veya <span style={{ textDecoration: 'underline' }}>bilgisayardan seçin</span>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            JPG, JPEG, PNG, WEBP formatları desteklenir.
          </div>
        </div>
      </div>

      {/* Uploaded Image Previews */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Seçilen Görseller ({images.length})
            </span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>
              Sıralamayı butonlarla değiştirebilirsiniz
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 12,
            }}
          >
            {images.map((img, idx) => {
              const roleTag =
                idx === 0 ? '1 · Ana Görsel' : idx === 1 ? '2 · Hover' : `${idx + 1} · Galeri`;
              const isPrimary = idx === 0;

              return (
                <div
                  key={img.id}
                  className="animate-fade-in"
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: isPrimary ? '2px solid #000000' : '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    boxShadow: 'var(--shadow-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Image Aspect Box */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '130%',
                      backgroundColor: '#F3F4F6',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />

                    {/* Role Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        backgroundColor: isPrimary ? '#000000' : 'rgba(0, 0, 0, 0.65)',
                        color: '#FFFFFF',
                      }}
                    >
                      {roleTag}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(img.id)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Reorder Toolbar */}
                  <div
                    style={{
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #F3F4F6',
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'left')}
                      style={{
                        padding: 3,
                        color: idx === 0 ? '#D1D5DB' : '#374151',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ArrowLeft size={13} />
                    </button>

                    <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>
                      {img.sizeFormatted}
                    </span>

                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => handleMove(idx, 'right')}
                      style={{
                        padding: 3,
                        color: idx === images.length - 1 ? '#D1D5DB' : '#374151',
                        cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
