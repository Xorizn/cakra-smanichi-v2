// src/app/admin/layout.tsx
"use client";

import React from 'react';
import { AdminProvider, useAdminAuth } from '@/context/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';
import { Button } from '@/components/ui/button'; // For Logout button
import { LogOut } from 'lucide-react';

// Inner component to consume the context
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { isAdminLoggedIn, logoutAdmin } = useAdminAuth();

    if (!isAdminLoggedIn) {
        return <AdminLogin />;
    }

    // If admin is logged in, render the page content and maybe an admin navbar/sidebar
    return (
        <div className="min-h-screen flex flex-col">
            {/* Optional: Simple Admin Header */}
            <header className="bg-secondary text-secondary-foreground p-4 shadow sticky top-0 z-40">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-semibold">Admin Panel</h1>
                    <Button variant="ghost" size="sm" onClick={logoutAdmin}>
                         <LogOut className="mr-2 h-4 w-4"/> Logout Admin
                    </Button>
                </div>
            </header>
            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
}

// Main Layout component that includes the Provider
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminProvider>
    );
}
