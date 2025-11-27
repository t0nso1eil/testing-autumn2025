import request from 'supertest';
import { DataSource } from 'typeorm';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { UserEntity } from '../../src/models/user.entity';
import { RoleEnum } from '../../src/models/role.enum';

// тестовые переменные окружения
process.env.JWT_SECRET = 'richardrichardrichard';
process.env.JWT_EXPIRES_IN = '3600';

// глобальные переменные
let container: StartedTestContainer;
let testDataSource: DataSource;
let app: any;

// мокаем БД
jest.mock('../../src/config/database', () => {
    return {
        AppDataSource: {
            initialize: jest.fn().mockImplementation(async () => {
            }),
            destroy: jest.fn().mockImplementation(async () => {
                if (testDataSource?.isInitialized) {
                    await testDataSource.destroy();
                }
            }),
            getRepository: jest.fn().mockImplementation((entity: any) => {
                if (!testDataSource?.isInitialized) {
                    throw new Error('Test DB is not initialized');
                }
                return testDataSource.getRepository(entity);
            }),
            isInitialized: true,
        }
    };
});

describe('Auth service integration tests', () => {
    beforeAll(async () => {
        console.log('Starting PostgreSQL container...');

        // запуск PostgreSQL контейнера
        container = await new GenericContainer('postgres:15-alpine')
            .withExposedPorts(5432)
            .withEnvironment({
                POSTGRES_DB: 'auth.int.test',
                POSTGRES_USER: 'test',
                POSTGRES_PASSWORD: 'test',
            })
            .start();

        const host = container.getHost();
        const port = container.getMappedPort(5432);

        console.log(`Test PostgreSQL running on ${host}:${port}`);

        // создаем тестовую DataSource с параметрами из контейнера
        testDataSource = new DataSource({
            type: 'postgres',
            host,
            port,
            username: 'test',
            password: 'test',
            database: 'auth.int.test',
            synchronize: true,
            logging: false,
            entities: [UserEntity],
        });

        await testDataSource.initialize();

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
            await testDataSource.getRepository(UserEntity).clear();
        }
    });

    describe('Database connection test', () => {
        it('should have working database connection through mocked AppDataSource', async () => {
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            // проверяем что репозиторий работает через мок
            const count = await userRepository.count();
            expect(count).toBe(0);

            // проверяем что можем сохранить пользователя через мок
            const testUser = userRepository.create({
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashedpassword',
                role: RoleEnum.USER,
            });

            const savedUser = await userRepository.save(testUser);
            expect(savedUser.id).toBeDefined();
            expect(savedUser.username).toBe('testuser');
        });
    });

    describe('User registration flow', () => {
        it('should successfully register a new user and save to database', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@test.com',
                password: 'password123!'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData);

            console.log('Registration response:', response.status, response.body);

            if (response.status === 201) {
                expect(response.body).toMatchObject({
                    username: userData.username,
                    email: userData.email,
                    role: 'user'
                });
            } else {
                console.log('Registration failed:', response.body);
            }

            const userRepository = testDataSource.getRepository(UserEntity);
            const dbUser = await userRepository.findOne({
                where: { email: userData.email }
            });

            expect(dbUser).toBeDefined();
            expect(dbUser?.username).toBe(userData.username);
        });

        it('should fail registration when user already exists', async () => {
            const userData = {
                username: 'existinguser',
                email: 'existing@existoing.com',
                password: 'password123!'
            };

            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);

            const testUser = userRepository.create({
                username: userData.username,
                email: userData.email,
                password: 'hashedpassword',
                role: RoleEnum.USER,
            });
            await userRepository.save(testUser);

            const response = await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.message).toBe('User already exists');
        });
    });

    describe('User login flow', () => {
        beforeEach(async () => {
            const { AppDataSource } = require('../../src/config/database');
            const userRepository = AppDataSource.getRepository(UserEntity);
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('password123!', 10);

            const testUser = userRepository.create({
                username: 'loginuser',
                email: 'login@login.com',
                password: hashedPassword,
                role: RoleEnum.USER,
            });
            await userRepository.save(testUser);
        });

        it('should successfully login with valid credentials and return JWT token', async () => {
            const loginData = {
                email: 'login@login.com',
                password: 'password123!'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body.token).toBeDefined();
            expect(typeof response.body.token).toBe('string');
        });

        it('should fail login with invalid password', async () => {
            const loginData = {
                email: 'login@login.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.message).toBe('Invalid credentials');
        });
    });
});