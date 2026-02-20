import React from 'react';
import { usePermissionsStore, PermissionAction } from '../../stores/usePermissionsStore';
import { AccessDenied } from './AccessDenied';

interface PermissionGateProps {
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ action, children, fallback }) => {
  const can = usePermissionsStore((state) => state.can);

  if (!can(action)) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
};
