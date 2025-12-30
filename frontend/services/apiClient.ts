// services/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        
        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    // Handle FastAPI validation errors (array format)
                    if (Array.isArray(errorData.detail)) {
                        const errors = errorData.detail.map((err: any) => {
                            const field = err.loc ? err.loc.join('.') : 'field';
                            return `${field}: ${err.msg}`;
                        }).join('; ');
                        errorMessage = errors || errorMessage;
                    } else if (errorData.detail) {
                        errorMessage = typeof errorData.detail === 'string' 
                            ? errorData.detail 
                            : JSON.stringify(errorData.detail);
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch {
                    // If response is not JSON, use status text
                }
                throw new Error(errorMessage);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                return data;
            }
            
            return {} as T;
        } catch (error: any) {
            console.error(`API request failed: ${endpoint}`, error);
            // Re-throw with more context
            if (error.message) {
                throw error;
            }
            throw new Error(`Failed to fetch ${endpoint}: ${error.message || 'Unknown error'}`);
        }
    }

    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();

