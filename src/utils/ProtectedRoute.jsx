import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
    // 1. Retrieve the user data from localStorage
    const userString = localStorage.getItem('user');
    
    // 2. Parse the user data (it was stored as a JSON string)
    let user = null;
    if (userString) {
        try {
            user = JSON.parse(userString);
        } catch (e) {
            // If parsing fails (e.g., corrupted storage), clear it and treat as unauthenticated
            console.error("Failed to parse user data:", e);
            localStorage.removeItem('user');
        }
    }

    // 3. Authentication Check
    // If the 'user' object exists, isAuthenticated is true.
    const isAuthenticated = !!user; 
    
    // 4. Role Check (Only necessary for Admin vs. Team separation)
    // If allowedRoles is provided, check if the user's role matches.
    const isAuthorized = allowedRoles ? allowedRoles.includes(user?.role) : true;
    
    
    // --- Routing Decision ---

    // Case 1: User is Authenticated and Authorized
    if (isAuthenticated && isAuthorized) {
        // Renders the child route element (e.g., <TeamDashboard />)
        return <Outlet />;
    }
    
    // Case 2: User is Authenticated but NOT Authorized (e.g., Team tried to access Admin dashboard)
    // If you need specific unauthorized messaging, you could change this.
    // For now, let's just send them to the appropriate dashboard or home.
    if (isAuthenticated && !isAuthorized) {
         // Assuming you want to redirect unauthorized users to their own dashboard
         if (user.role === 'team') {
             return <Navigate to="/team-dashboard" replace />;
         }
         if (user.role === 'admin') {
             return <Navigate to="/admin-dashboard" replace />;
         }
         // Fallback to home if role is unknown
         return <Navigate to="/" replace />; 
    }

    // Case 3: User is NOT Authenticated
    // Redirects to the login page. 'replace' prevents the user from going back to the protected page via the back button.
    return <Navigate to="/login" replace />;
};

export default ProtectedRoute;