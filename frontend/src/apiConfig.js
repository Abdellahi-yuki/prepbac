export const getBaseUrl = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Development: php -S localhost:8000 serves everything via index.php directly
    // so routes are /auth/login, /auth/register etc. (no /api/index.php prefix)
    if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        return `${protocol}//${hostname}:8000`;
    }

    // Production (Apache/Nginx with /api/index.php rewrite)
    return `${protocol}//${hostname}/api`;
};

export const API_BASE_URL = getBaseUrl();
