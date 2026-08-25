'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
