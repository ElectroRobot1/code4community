// File upload validation
export const validateFileUpload = (file, maxSize = 5 * 1024 * 1024) => {
  if (!file) return "No file selected";

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return "Only JPEG, PNG, GIF, and WebP images are allowed";
  }

  if (file.size > maxSize) {
    return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
  }

  return "";
};