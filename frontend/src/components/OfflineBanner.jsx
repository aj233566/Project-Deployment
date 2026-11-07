import { useEffect, useState } from "react";
function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);
    if (isOnline) {
        return null;
    }
    return (
        <div className="offline-banner">
            You are offline. New incident reports will be saved locally
            and synced when connection returns.
        </div>
    );
}
export default OfflineBanner;