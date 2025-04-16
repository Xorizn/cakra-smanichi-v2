// src/components/AdminWrapper.tsx
"use client";

import { useState, useEffect, ReactNode } from 'react';
import { AdminLogin } from './AdminLogin';

interface AdminWrapperProps {
    children: ReactNode;
}

export function AdminWrapper({ children }: AdminWrapperProps) {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Start loading

    useEffect(() => {
        // Check sessionStorage only on the client side after mount
        try {
            const adminLoggedIn = sessionStorage.getItem('isAdminLoggedInSession') === 'true';
            setIsAdminAuthenticated(adminLoggedIn);
        } catch (error) {
            console.error("Session storage is unavailable or errored:", error);
            // Handle case where sessionStorage is disabled/unavailable (treat as not logged in)
            setIsAdminAuthenticated(false);
        }
        setIsLoading(false); // Finished checking
    }, []); // Empty dependency array runs only once on mount

    const handleLoginSuccess = () => {
        setIsAdminAuthenticated(true);
    };

    // While checking session storage
    if (isLoading) {
        return (
             <div className="flex items-center justify-center h-screen">
                 <p>Loading Admin Section...</p>
             </div>
         );
    }

    // If authenticated in session, show the protected content
    if (isAdminAuthenticated) {
        return <>{children}</>;
    }

    // Otherwise, show the admin login form
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
}
