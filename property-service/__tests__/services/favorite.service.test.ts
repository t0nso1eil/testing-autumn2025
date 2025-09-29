process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'username';
process.env.DB_PASSWORD = 'password';
process.env.DB_NAME = 'lr1db';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('../../src/config/database');
jest.mock('../../src/services/property.service');
jest.mock('../../src/services/user.client');
jest.mock('../../src/services/auth.client');

import { AppDataSource } from "../../src/config/database";
import { FavoriteService } from "../../src/services/favorite.service";
import propertyService from "../../src/services/property.service";
import userClient from "../../src/services/user.client";
import authClient from "../../src/services/auth.client";
import { Favorite } from "../../src/models/favorite.entity";
import { CreateFavoriteDto } from "../../src/dto/favorite.dto";
import { Request } from 'express';
import { Property } from '../../src/models/property.entity';
import { PropertyType } from '../../src/models/property-type.enum';
import { RentalType } from '../../src/models/rental-type.enum';

const mockedAppDataSource = jest.mocked(AppDataSource);
const mockedPropertyService = jest.mocked(propertyService);
const mockedUserClient = jest.mocked(userClient);
const mockedAuthClient = jest.mocked(authClient);

describe('Favorite service', () => {
    let favoriteService: FavoriteService;
    let mockFavoriteRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFavoriteRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
        };

        mockedAppDataSource.getRepository.mockReturnValue(mockFavoriteRepository);
        favoriteService = new FavoriteService();
    });

    describe('Add favorite', () => {
        it('should add property to favorites', async () => {
            //arrange
            const createDto: CreateFavoriteDto = { propertyId: 1 };
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };
            const mockFavorite = createMockFavorite();
            const mockProperty = createMockProperty();
            const mockEnrichedFavorite = {
                ...mockFavorite,
                property: mockProperty,
                user: mockUser
            };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockedPropertyService.getPropertyById.mockResolvedValue(mockProperty);
            mockFavoriteRepository.findOne.mockResolvedValue(null);
            mockFavoriteRepository.create.mockReturnValue(mockFavorite);
            mockFavoriteRepository.save.mockResolvedValue(mockFavorite);
            mockedUserClient.getUserById.mockResolvedValue(mockUser);

            //act
            const result = await favoriteService.addFavorite(mockRequest as Request, createDto);

            //assert
            expect(mockFavoriteRepository.create).toHaveBeenCalledWith({
                userId: 1,
                propertyId: 1
            });
            expect(result).toEqual(mockEnrichedFavorite);
        });

        it('should throw error when property already in favorites', async () => {
            //arrange
            const createDto: CreateFavoriteDto = { propertyId: 1 };
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };
            const existingFavorite = createMockFavorite();

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockedPropertyService.getPropertyById.mockResolvedValue(createMockProperty());
            mockFavoriteRepository.findOne.mockResolvedValue(existingFavorite);

            //act
            const act = favoriteService.addFavorite(mockRequest as Request, createDto);

            //assert
            await expect(act).rejects.toThrow('Property already in favorites');
        });
    });

    describe('Get all favorites', () => {
        it('should return all favorites for user', async () => {
            //arrange
            const mockFavorites = [createMockFavorite()];
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };
            const mockProperty = createMockProperty();

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.find.mockResolvedValue(mockFavorites);
            mockedPropertyService.getPropertyById.mockResolvedValue(mockProperty);
            mockedUserClient.getUserById.mockResolvedValue(mockUser);

            //act
            const result = await favoriteService.getAllFavorites(mockRequest as Request);

            //assert
            expect(mockFavoriteRepository.find).toHaveBeenCalledWith({ where: { userId: 1 } });
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('property');
            expect(result[0]).toHaveProperty('user');
        });

        it('should return empty array when user has no favorites', async () => {
            //arrange
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.find.mockResolvedValue([]);

            //act
            const result = await favoriteService.getAllFavorites(mockRequest as Request);

            //assert
            expect(result).toEqual([]);
            expect(mockedPropertyService.getPropertyById).not.toHaveBeenCalled();
            expect(mockedUserClient.getUserById).not.toHaveBeenCalled();
        })
    });

    describe('Get favorite by ID', () => {
        it('should successfully return favorite by id for authorized user', async () => {
            //arrange
            const favoriteId = 1;
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };
            const mockFavorite = createMockFavorite({ id: favoriteId, userId: 1 });
            const mockProperty = createMockProperty();
            const mockEnrichedFavorite = {
                ...mockFavorite,
                property: mockProperty,
                user: mockUser
            };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.findOne.mockResolvedValue(mockFavorite);
            mockedPropertyService.getPropertyById.mockResolvedValue(mockProperty);
            mockedUserClient.getUserById.mockResolvedValue(mockUser);

            //act
            const result = await favoriteService.getFavoriteById(mockRequest as Request, favoriteId);

            //assert
            expect(mockedAuthClient.verifyToken).toHaveBeenCalledWith(mockRequest);
            expect(mockFavoriteRepository.findOne).toHaveBeenCalledWith({
                where: { id: favoriteId, userId: mockUser.id }
            });
            expect(mockedPropertyService.getPropertyById).toHaveBeenCalledWith(mockFavorite.propertyId);
            expect(mockedUserClient.getUserById).toHaveBeenCalledWith(mockFavorite.userId, mockRequest.headers.authorization);
            expect(result).toEqual(mockEnrichedFavorite);
        });

        it('should throw error when favorite not found', async () => {
            //arrange
            const favoriteId = 999;
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.findOne.mockResolvedValue(null);

            //act
            const act = favoriteService.getFavoriteById(mockRequest as Request, favoriteId);

            //assert
            await expect(act).rejects.toThrow('Favorite not found');
            expect(mockFavoriteRepository.findOne).toHaveBeenCalledWith({
                where: { id: favoriteId, userId: mockUser.id }
            });
        });

        it('should throw error when user tries to access another users favorite', async () => {
            //arrange
            const favoriteId = 1;
            const mockRequest = { headers: { authorization: 'Bearer token' } };
            const mockUser = { id: 2 }; // Другой пользователь

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.findOne.mockResolvedValue(null); // Не находим favorite

            //act
            const act = favoriteService.getFavoriteById(mockRequest as Request, favoriteId);

            //assert
            await expect(act).rejects.toThrow('Favorite not found');
            expect(mockFavoriteRepository.findOne).toHaveBeenCalledWith({
                where: { id: favoriteId, userId: mockUser.id } // Ищем для user 2
            });
        });
    });

    describe('Remove favorite', () => {
        it('should remove favorite successfully', async () => {
            //arrange
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };
            const mockFavorite = createMockFavorite();

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.findOne.mockResolvedValue(mockFavorite);

            //act
            const result = await favoriteService.removeFavorite(mockRequest as Request, 1);

            //assert
            expect(mockFavoriteRepository.remove).toHaveBeenCalledWith(mockFavorite);
            expect(result).toEqual({ message: 'Favorite removed successfully' });
        });

        it('should throw error when favorite not found', async () => {
            //arrange
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            const mockUser = { id: 1 };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser);
            mockFavoriteRepository.findOne.mockResolvedValue(null);

            //act
            const act = favoriteService.removeFavorite(mockRequest as Request, 999);

            //assert
            await expect(act).rejects.toThrow('Favorite not found');
        });
    });
});

function createMockFavorite(overrides: Partial<Favorite> = {}): Favorite {
    return {
        id: 1,
        userId: 1,
        propertyId: 1,
        createdAt: new Date('2025-09-26'),
        ...overrides
    } as Favorite;
}

function createMockProperty(overrides: Partial<Property> = {}): Property {
    return {
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
    } as Property;
}