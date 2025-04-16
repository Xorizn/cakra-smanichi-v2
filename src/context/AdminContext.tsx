// src/context/AdminContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AdminContextType {
  isAdminLoggedIn: boolean;
  loginAdmin: () => void; // Simple login function
  logoutAdmin: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Store admin state simply in memory for now (lost on refresh)
// Consider sessionStorage for persistence within a browser session if needed.
let adminLoggedInState = false;

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Use a state variable to trigger re-renders when the state changes
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(adminLoggedInState);

    const loginAdmin = useCallback(() => {
        console.log("Admin Logged In (Context)");
        adminLoggedInState = true;
        setIsAdminLoggedIn(true);
    }, []);

    const logoutAdmin = useCallback(() => {
        console.log("Admin Logged Out (Context)");
        adminLoggedInState = false;
        setIsAdminLoggedIn(false);
        // Optionally clear sessionStorage if used:
        // sessionStorage.removeItem('isAdminLoggedIn');
    }, []);

    // Uncomment below to use sessionStorage for persistence across refreshes (within the session)
    // useEffect(() => {
    //     const storedState = sessionStorage.getItem('isAdminLoggedIn');
    //     if (storedState === 'true') {
    //         adminLoggedInState = true;
    //         setIsAdminLoggedIn(true);
    //     }
    // }, []);

    return (
        <AdminContext.Provider value={{ isAdminLoggedIn, loginAdmin, logoutAdmin }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdminAuth = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminProvider');
    }
    return context;
};
