import request from 'supertest';
import { DataSource } from 'typeorm';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Property } from '../../src/models/property.entity';
import { Favorite } from '../../src/models/favorite.entity';
import { PropertyType } from '../../src/models/property-type.enum';
import { RentalType } from '../../src/models/rental-type.enum';

// тестовые переменные окружения
process.env.JWT_SECRET = 'richardrichardrichard';
process.env.AUTH_SERVICE_URL = 'http://localhost:3000';
process.env.USER_SERVICE_URL = 'http://localhost:3001';

// глобальные переменные
let container: StartedTestContainer;
let testDataSource: DataSource;
let app: any;

// мокаем auth.client
jest.mock('../../src/services/auth.client', () => {
    const mockVerifyToken = jest.fn();

    return {
        __esModule: true,
        default: {
            verifyToken: mockVerifyToken
        },
        AuthClient: jest.fn(() => ({
            verifyToken: mockVerifyToken
        })),
        mockVerifyToken
    };
});

// мокаем user.client
jest.mock('../../src/services/user.client', () => {
    const mockGetUserById = jest.fn();

    return {
        __esModule: true,
        default: {
            getUserById: mockGetUserById
        },
        UserClient: jest.fn(() => ({
            getUserById: mockGetUserById
        })),
        mockGetUserById
    };
});

// мокаем основную БД
jest.mock('../../src/config/database', () => {
    const mockDataSource = {
        initialize: jest.fn(),
        destroy: jest.fn(),
        getRepository: jest.fn(),
        isInitialized: true,
    };

    return {
        __esModule: true,
        AppDataSource: mockDataSource
    };
});

