export const CATEGORIZATION_STRINGS = {
  sourceAi: 'AI',
  sourceRule: 'Quy tắc',
  aiFailed: 'AI không phân loại được',
  tapToPick: 'chạm để chọn',
  retry: 'thử lại',
  uncategorized: 'Chưa phân loại',
  pending: 'AI đang phân loại...',
  retryA11yLabel: 'Thử phân loại lại',
} as const;

/** Full failed label for non-interactive surfaces (e.g. the CSV raw-data sheet). */
export const AI_FAILED_PICK_LABEL = `${CATEGORIZATION_STRINGS.aiFailed} - ${CATEGORIZATION_STRINGS.tapToPick}`;
