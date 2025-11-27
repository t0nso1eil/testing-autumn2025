import * as request from 'supertest';
import * as express from 'express';
import { AppDataSource } from '../../src/config/database';
import app from '../../src/app';
import { Property } from '../../src/models/property.entity';
import { Favorite } from '../../src/models/favorite.entity';
import { PropertyType } from '../../src/models/property-type.enum';
import { RentalType } from '../../src/models/rental-type.enum';

// Mock внешних сервисов
jest.mock('../../src/services/auth.client', () => ({
    verifyToken: jest.fn()
}));

jest.mock('../../src/services/user.client', () => ({
    getUserById: jest.fn()
}));

describe('Property Service Integration Tests', () => {
    let testApp: express.Application;

    beforeAll(async () => {
        // Инициализация тестовой БД
        await AppDataSource.initialize();
        testApp = app;
    });

    afterAll(async () => {
        await AppDataSource.destroy();
    });

    beforeEach(async () => {
        // Очистка БД перед каждым тестом
        await AppDataSource.getRepository(Favorite).clear();
        await AppDataSource.getRepository(Property).clear();

        // Сброс моков
        jest.clearAllMocks();
    });

    describe('Property CRUD Flow', () => {
        it('should complete full property lifecycle: create → read → update → delete', async () => {
            // Arrange - Mock авторизации
            const { verifyToken } = require('../../src/services/auth.client');
            const { getUserById } = require('../../src/services/user.client');

            const mockUser = { id: 1, email: 'owner@test.com', role: 'user' };
            const mockOwner = { id: 1, username: 'owner', email: 'owner@test.com' };

            verifyToken.mockResolvedValue(mockUser);
            getUserById.mockResolvedValue(mockOwner);

            const propertyData = {
                title: 'Luxury Apartment',
                description: 'Beautiful apartment in city center',
                rentalType: RentalType.MONTHLY,
                price: 1500,
                location: 'New York',
                propertyType: PropertyType.APARTMENT
            };

            // Act & Assert - CREATE
            const createResponse = await request(testApp)
                .post('/properties')
                .set('Authorization', 'Bearer valid-token')
                .send(propertyData);

            expect(createResponse.status).toBe(201);
            expect(createResponse.body.title).toBe(propertyData.title);
            expect(createResponse.body.ownerId).toBe(1);

            const propertyId = createResponse.body.id;

            // Act & Assert - READ
            const getResponse = await request(testApp)
                .get(`/properties/${propertyId}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.id).toBe(propertyId);

            // Act & Assert - UPDATE
            const updateData = { title: 'Updated Luxury Apartment', price: 1600 };
            const updateResponse = await request(testApp)
                .put(`/properties/${propertyId}`)
                .set('Authorization', 'Bearer valid-token')
                .send(updateData);

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.title).toBe(updateData.title);
            expect(updateResponse.body.price).toBe(updateData.price);

            // Act & Assert - DELETE
            const deleteResponse = await request(testApp)
                .delete(`/properties/${propertyId}`)
                .set('Authorization', 'Bearer valid-token');

            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.message).toBe('Property deleted successfully');

            // Verify property is actually deleted
            const getAfterDeleteResponse = await request(testApp)
                .get(`/properties/${propertyId}`);

            expect(getAfterDeleteResponse.status).toBe(404);
        });
    });

    describe('Property Search Flow', () => {
        beforeEach(async () => {
            // Создаем тестовые данные с правильными типами
            const propertyRepo = AppDataSource.getRepository(Property);

            const testProperties = [
                {
                    title: 'City Apartment',
                    description: 'Apartment in downtown',
                    rentalType: RentalType.MONTHLY,
                    price: 1200,
                    location: 'New York',
                    propertyType: PropertyType.APARTMENT,
                    ownerId: 1
                },
                {
                    title: 'Country House',
                    description: 'Quiet house in countryside',
                    rentalType: RentalType.YEARLY,
                    price: 2000,
                    location: 'California',
                    propertyType: PropertyType.HOUSE,
                    ownerId: 2
                },
                {
                    title: 'Beach Villa',
                    description: 'Luxury villa with ocean view',
                    rentalType: RentalType.DAILY,
                    price: 300,
                    location: 'Miami',
                    propertyType: PropertyType.VILLA,
                    ownerId: 3
                }
            ];

            // Сохраняем каждое property отдельно
            for (const propertyData of testProperties) {
                await propertyRepo.save(propertyRepo.create(propertyData));
            }
        });

        it('should search properties with multiple filters', async () => {
            // Act & Assert
            const searchResponse = await request(testApp)
                .post('/properties/search')
                .send({
                    location: 'New York',
                    minPrice: 1000,
                    maxPrice: 1500,
                    propertyType: PropertyType.APARTMENT,
                    rentalType: RentalType.MONTHLY
                });

            expect(searchResponse.status).toBe(200);
            expect(searchResponse.body).toHaveLength(1);
            expect(searchResponse.body[0].location).toBe('New York');
            expect(searchResponse.body[0].propertyType).toBe(PropertyType.APARTMENT);
        });

        it('should return empty array when no properties match criteria', async () => {
            // Act & Assert
            const searchResponse = await request(testApp)
                .post('/properties/search')
                .send({
                    location: 'NonExistentCity',
                    minPrice: 5000
                });

            expect(searchResponse.status).toBe(200);
            expect(searchResponse.body).toHaveLength(0);
        });
    });
});