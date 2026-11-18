export async function fetchWithTimeout(url, options, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The server took too long to respond. Check the backend and Gmail OAuth setup, then try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
