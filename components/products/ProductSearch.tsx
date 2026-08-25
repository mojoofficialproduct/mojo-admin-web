'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface ProductSearchProps {
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: string) => void;
}

export function ProductSearch({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: ProductSearchProps) {
  const tabs = [
    { label: 'Tümü', value: 'ALL' },
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Taslak', value: 'DRAFT' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
      }}
    >
      {/* Search Input */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
        <Search
          size={16}
          color="#9CA3AF"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Ürün adı, SKU veya varyant ara..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field"
          style={{
            paddingLeft: 38,
            paddingRight: searchTerm ? 36 : 14,
            fontSize: 13,
            backgroundColor: '#FFFFFF',
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: 4,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xs)',
          gap: 2,
        }}
      >
        {tabs.map((tab) => {
          const isActive = (statusFilter || 'ALL') === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#000000' : '#6B7280',
                backgroundColor: isActive ? '#F3F4F6' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
