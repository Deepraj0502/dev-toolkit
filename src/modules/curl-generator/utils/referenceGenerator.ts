export function generateRequestReferenceNumber(): string {
  const prefix = "SBIST";

  // 20 random digits
  const randomDigits = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");

  return prefix + randomDigits;
}