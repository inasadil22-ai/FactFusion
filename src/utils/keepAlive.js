const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';

let intervalId = null;

export const startKeepAlive = () => {
    if (intervalId) return;
    // Ping immediately on app load to wake HF Space
    fetch(`${API_BASE}/api/health`, { method: 'GET' }).catch(() => { });
    // Then every 10 minutes to prevent sleep
    intervalId = setInterval(() => {
        fetch(`${API_BASE}/api/health`, { method: 'GET' }).catch(() => { });
    }, 10 * 60 * 1000);
};

export const stopKeepAlive = () => {
    clearInterval(intervalId);
    intervalId = null;
};