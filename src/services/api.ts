const API_BASE_URL = 'http://localhost:5000/api';

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const performFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // crucial for reading/writing the httpOnly refresh cookie
  });

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ApiError(data?.message || response.statusText, response.status, data);
  }

  return data;
};

export const api = {
  request: async (path: string, options: RequestInit = {}): Promise<any> => {
    try {
      return await performFetch(path, options);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
        // Attempt token refresh
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshResult = await performFetch('/auth/refresh', { method: 'POST' });
            const newAccessToken = refreshResult.data.accessToken;
            setAccessToken(newAccessToken);
            isRefreshing = false;
            onRefreshed(newAccessToken);
          } catch (refreshErr) {
            isRefreshing = false;
            setAccessToken(null);
            throw refreshErr;
          }
        }

        // Wait for the token refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            const retryHeaders = new Headers(options.headers || {});
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            performFetch(path, { ...options, headers: retryHeaders })
              .then(resolve)
              .catch(reject);
          });
        });
      }

      throw err;
    }
  },

  get: (path: string, options: RequestInit = {}) =>
    api.request(path, { ...options, method: 'GET' }),

  post: (path: string, body?: any, options: RequestInit = {}) =>
    api.request(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }),

  put: (path: string, body?: any, options: RequestInit = {}) =>
    api.request(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    }),

  patch: (path: string, body?: any, options: RequestInit = {}) =>
    api.request(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    }),

  delete: (path: string, options: RequestInit = {}) =>
    api.request(path, { ...options, method: 'DELETE' })
};
