// Admin utility functions for testing and development
import { createClient } from "@/libs/supabase/client";

export interface AdminConfig {
  emails: string[];
  userIds: string[];
}

// Get admin configuration from environment variables
export const getAdminConfig = (): AdminConfig => {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
  const adminUserIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  
  return {
    emails: adminEmails,
    userIds: adminUserIds
  };
};

// Check if current user is an admin (client-side)
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const config = getAdminConfig();
    
    // Check by email
    if (user.email && config.emails.includes(user.email)) {
      return true;
    }
    
    // Check by user ID
    if (config.userIds.includes(user.id)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Check if a specific user is admin (server-side)
export const isUserAdmin = (user: { email?: string; id?: string }): boolean => {
  if (!user) return false;
  
  const config = getAdminConfig();
  
  // Check by email
  if (user.email && config.emails.includes(user.email)) {
    return true;
  }
  
  // Check by user ID
  if (user.id && config.userIds.includes(user.id)) {
    return true;
  }
  
  return false;
}; 