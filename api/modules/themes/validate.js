/**
 * Helper to validate theme data
 */
export async function validate(theme) {
  if (!theme || !theme.colors) {
    return ["theme_data_missing"];
  }
  
  // Add more validation as needed
  
  return [];
}
