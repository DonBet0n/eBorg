// Діагностичні логи лише в режимі розробки, щоб не засмічувати релізну збірку
export const devLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};
