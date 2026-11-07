export async function withRoutingFallback(liveOperation, onLiveFailure, fallbackOperation) {
  try {
    return await liveOperation();
  } catch (error) {
    onLiveFailure(error);
    return fallbackOperation();
  }
}
