export const TEST_CONFIG = {
    JWT: {
        SECRET: 'richardrichardrichard5',
        EXPIRES_IN: '3600'
    },
    DATABASE: {
        HOST: 'localhost',
        PORT: '5432',
        USERNAME: 'maxverstappen',
        PASSWORD: 'tututudud',
        NAME: 'lr1'
    },
    AUTH: {
        SERVICE_URL: 'http://localhost:3000'
    },
    API: {
        PORT: '3002'
    }
};

export const setupTestEnv = () => {
    const originalEnv = { ...process.env };

    process.env.JWT_SECRET = TEST_CONFIG.JWT.SECRET;
    process.env.JWT_EXPIRES_IN = TEST_CONFIG.JWT.EXPIRES_IN;
    process.env.DB_HOST = TEST_CONFIG.DATABASE.HOST;
    process.env.DB_PORT = TEST_CONFIG.DATABASE.PORT;
    process.env.DB_USERNAME = TEST_CONFIG.DATABASE.USERNAME;
    process.env.DB_PASSWORD = TEST_CONFIG.DATABASE.PASSWORD;
    process.env.DB_NAME = TEST_CONFIG.DATABASE.NAME;
    process.env.AUTH_SERVICE_URL = TEST_CONFIG.AUTH.SERVICE_URL;
    process.env.PORT = TEST_CONFIG.API.PORT;

    return {
        restore: () => {
            process.env = originalEnv;
        }
    };
};

export const createMockUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    username: 'maxverstappen',
    email: 'vroom@vroom.com',
    password: 'tututudu',
    role: 'user',
    created_at: new Date('2025-09-25'),
    ...overrides
});

export const createMockAuthUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: 'vroom@vroom.com',
    role: 'user',
    ...overrides
});