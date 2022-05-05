const getProp = (key: string): string | undefined => process.env[key];
export const mustGetProp = (key: string): string => {
  const prop = getProp(key);
  if (prop === undefined || prop === '')
    throw new Error(`prop ${key} is not defined`);
  return prop;
};
