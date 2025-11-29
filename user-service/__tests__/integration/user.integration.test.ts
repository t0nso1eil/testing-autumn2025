import request from 'supertest';
import { DataSource } from 'typeorm';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { UserEntity } from '../../src/models/user.entity';
import { RoleEnum } from '../../src/models/role.enum';

// тестовые переменные окружения
process.env.JWT_SECRET = 'richardrichardrichard';
process.env.AUTH_SERVICE_URL = 'http://localhost:3000';

// глобальные переменные
let container: StartedTestContainer;
let testDataSource: DataSource;
let app: any;

// мокаем auth.client для имитации проверки токенов
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

describe('User service integration tests', () => {
    beforeAll(async () => {
        console.log('Starting PostgreSQL container...');

        // запуск PostgreSQL контейнера
        container = await new GenericContainer('postgres:15-alpine')
            .withExposedPorts(5432)
            .withEnvironment({
                POSTGRES_DB: 'user.int.test',
                POSTGRES_USER: 'test',
                POSTGRES_PASSWORD: 'test',
            })
            .start();

        const host = container.getHost();
        const port = container.getMappedPort(5432);

        console.log(`Test PostgreSQL running on ${host}:${port}`);

        // создаем тестовую DataSource с подключением к контейнеру
        testDataSource = new DataSource({
            type: 'postgres',
            host,
            port,
            username: 'test',
            password: 'test',
            database: 'user.int.test',
            synchronize: true,
            logging: false,
            entities: [UserEntity],
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

        // очистка ресурсов после всех тестов
        if (testDataSource && testDataSource.isInitialized) {
            await testDataSource.destroy();
        }
        if (container) {
            await container.stop();
        }
    }, 30000);

    beforeEach(async () => {
        // очистка базы данных перед каждым тестом
        if (testDataSource && testDataSource.isInitialized) {
            await testDataSource.getRepository(UserEntity).clear();
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
            } else if (token === 'tokentokentoken') {
                return { id: 2, username: 'testuser', role: 'user' };
            } else if (token === 'othertokentokentoken') {
                return { id: 3, username: 'otheruser', role: 'user' };
            } else {
                throw new Error('Invalid or expired token');
            }
        });
    });


    describe('User management flow', () => {
        let testUserId: number;

        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const testUser = userRepository.create({
                username: 'testuser',
                email: 'test@test.com',
                password: 'password123!',
                role: RoleEnum.USER,
            });

            const savedUser = await userRepository.save(testUser);
            testUserId = savedUser.id;
        });

        it('should allow admin to manage users', async () => {
            // админр может управлять всеми
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const getResponse = await request(app)
                .get('/users')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            expect(Array.isArray(getResponse.body)).toBe(true);
            expect(getResponse.body.length).toBe(1);

            const getByIdResponse = await request(app)
                .get(`/users/${testUserId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            expect(getByIdResponse.body.id).toBe(testUserId);
            expect(getByIdResponse.body.username).toBe('testuser');

            const updateData = {
                username: 'updateduser',
                email: 'updated@test.com'
            };

            const updateResponse = await request(app)
                .put(`/users/${testUserId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.username).toBe('updateduser');
            expect(updateResponse.body.email).toBe('updated@test.com');

            await request(app)
                .delete(`/users/${testUserId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            const dbUser = await userRepository.findOne({ where: { id: testUserId } });
            expect(dbUser).toBeNull();
        });

        it('should allow user to manage own profile', async () => {
            // пользователь может управлять своими данными
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const selfUser = userRepository.create({
                id: 2,
                username: 'currentuser',
                email: 'current@test.com',
                password: 'password123!',
                role: RoleEnum.USER,
            });
            await userRepository.save(selfUser);

            const getResponse = await request(app)
                .get('/users/2')
                .set('Authorization', 'Bearer tokentokentoken')
                .expect(200);

            expect(getResponse.body.id).toBe(2);
            expect(getResponse.body.username).toBe('currentuser');

            const updateData = {
                username: 'newusername',
                email: 'new@email.com'
            };

            const updateResponse = await request(app)
                .put('/users/2')
                .set('Authorization', 'Bearer tokentokentoken')
                .send(updateData)
                .expect(200);

            expect(updateResponse.body.username).toBe('newusername');
            expect(updateResponse.body.email).toBe('new@email.com');

            await request(app)
                .delete('/users/2')
                .set('Authorization', 'Bearer tokentokentoken')
                .expect(200);

            const dbUser = await userRepository.findOne({ where: { id: 2 } });
            expect(dbUser).toBeNull();
        });
    });


    describe('API <> Database <> Auth integration', () => {
        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const users = [
                {
                    username: 'user1',
                    email: 'user1@test.com',
                    password: 'password1',
                    role: RoleEnum.USER,
                },
                {
                    username: 'user2',
                    email: 'user2@test.com',
                    password: 'password2',
                    role: RoleEnum.USER,
                }
            ];

            for (const userData of users) {
                const user = userRepository.create(userData);
                await userRepository.save(user);
            }
        });

        it('should integrate authentication with getting user', async () => {
            // интеграция аутентификации с получением пользователей
            const response = await request(app)
                .get('/users')
                .set('Authorization', 'Bearer tokentokentoken')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);

            // пароль не возвращается в ответе (безопасность)
            response.body.forEach((user: any) => {
                expect(user.password).toBeUndefined();
                expect(user.id).toBeDefined();
                expect(user.username).toBeDefined();
                expect(user.email).toBeDefined();
            });
        });

        it('should integrate with database', async () => {
            // интеграция с бд через поиск пользователей
            const responseByUsername = await request(app)
                .get('/users/find?username=user1')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            expect(responseByUsername.body.username).toBe('user1');
            expect(responseByUsername.body.email).toBe('user1@test.com');

            const responseByEmail = await request(app)
                .get('/users/find?email=user2@test.com')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            expect(responseByEmail.body.username).toBe('user2');
            expect(responseByEmail.body.email).toBe('user2@test.com');
        });
    });


    describe('Access control and validation', () => {
        let testUserId: number;

        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const testUser = userRepository.create({
                username: 'useruser',
                email: 'useruser@test.com',
                password: 'password123!',
                role: RoleEnum.USER,
            });

            const savedUser = await userRepository.save(testUser);
            testUserId = savedUser.id;
        });

        it('should support user registration and profile management flow', async () => {
            // полный цикл регистрации и управления профилем
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const newUser = userRepository.create({
                username: 'newuser',
                email: 'newuser@test.com',
                password: 'password123!',
                role: RoleEnum.USER,
            });
            const savedUser = await userRepository.save(newUser);
            const userId = savedUser.id;

            const authClient = require('../../src/services/auth.client');
            const originalMockImplementation = authClient.default.verifyToken.getMockImplementation();

            // временно меняем мок для работы с новым пользователем
            authClient.default.verifyToken.mockImplementation(async (req: any) => {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    throw new Error('Token not provided');
                }
                const token = authHeader.substring(7);

                if (token === 'tokentokentoken') {
                    return { id: userId, username: 'newuser', role: 'user' };
                } else if (token === 'admintokentokentoken') {
                    return { id: 1, username: 'admin', role: 'admin' };
                } else if (token === 'othertokentokentoken') {
                    return { id: 3, username: 'otheruser', role: 'user' };
                } else {
                    throw new Error('Invalid or expired token');
                }
            });

            try {
                const profileResponse = await request(app)
                    .get(`/users/${userId}`)
                    .set('Authorization', 'Bearer tokentokentoken')
                    .expect(200);

                expect(profileResponse.body.username).toBe('newuser');

                const updateResponse = await request(app)
                    .put(`/users/${userId}`)
                    .set('Authorization', 'Bearer tokentokentoken')
                    .send({
                        username: 'updatedusername',
                        email: 'updated@test.com'
                    })
                    .expect(200);

                expect(updateResponse.body.username).toBe('updatedusername');

                const adminResponse = await request(app)
                    .get('/users')
                    .set('Authorization', 'Bearer admintokentokentoken')
                    .expect(200);

                expect(adminResponse.body.length).toBeGreaterThan(0);
            } finally {
                // восстанавливаем оригинальный мок
                if (originalMockImplementation) {
                    authClient.default.verifyToken.mockImplementation(originalMockImplementation);
                } else {
                    authClient.default.verifyToken.mockRestore();
                }
            }
        });

        it('should validate data constraints', async () => {
            // целостность данных
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const duplicateUser = userRepository.create({
                username: 'useruser',
                email: 'new@test.com',
                password: 'password',
                role: RoleEnum.USER,
            });

            await expect(userRepository.save(duplicateUser)).rejects.toThrow();

            const invalidData = {
                email: 'invalidemail'
            };

            await request(app)
                .put(`/users/${testUserId}`)
                .set('Authorization', 'Bearer admintokentokentoken')
                .send(invalidData)
                .expect(400);
        });
    });


    describe('Error handling', () => {
        it('should handle authentication errors properly', async () => {
            // разные кейсы ошибок валидации

            const response1 = await request(app)
                .get('/users')
                .expect(401);

            expect(response1.body.message).toContain('Token');

            const response2 = await request(app)
                .get('/users')
                .set('Authorization', 'InvalidFormat')
                .expect(401);

            expect(response2.body.message).toContain('Token');

            const response3 = await request(app)
                .get('/users')
                .set('Authorization', 'Bearer invalidtokentokentoken')
                .expect(401);

            expect(response3.body.message).toContain('Invalid');
        });

        it('should handle resource not found errors', async () => {
            // кейсы ошибок "ресурс не найден"

            await request(app)
                .get('/users/999')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(404);

            await request(app)
                .get('/users/find?username=nonexistent')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(404);
        });

        it('should handle bad request errors', async () => {
            // кейс ошибок некорректного запроса

            await request(app)
                .get('/users/find')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(400);
        });
    });


    describe('Real user scenarios', () => {
        it('should support user registration and profile management flow', async () => {
            // полный сценарий регистрации и управление профилем
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const newUser = userRepository.create({
                username: 'newuser',
                email: 'newuser@test.com',
                password: 'password123!',
                role: RoleEnum.USER,
            });
            const savedUser = await userRepository.save(newUser);
            const userId = savedUser.id;

            const authClient = require('../../src/services/auth.client');
            const originalMock = authClient.default.verifyToken;

            // временно настраиваем мок для работы с новым пользователем
            authClient.default.verifyToken.mockImplementation(async (req: any) => {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    throw new Error('Token not provided');
                }
                const token = authHeader.substring(7);

                if (token === 'tokentokentoken') {
                    return { id: userId, username: 'newuser', role: 'user' };
                } else if (token === 'admintokentokentoken') {
                    return { id: 1, username: 'admin', role: 'admin' };
                } else {
                    throw new Error('Invalid or expired token');
                }
            });

            try {
                const profileResponse = await request(app)
                    .get(`/users/${userId}`)
                    .set('Authorization', 'Bearer tokentokentoken')
                    .expect(200);

                expect(profileResponse.body.username).toBe('newuser');

                const updateResponse = await request(app)
                    .put(`/users/${userId}`)
                    .set('Authorization', 'Bearer tokentokentoken')
                    .send({
                        username: 'updatedusername',
                        email: 'updated@test.com'
                    })
                    .expect(200);

                expect(updateResponse.body.username).toBe('updatedusername');

                const adminResponse = await request(app)
                    .get('/users')
                    .set('Authorization', 'Bearer admintokentokentoken')
                    .expect(200);

                expect(adminResponse.body.length).toBeGreaterThan(0);
            } finally {
                authClient.default.verifyToken = originalMock;
            }
        });

        it('should support admin user management flow', async () => {
            // админ управляет всеми
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const listResponse = await request(app)
                .get('/users')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            const initialCount = listResponse.body.length;

            const testUser = userRepository.create({
                username: 'searchuser',
                email: 'search@test.com',
                password: 'password',
                role: RoleEnum.USER,
            });
            await userRepository.save(testUser);

            const searchResponse = await request(app)
                .get('/users/find?username=searchuser')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            expect(searchResponse.body.username).toBe('searchuser');

            const updatedListResponse = await request(app)
                .get('/users')
                .set('Authorization', 'Bearer admintokentokentoken')
                .expect(200);

            expect(updatedListResponse.body.length).toBe(initialCount + 1);
        });
    });
});