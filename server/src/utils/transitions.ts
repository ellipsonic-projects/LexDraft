import { DocumentStatus, TaskStatus } from '@prisma/client';

/**
 * Validates document status changes based on state transition rules
 */
export const validateDocumentTransition = (
  from: DocumentStatus,
  to: DocumentStatus
): boolean => {
  if (from === to) return true;

  // Sealing is final, approved documents cannot be modified
  if (from === DocumentStatus.approved) return false;

  switch (from) {
    case DocumentStatus.draft:
      return to === DocumentStatus.under_review;

    case DocumentStatus.under_review:
      return to === DocumentStatus.approved || to === DocumentStatus.rejected;

    case DocumentStatus.rejected:
      return to === DocumentStatus.under_review || to === DocumentStatus.draft;

    default:
      return false;
  }
};

/**
 * Validates workflow task status changes based on pipeline transitions
 */
export const validateTaskTransition = (
  from: TaskStatus,
  to: TaskStatus
): boolean => {
  if (from === to) return true;

  // Completed is final
  if (from === TaskStatus.completed) return false;

  switch (from) {
    case TaskStatus.assigned:
      return to === TaskStatus.in_progress;

    case TaskStatus.in_progress:
      return to === TaskStatus.draft_ready;

    case TaskStatus.draft_ready:
      return to === TaskStatus.under_review;

    case TaskStatus.under_review:
      return to === TaskStatus.approved || to === TaskStatus.in_progress;

    case TaskStatus.approved:
      return to === TaskStatus.completed;

    default:
      return false;
  }
};
