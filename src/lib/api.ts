const getBaseUrl = () => {
    // In server components logic might be different, but for this client-side centric app we read from store or default
    const stored = typeof window !== 'undefined' ? localStorage.getItem('iceshield-storage') : null;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            let url = parsed.state.baseUrl || '/api';
             // Normalize: remove trailing slash
             return url.replace(/\/$/, "");
        } catch (e) { }
    }
    return '/api';
}

const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const stored = typeof window !== 'undefined' ? localStorage.getItem('iceshield-storage') : null;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            const { user, pass } = parsed.state.auth;
            if (user && pass) {
                headers['Authorization'] = 'Basic ' + btoa(`${user}:${pass}`);
            }
        } catch (e) { }
    }
    return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getBaseUrl();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
    };
    if (options.headers) {
        const extra = new Headers(options.headers);
        extra.forEach((value, key) => {
            headers[key] = value;
        });
    }

    const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    
    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    // Some endpoints may return empty body
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    put: <T>(path: string, body: any) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
};
