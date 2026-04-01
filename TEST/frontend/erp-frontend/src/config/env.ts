/**
 * Environment variable validation and type-safe access.
 */

const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    // In production, you might want to log this to an error tracking service
    console.warn(`Environment variable ${key} is missing!`);
    return '';
  }
  return value;
};

export const ENV = {
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL') || '/api/v1',
  IS_PROD: import.meta.env.PROD,
};
