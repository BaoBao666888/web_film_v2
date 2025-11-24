export const generateId = (prefix = "id") =>
  `${prefix}-${Math.random().toString(36).substr(2, 8)}`;
