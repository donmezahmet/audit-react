import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /**
   * The component key from dashboard_components table
   */
  component: string;
  
  /**
   * Content to render if user has permission
   */
  children: React.ReactNode;
  
  /**
   * Optional fallback to render if user doesn't have permission
   */
  fallback?: React.ReactNode;
  
  /**
   * Require interaction permission instead of just view
   */
  requireInteraction?: boolean;
}

/**
 * Permission Gate Component
 * Conditionally renders children based on user's component permissions
 * 
 * @example
 * <PermissionGate component="send_email_button">
 *   <SendEmailButton />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  component, 
  children, 
  fallback = null,
  requireInteraction = false 
}) => {
  const { hasComponent, canInteract } = usePermissions();

  // Check appropriate permission level
  const hasPermission = requireInteraction 
    ? canInteract(component) 
    : hasComponent(component);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;

