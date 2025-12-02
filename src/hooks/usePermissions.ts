import { useAuthStore } from '@/store/auth.store';

/**
 * Hook for checking component-based permissions
 * Uses the new dashboard_components permission system
 */
export function usePermissions() {
  const { permissions, role } = useAuthStore();

  /**
   * Check if user has permission to view a component
   * @param componentKey - The unique key from dashboard_components table
   * @returns boolean
   */
  const hasComponent = (componentKey: string): boolean => {
    // Admin has access to everything
    if (role === 'admin') return true;
    if (!permissions?.components) return false;
    // Check for wildcard or specific component
    return permissions.components.includes('*') || permissions.components.includes(componentKey);
  };

  /**
   * Check if user can interact with a component (click buttons, export, etc.)
   * @param componentKey - The unique key from dashboard_components table
   * @returns boolean
   */
  const canInteract = (componentKey: string): boolean => {
    // Admin can interact with everything
    if (role === 'admin') return true;
    if (!permissions?.interactiveComponents) return false;
    // Check for wildcard or specific component
    return permissions.interactiveComponents.includes('*') || permissions.interactiveComponents.includes(componentKey);
  };

  /**
   * Check if user has any of the specified components
   * @param componentKeys - Array of component keys
   * @returns boolean
   */
  const hasAnyComponent = (componentKeys: string[]): boolean => {
    return componentKeys.some(key => hasComponent(key));
  };

  /**
   * Check if user has all of the specified components
   * @param componentKeys - Array of component keys
   * @returns boolean
   */
  const hasAllComponents = (componentKeys: string[]): boolean => {
    return componentKeys.every(key => hasComponent(key));
  };

  /**
   * Get all component keys user has access to
   * @returns string[]
   */
  const getAccessibleComponents = (): string[] => {
    return permissions?.components || [];
  };

  /**
   * Get all interactive component keys
   * @returns string[]
   */
  const getInteractiveComponents = (): string[] => {
    return permissions?.interactiveComponents || [];
  };

  return {
    hasComponent,
    canInteract,
    hasAnyComponent,
    hasAllComponents,
    getAccessibleComponents,
    getInteractiveComponents,
  };
}

