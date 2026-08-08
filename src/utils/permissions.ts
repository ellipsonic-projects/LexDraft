import { User, UserRole, WorkflowTask } from '../types';

export type PermissionAction =
  | 'assign_task'
  | 'approve_seal'
  | 'reject_document'
  | 'approve_decline_customization'
  | 'create_edit_delete_template'
  | 'view_firm_activity_logs'
  | 'manage_settings'
  | 'generate_document'
  | 'edit_assigned_draft'
  | 'save_snapshot'
  | 'restore_snapshot'
  | 'submit_draft'
  | 'request_customization'
  | 'view_analytics'
  | 'renew_document';

export const checkPermission = (user: User, action: PermissionAction): boolean => {
  const isBoss = user.role === 'boss';
  const isEmployee = user.role === 'employee';

  switch (action) {
    case 'assign_task':
    case 'approve_seal':
    case 'reject_document':
    case 'approve_decline_customization':
    case 'create_edit_delete_template':
    case 'view_firm_activity_logs':
    case 'manage_settings':
    case 'view_analytics':
    case 'renew_document':
      return isBoss;

    case 'generate_document':
    case 'edit_assigned_draft':
    case 'save_snapshot':
    case 'restore_snapshot':
      return true; // Both roles can perform these actions

    case 'submit_draft':
    case 'request_customization':
      return isEmployee; // Standard lawyers submit for review and request customization

    default:
      return false;
  }
};

export const canUpdateTask = (user: User, task: WorkflowTask): boolean => {
  if (user.role === 'boss') return true;
  if (user.role === 'employee' && task.assigneeId === user.id) {
    // Lawyers can only move cards that are assigned to them, and not to sealed stages manually
    return true;
  }
  return false;
};
