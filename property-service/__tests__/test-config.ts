import { PropertyType } from "../src/models/property-type.enum";
import { RentalType } from "../src/models/rental-type.enum";

export const TEST_CONFIG = {
    DATABASE: {
        HOST: 'localhost',
        PORT: '5432',
        USERNAME: 'maxverstappen',
        PASSWORD: 'tututudu',
        NAME: 'lr1'
    },
    AUTH: {
        SERVICE_URL: 'http://localhost:3000'
    },
    USER: {
        SERVICE_URL: 'http://localhost:3001'
    },
    API: {
        PORT: '3002'
    }
};

export const setupTestEnv = () => {
    const originalEnv = { ...process.env };

    process.env.DB_HOST = TEST_CONFIG.DATABASE.HOST;
    process.env.DB_PORT = TEST_CONFIG.DATABASE.PORT;
    process.env.DB_USERNAME = TEST_CONFIG.DATABASE.USERNAME;
    process.env.DB_PASSWORD = TEST_CONFIG.DATABASE.PASSWORD;
    process.env.DB_NAME = TEST_CONFIG.DATABASE.NAME;
    process.env.AUTH_SERVICE_URL = TEST_CONFIG.AUTH.SERVICE_URL;
    process.env.USER_SERVICE_URL = TEST_CONFIG.USER.SERVICE_URL;
    process.env.PORT = TEST_CONFIG.API.PORT;

    return {
        restore: () => {
            process.env = originalEnv;
        }
    };
};

export const createMockProperty = (overrides: Partial<any> = {}) => ({
    id: 1,
    ownerId: 1,
    title: 'Property',
    description: 'Description',
    rentalType: RentalType.MONTHLY,
    price: 10000,
    location: 'Location',
    propertyType: PropertyType.APARTMENT,
    createdAt: new Date('2025-09-27'),
    ...overrides
});

export const createMockFavorite = (overrides: Partial<any> = {}) => ({
    id: 1,
    userId: 1,
    propertyId: 1,
    createdAt: new Date('2025-09-27'),
    ...overrides
});

export const createMockAuthUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: 'vroom@vroom.com',
    role: 'user',
    ...overrides
});