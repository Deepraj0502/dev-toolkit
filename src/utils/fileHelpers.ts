export interface FileAttachmentData {
  fileName: string;
  fileType: string;
  fileBase64: string; // Clean base64 string or full Data URI
}

export const convertFileToBase64 = (file: File): Promise<FileAttachmentData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        fileName: file.name,
        fileType: file.type || file.name.split('.').pop() || "unknown",
        fileBase64: result,
      });
    };
    reader.onerror = (error) => reject(error);
  });
};