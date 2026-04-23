const API_BASE = 'https://api.themoon.news/v1';

const api = {
    fetchNews: async (category = 'all', page = 1) => {
        return new Promise((resolve) => setTimeout(() => resolve({ status: 'success', data: [], total: 100, page }), 500));
    },
    auth: {
        login: async (mobile, password) => new Promise((resolve, reject) => { setTimeout(() => { if (mobile && password) resolve({ token: 'mock-token', user: { name: 'User', mobile } }); else reject(new Error('Invalid credentials')); }, 500); }),
        signup: async (name, mobile, email, password) => new Promise((resolve) => setTimeout(() => resolve({ success: true, message: 'Account created' }), 500))
    },
    weather: { getCurrent: async (lat, lon) => new Promise((resolve) => setTimeout(() => resolve({ temp: 28, condition: 'Sunny', city: 'New Delhi' }), 300)) }
};