describe('Property service integration tests', () => {
    beforeAll(async () => {
        console.log('Starting PostgreSQL container...');

        // запуск PostgreSQL контейнера
        container = await new GenericContainer('postgres:15-alpine')
            .withExposedPorts(5432)
            .withEnvironment({
                POSTGRES_DB: 'property.int.test',
                POSTGRES_USER: 'test',
                POSTGRES_PASSWORD: 'test',
            })
            .start();

        const host = container.getHost();
        const port = container.getMappedPort(5432);

        console.log(`Test PostgreSQL running on ${host}:${port}`);

        // тестовая DataSource
        testDataSource = new DataSource({
            type: 'postgres',
            host,
            port,
            username: 'test',
            password: 'test',
            database: 'property.int.test',
            synchronize: true,
            logging: false,
            entities: [Property, Favorite],
        });

        await testDataSource.initialize();

        // мок AppDataSource для использования тестовой БД
        const { AppDataSource } = require('../../src/config/database');
        AppDataSource.getRepository.mockImplementation((entity: any) => {
            return testDataSource.getRepository(entity);
        });
        AppDataSource.initialize.mockResolvedValue(undefined);
        AppDataSource.destroy.mockResolvedValue(undefined);

        const importedApp = await import('../../src/app');
        app = importedApp.default;

        console.log('Test database and app initialized');
    }, 60000);

    afterAll(async () => {
        console.log('Cleaning up test resources...');

        if (testDataSource && testDataSource.isInitialized) {
            await testDataSource.destroy();
        }
        if (container) {
            await container.stop();
        }
    }, 30000);

    beforeEach(async () => {
        if (testDataSource && testDataSource.isInitialized) {
            await testDataSource.getRepository(Favorite).clear();
            await testDataSource.getRepository(Property).clear();
        }

        const authClient = require('../../src/services/auth.client');
        authClient.default.verifyToken.mockImplementation(async (req: any) => {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Token not provided');
            }
            const token = authHeader.substring(7);

            if (token === 'admintokentokentoken') {
                return { id: 1, username: 'admin', role: 'admin' };
            } else if (token === 'ownertokentokentoken') {
                return { id: 2, username: 'propertyowner', role: 'user' };
            } else if (token === 'usertokentokentoken') {
                return { id: 3, username: 'useruser', role: 'user' };
            } else {
                throw new Error('Invalid or expired token');
            }
        });

        const userClient = require('../../src/services/user.client');
        userClient.default.getUserById.mockImplementation(async (id: number, authHeader: string) => {
            if (!authHeader) {
                throw new Error('Authorization header is required');
            }

            if (id === 1) {
                return { id: 1, username: 'admin', email: 'admin@test.com', role: 'admin' };
            } else if (id === 2) {
                return { id: 2, username: 'propertyowner', email: 'owner@test.com', role: 'user' };
            } else if (id === 3) {
                return { id: 3, username: 'useruser', email: 'user@test.com', role: 'user' };
            } else {
                throw new Error('User not found');
            }
        });
    });


    describe('Property management flow', () => {
        let testPropertyId: number;

        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);

            const testProperty = propertyRepository.create({
                ownerId: 2,
                title: 'Test apartment',
                description: 'A nice apartment in SPb',
                rentalType: RentalType.MONTHLY,
                price: 1500.00,
                location: 'SPb',
                propertyType: PropertyType.APARTMENT,
            });

            const savedProperty = await propertyRepository.save(testProperty);
            testPropertyId = savedProperty.id;
        });

        it('should allow property owner to manage their properties', async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);

            // просмотр недвижимости
            const getResponse = await request(app)
                .get('/properties')
                .expect(200);

            expect(Array.isArray(getResponse.body)).toBe(true);
            expect(getResponse.body.length).toBe(1);

            // поиск недвижимости
            const getByIdResponse = await request(app)
                .get(`/properties/${testPropertyId}`)
                .expect(200);

            expect(getByIdResponse.body.id).toBe(testPropertyId);
            expect(getByIdResponse.body.title).toBe('Test apartment');

            // обновление недвижимости
            const updateData = {
                title: 'Updated apartment',
                price: 1600.00
            };

            const updateResponse = await request(app)
                .put(`/properties/${testPropertyId}`)
                .set('Authorization', 'Bearer ownertokentokentoken')
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.title).toBe('Updated apartment');
            expect(updateResponse.body.price).toBe(1600.00);

            // удаление недвижимости
            await request(app)
                .delete(`/properties/${testPropertyId}`)
                .set('Authorization', 'Bearer ownertokentokentoken')
                .expect(200);

            const dbProperty = await propertyRepository.findOne({ where: { id: testPropertyId } });
            expect(dbProperty).toBeNull();
        });

        it('should allow admin to manage any property', async () => {
            // админ обновляет недвижимость
            const updateData = {
                title: 'Admin updated property',
                price: 1700.00
            };

            const updateResponse = await request(app)
                .put(`/properties/${testPropertyId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.title).toBe('Admin updated property');
            expect(updateResponse.body.price).toBe(1700.00);

            // адми удаляет недвижимость
            await request(app)
                .delete(`/properties/${testPropertyId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);
        });

        it('should allow creating new properties', async () => {
            // создание недвижимости
            const createData = {
                title: 'New lux villa',
                description: 'Beautiful villa with pool',
                rentalType: RentalType.MONTHLY,
                price: 3000.00,
                location: 'Tbilisi',
                propertyType: PropertyType.VILLA,
            };

            const createResponse = await request(app)
                .post('/properties')
                .set('Authorization', 'Bearer ownertokentokentoken')
                .send(createData)
                .expect(201);

            expect(createResponse.body.title).toBe('New lux villa');
            expect(createResponse.body.ownerId).toBe(2);
            expect(Number(createResponse.body.price)).toBe(3000.00);
        });
    });


    describe('Search and filtering', () => {
        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);

            const properties = [
                {
                    ownerId: 2,
                    title: 'SPb Apartment',
                    description: 'Apartment in Murino',
                    rentalType: RentalType.MONTHLY,
                    price: 1200.00,
                    location: 'Murino',
                    propertyType: PropertyType.APARTMENT,
                },
                {
                    ownerId: 2,
                    title: 'Beach house',
                    description: 'House near the beach',
                    rentalType: RentalType.DAILY,
                    price: 200.00,
                    location: 'Batumi',
                    propertyType: PropertyType.HOUSE,
                },
                {
                    ownerId: 3,
                    title: 'Mountain cottage',
                    description: 'Cozy cottage in mountains',
                    rentalType: RentalType.MONTHLY,
                    price: 800.00,
                    location: 'Tbilisi',
                    propertyType: PropertyType.COTTAGE,
                },
                {
                    ownerId: 2,
                    title: 'Expensive villa',
                    description: 'Lux villa',
                    rentalType: RentalType.MONTHLY,
                    price: 5000.00,
                    location: 'Lux',
                    propertyType: PropertyType.VILLA,
                }
            ];

            for (const propertyData of properties) {
                const property = propertyRepository.create(propertyData);
                await propertyRepository.save(property);
            }
        });

        it('should search properties by location', async () => {
            // поиск недвижмисти по расположению
            const response = await request(app)
                .get('/properties/search')
                .query({ location: 'Murino' })
                .expect(200);

            console.log('Search by location results:', response.body);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].location.toLowerCase()).toContain('murino');
        });

        it('should filter properties by price range', async () => {
            // поиск недвижимости по диапазону цен
            const response = await request(app)
                .get('/properties/search')
                .query({
                    minPrice: '1000',
                    maxPrice: '1500'
                })
                .expect(200);

            console.log('Price filter results:', response.body);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(Number(response.body[0].price)).toBe(1200.00);
        });

        it('should filter properties by type', async () => {
            // поиск недвижмисоти по типу
            const response = await request(app)
                .get('/properties/search')
                .query({ propertyType: 'house' })
                .expect(200);

            console.log('Type filter results:', response.body);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].propertyType).toBe('house');
        });
    });


    describe('Access control and validation', () => {
        let testPropertyId: number;

        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);

            const testProperty = propertyRepository.create({
                ownerId: 2,
                title: 'Test property',
                description: 'Test description',
                rentalType: RentalType.MONTHLY,
                price: 1000.00,
                location: 'Test location',
                propertyType: PropertyType.APARTMENT,
            });

            const savedProperty = await propertyRepository.save(testProperty);
            testPropertyId = savedProperty.id;
        });

        it('should check property ownership rules', async () => {
            // недоступность управления не своей недвижимостью
            const updateData = {
                title: 'Not my property'
            };

            await request(app)
                .put(`/properties/${testPropertyId}`)
                .set('Authorization', 'Bearer usertokentokentoken')
                .send(updateData)
                .expect(403);

            await request(app)
                .delete(`/properties/${testPropertyId}`)
                .set('Authorization', 'Bearer usertokentokentoken')
                .expect(403);
        });

        it('should validate property data integrity', async () => {
            // разные кейсы валидации вводимых данных
            const invalidDataCases = [
                {
                    data: { title: '', description: 'Test' },
                    expectedError: 'Title cannot be empty'
                },
                {
                    data: { title: 'Test', price: -100 },
                    expectedError: 'Price must be positive'
                },
                {
                    data: { title: 'Test', rentalType: 'invalidtype' },
                    expectedError: 'Invalid rental type'
                }
            ];

            for (const { data, expectedError } of invalidDataCases) {
                const response = await request(app)
                    .put(`/properties/${testPropertyId}`)
                    .set('Authorization', 'Bearer ownertokentokentoken')
                    .send(data)
                    .expect(400);

                console.log('Validation error response:', response.body);
                const hasError = response.body.errors?.includes(expectedError) ||
                    response.body.message?.includes(expectedError);
                expect(hasError).toBe(true);
            }
        });
    });


    describe('Favorites management', () => {
        let testPropertyId: number;
        let testFavoriteId: number;

        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);
            const favoriteRepository = AppDataSource.getRepository(Favorite);

            const testProperty = propertyRepository.create({
                ownerId: 2,
                title: 'Favorite test property',
                description: 'Property for favorites testing',
                rentalType: RentalType.MONTHLY,
                price: 1000.00,
                location: 'Test location',
                propertyType: PropertyType.APARTMENT,
            });

            const savedProperty = await propertyRepository.save(testProperty);
            testPropertyId = savedProperty.id;

            const testFavorite = favoriteRepository.create({
                userId: 3,
                propertyId: testPropertyId,
            });

            const savedFavorite = await favoriteRepository.save(testFavorite);
            testFavoriteId = savedFavorite.id;
        });

        it('should allow users to manage their favorites', async () => {
            // пользователь управляет своей недвижимостью и избранным
            const getResponse = await request(app)
                .get('/favorites')
                .set('Authorization', 'Bearer usertokentokentoken')
                .expect(200);

            expect(Array.isArray(getResponse.body)).toBe(true);
            expect(getResponse.body.length).toBe(1);

            const getByIdResponse = await request(app)
                .get(`/favorites/${testFavoriteId}`)
                .set('Authorization', 'Bearer usertokentokentoken')
                .expect(200);

            expect(getByIdResponse.body.id).toBe(testFavoriteId);
            expect(getByIdResponse.body.propertyId).toBe(testPropertyId);

            const newPropertyData = {
                title: 'New property for favorite',
                description: 'Another property',
                rentalType: RentalType.MONTHLY,
                price: 1500.00,
                location: 'Another location',
                propertyType: PropertyType.HOUSE,
            };

            const newPropertyResponse = await request(app)
                .post('/properties')
                .set('Authorization', 'Bearer ownertokentokentoken')
                .send(newPropertyData)
                .expect(201);

            const newPropertyId = newPropertyResponse.body.id;

            const addFavoriteResponse = await request(app)
                .post('/favorites')
                .set('Authorization', 'Bearer usertokentokentoken')
                .send({ propertyId: newPropertyId })
                .expect(201);

            expect(addFavoriteResponse.body.propertyId).toBe(newPropertyId);

            await request(app)
                .delete(`/favorites/${testFavoriteId}`)
                .set('Authorization', 'Bearer usertokentokentoken')
                .expect(200);

            const { AppDataSource } = require('../../src/config/database');
            const favoriteRepository = AppDataSource.getRepository(Favorite);
            const dbFavorite = await favoriteRepository.findOne({ where: { id: testFavoriteId } });
            expect(dbFavorite).toBeNull();
        });

        it('should prevent duplicate favorites', async () => {
            await request(app)
                .post('/favorites')
                .set('Authorization', 'Bearer usertokentokentoken')
                .send({ propertyId: testPropertyId })
                .expect(400);
        });
    });


    describe('Error handling', () => {
        it('should handle authentication errors properly', async () => {
            // нет токена
            await request(app)
                .post('/properties')
                .expect(401);

            //
            await request(app)
                .post('/properties')
                .set('Authorization', 'Bearer invalidtokentokentoken')
                .expect(401);
        });

        it('should handle resource not found errors', async () => {
            // несуществующая недвижимость
            await request(app)
                .get('/properties/999')
                .expect(404);

            // несуществующее избранное
            await request(app)
                .get('/favorites/999')
                .set('Authorization', 'Bearer usertokentokentoken')
                .expect(404);
        });

        it('should handle validation errors', async () => {
            const invalidData = {
            };

            await request(app)
                .post('/properties')
                .set('Authorization', 'Bearer ownertokentokentoken')
                .send(invalidData)
                .expect(400);
        });
    });


    describe('Real user scenarios', () => {
        it('should support property listing and management flow', async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);

            // просмотр доступной недвижимости
            const listResponse = await request(app)
                .get('/properties')
                .expect(200);

            const initialCount = listResponse.body.length;

            // создание недвижимости
            const createData = {
                title: 'Beautiful studio',
                description: 'Cozy studio apartment',
                rentalType: RentalType.MONTHLY,
                price: 80000.00,
                location: 'SPb',
                propertyType: PropertyType.STUDIO,
            };

            const createResponse = await request(app)
                .post('/properties')
                .set('Authorization', 'Bearer ownertokentokentoken')
                .send(createData)
                .expect(201);

            expect(createResponse.body.title).toBe('Beautiful studio');

            // поиск недвижимости
            const searchResponse = await request(app)
                .get('/properties/search')
                .query({
                    location: 'SPb',
                    maxPrice: '1000'
                })
                .expect(200);

            expect(searchResponse.body.length).toBeGreaterThan(0);

            // добавление в избранное
            const propertyId = createResponse.body.id;

            const favoriteResponse = await request(app)
                .post('/favorites')
                .set('Authorization', 'Bearer usertokentokentoken')
                .send({ propertyId })
                .expect(201);

            expect(favoriteResponse.body.propertyId).toBe(propertyId);

            const updatedListResponse = await request(app)
                .get('/properties')
                .expect(200);

            expect(updatedListResponse.body.length).toBe(initialCount + 1);
        });

        it('should support admin property management flow', async () => {
            const { AppDataSource } = require('../../src/config/database');
            const propertyRepository = AppDataSource.getRepository(Property);

            // админ создает недвижимость
            const createData = {
                title: 'Admin managed Property',
                description: 'Property managed by admin',
                rentalType: RentalType.YEARLY,
                price: 20000.00,
                location: 'Admin location',
                propertyType: PropertyType.VILLA,
            };

            const createResponse = await request(app)
                .post('/properties')
                .set('Authorization', 'Bearer admintokentokentoken')
                .send(createData)
                .expect(201);

            const propertyId = createResponse.body.id;

            // админ может управлять любой недвижимостью
            const updateData = {
                price: 22000.00
            };

            const updateResponse = await request(app)
                .put(`/properties/${propertyId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.price).toBe(22000.00);

            await request(app)
                .delete(`/properties/${propertyId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);
        });
    });
});