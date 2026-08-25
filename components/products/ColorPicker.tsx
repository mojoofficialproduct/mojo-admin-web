'use client';

import React, { useState } from 'react';
import { MOJO_COLOR_PALETTE, getColorSwatch } from '@/lib/shopify/mojo';
import { Check, Plus, Palette } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: string;
  customHex?: string;
  onChange: (colorName: string, hex?: string) => void;
}

export function ColorPicker({ selectedColor, customHex, onChange }: ColorPickerProps) {
  const [isCustomMode, setIsCustomMode] = useState(
    Boolean(selectedColor && !MOJO_COLOR_PALETTE.includes(selectedColor))
  );
  const [customNameInput, setCustomNameInput] = useState(
    isCustomMode ? selectedColor : ''
  );
  const [customHexInput, setCustomHexInput] = useState(
    customHex || (isCustomMode ? getColorSwatch(selectedColor) : '#E62E2E')
  );

  const handleSelectPreset = (color: string) => {
    setIsCustomMode(false);
    onChange(color, getColorSwatch(color));
  };

  const handleCustomApply = () => {
    if (customNameInput.trim()) {
      onChange(customNameInput.trim(), customHexInput);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Preset Swatches Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          gap: 8,
        }}
      >
        {MOJO_COLOR_PALETTE.map((color) => {
          const hex = getColorSwatch(color);
          const isSelected = !isCustomMode && selectedColor === color;
          const isLight = hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#f2e8c9' || hex.toLowerCase() === '#eae3d6';

          return (
            <button
              key={color}
              type="button"
              onClick={() => handleSelectPreset(color)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: isSelected ? '1.5px solid #000000' : '1px solid var(--border-subtle)',
                backgroundColor: isSelected ? '#F9FAFB' : '#FFFFFF',
                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: hex,
                  border: isLight ? '1px solid #D1D5DB' : '1px solid rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? '0 0 0 2px #FFFFFF, 0 0 0 3.5px #F61F1F' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && (
                  <Check
                    size={14}
                    color={isLight || hex === '#EAD8AB' || hex === '#CBBCA9' ? '#000000' : '#FFFFFF'}
                    strokeWidth={3}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#000000' : '#4B5563',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {color}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Color Toggle & Input Box */}
      <div
        style={{
          borderTop: '1px dashed var(--border-medium)',
          paddingTop: 12,
        }}
      >
        {!isCustomMode ? (
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(true);
              if (!customNameInput) setCustomNameInput('Özel Renk');
            }}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', gap: 6, fontWeight: 600, fontSize: 12 }}
          >
            <Plus size={14} />
            <span>Listede Olmayan Özel Renk Tanımla</span>
          </button>
        ) : (
          <div
            className="card animate-fade-in"
            style={{
              padding: '14px 16px',
              backgroundColor: '#FAFAFA',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                <Palette size={14} color="#F61F1F" />
                <span>Özel Renk Tanımlama</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  handleSelectPreset('Siyah');
                }}
                style={{ fontSize: 11, color: '#6B7280', textDecoration: 'underline' }}
              >
                Standart Palete Dön
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
              <div>
                <label className="label" style={{ fontSize: 11 }}>Renk Adı (Örn: Gece Mavisi)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Renk adını yazın..."
                  value={customNameInput}
                  onChange={(e) => {
                    setCustomNameInput(e.target.value);
                    if (e.target.value.trim()) {
                      onChange(e.target.value.trim(), customHexInput);
                    }
                  }}
                  style={{ fontSize: 13, padding: '7px 10px' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11 }}>Renk Tonu</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="color"
                    value={customHexInput}
                    onChange={(e) => {
                      setCustomHexInput(e.target.value);
                      if (customNameInput.trim()) {
                        onChange(customNameInput.trim(), e.target.value);
                      }
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      border: '1px solid #D1D5DB',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: 'none',
                    }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    value={customHexInput}
                    onChange={(e) => {
                      setCustomHexInput(e.target.value);
                      if (customNameInput.trim()) {
                        onChange(customNameInput.trim(), e.target.value);
                      }
                    }}
                    style={{ fontSize: 11, padding: '7px 6px', textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
