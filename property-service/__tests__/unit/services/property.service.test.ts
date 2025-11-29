process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'username';
process.env.DB_PASSWORD = 'password';
process.env.DB_NAME = 'lr1db';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('../../../src/config/database');
jest.mock('../../../src/services/user.client');

import { AppDataSource } from "../../../src/config/database";
import { PropertyService } from "../../../src/services/property.service";
import userClient from "../../../src/services/user.client";
import { Property } from "../../../src/models/property.entity";
import { CreatePropertyDto, UpdatePropertyDto, SearchPropertyDto } from "../../../src/dto/property.dto";
import { Request } from 'express';
import { PropertyType } from '../../../src/models/property-type.enum';
import { RentalType } from '../../../src/models/rental-type.enum';

const mockedAppDataSource = jest.mocked(AppDataSource);
const mockedUserClient = jest.mocked(userClient);

describe('Property service', () => {
    let propertyService: PropertyService;
    let mockPropertyRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPropertyRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        mockedAppDataSource.getRepository.mockReturnValue(mockPropertyRepository);
        propertyService = new PropertyService();
    });

    describe('Get all properties', () => {
        it('should return all properties with owners', async () => {
            const mockProperties = [createMockProperty(), createMockProperty({ id: 2 })];
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };

            mockPropertyRepository.find.mockResolvedValue(mockProperties);
            mockedUserClient.getUserById.mockResolvedValue({ id: 1, username: 'owner' });

            const result = await propertyService.getAllProperties(mockRequest as Request);

            expect(mockPropertyRepository.find).toHaveBeenCalled();
            expect(result).toHaveLength(2);
        });

        it('should return properties without owners when no auth token', async () => {
            const mockProperties = [createMockProperty()];

            mockPropertyRepository.find.mockResolvedValue(mockProperties);

            const result = await propertyService.getAllProperties();

            expect(result).toEqual(mockProperties);
        });

        it('should handle empty properties list', async () => {
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };
            mockPropertyRepository.find.mockResolvedValue([]);

            const result = await propertyService.getAllProperties(mockRequest as Request);

            expect(result).toEqual([]);
            expect(mockedUserClient.getUserById).not.toHaveBeenCalled();
        })
    });

    describe('Get property by ID', () => {
        it('should return property by id', async () => {
            const mockProperty = createMockProperty();
            mockPropertyRepository.findOneBy.mockResolvedValue(mockProperty);

            const result = await propertyService.getPropertyById(1);

            expect(mockPropertyRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
            expect(result).toEqual(mockProperty);
        });

        it('should throw error for non-existing property', async () => {
            mockPropertyRepository.findOneBy.mockResolvedValue(null);

            await expect(propertyService.getPropertyById(999))
                .rejects.toThrow('Property not found');
        });
    });

    describe('Create property', () => {
        it('should create property successfully', async () => {
            const createDto: CreatePropertyDto = {
                title: 'Property',
                description: 'Description',
                rentalType: RentalType.MONTHLY,
                price: 10000,
                location: 'Location',
                propertyType: PropertyType.APARTMENT
            };

            const mockProperty = { ...createDto, id: 1, ownerId: 1 };
            const mockRequest = { headers: { authorization: 'Bearer tokentokentoken' } };

            mockedUserClient.getUserById.mockResolvedValue({ id: 1 });
            mockPropertyRepository.create.mockReturnValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue(mockProperty);
            mockPropertyRepository.findOneBy.mockResolvedValue(mockProperty);

            const result = await propertyService.createProperty(createDto, 1, mockRequest as Request);

            expect(mockPropertyRepository.create).toHaveBeenCalledWith({
                ...createDto,
                ownerId: 1
            });
            expect(result).toEqual(mockProperty);
        });

        it('should handle missing authorization header', async () => {
            const createDto: CreatePropertyDto = {
                title: 'Property',
                rentalType: RentalType.MONTHLY,
                price: 1000,
                location: 'Location',
                propertyType: PropertyType.APARTMENT
            };
            const mockRequest = { headers: {} };

            await expect(
                propertyService.createProperty(createDto, 1, mockRequest as Request)
            ).rejects.toThrow('Authorization header is required');
        });
    });

    describe('Update property', () => {
        it('should update property when user is owner', async () => {
            const updateDto: UpdatePropertyDto = { title: 'Updated title' };
            const existingProperty = createMockProperty();
            const updatedProperty = { ...existingProperty, ...updateDto };

            mockPropertyRepository.findOneBy.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const result = await propertyService.updateProperty(1, updateDto, 1, 'user');

            expect(mockPropertyRepository.save).toHaveBeenCalledWith(updatedProperty);
            expect(result.title).toBe('Updated title');
        });

        it('should throw error when user is not owner and not admin', async () => {
            const updateDto: UpdatePropertyDto = { title: 'Updated Ttitle' };
            const existingProperty = createMockProperty({ ownerId: 2 });

            mockPropertyRepository.findOneBy.mockResolvedValue(existingProperty);

            await expect(propertyService.updateProperty(1, updateDto, 1, 'user'))
                .rejects.toThrow('Forbidden');
        });

        it('should allow admin to update any property', async () => {
            const updateDto: UpdatePropertyDto = { title: 'Updated title' };
            const existingProperty = createMockProperty({ ownerId: 2 });
            const updatedProperty = { ...existingProperty, ...updateDto };

            mockPropertyRepository.findOneBy.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(updatedProperty);

            const result = await propertyService.updateProperty(1, updateDto, 1, 'ADMIN');

            expect(result.title).toBe('Updated title');
        });

        it('should handle partial updates with empty DTO', async () => {
            const updateDto: UpdatePropertyDto = {};
            const existingProperty = createMockProperty();

            mockPropertyRepository.findOneBy.mockResolvedValue(existingProperty);
            mockPropertyRepository.save.mockResolvedValue(existingProperty);

            const result = await propertyService.updateProperty(1, updateDto, 1, 'user');

            expect(result).toEqual(existingProperty);
            expect(mockPropertyRepository.save).toHaveBeenCalledWith(existingProperty);
        });

        it('should handle non-existent property during update', async () => {
            const updateDto: UpdatePropertyDto = { title: 'Updated' };

            mockPropertyRepository.findOneBy.mockResolvedValue(null);

            await expect(
                propertyService.updateProperty(999, updateDto, 1, 'user')
            ).rejects.toThrow('Property not found');
        });
    });

    describe('Search properties', () => {
        it('should search properties with filters', async () => {
            const searchDto: SearchPropertyDto = {
                location: 'Location',
                minPrice: 5000,
                maxPrice: 20000,
                propertyType: PropertyType.APARTMENT,
                rentalType: RentalType.MONTHLY
            };

            const mockProperties = [createMockProperty()];
            const mockQueryBuilder = {
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockProperties)
            };

            mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await propertyService.searchProperties(searchDto);

            expect(mockPropertyRepository.createQueryBuilder).toHaveBeenCalledWith('property');
            expect(result).toEqual(mockProperties);
        });
    });

    describe('Delete property', () => {
        it('should allow property owner to delete their own property', async () => {
            // arrange
            const propertyId = 1;
            const ownerId = 1;
            const mockProperty = createMockProperty({ id: propertyId, ownerId: ownerId });

            mockPropertyRepository.findOneBy.mockResolvedValue(mockProperty);
            mockPropertyRepository.remove.mockResolvedValue(mockProperty);

            // act
            const result = await propertyService.deleteProperty(propertyId, ownerId, 'user');

            // assert
            expect(mockPropertyRepository.findOneBy).toHaveBeenCalledWith({ id: propertyId });
            expect(mockPropertyRepository.remove).toHaveBeenCalledWith(mockProperty);
            expect(result).toEqual({ message: "Property deleted successfully" });
        });

        it('should allow to delete property when user is admin', async () => {
            const existingProperty = createMockProperty({ ownerId: 2 }); // Другой владелец

            mockPropertyRepository.findOneBy.mockResolvedValue(existingProperty);
            mockPropertyRepository.remove.mockResolvedValue(existingProperty);

            const result = await propertyService.deleteProperty(1, 1, 'ADMIN');

            expect(mockPropertyRepository.remove).toHaveBeenCalledWith(existingProperty);
            expect(result).toEqual({ message: "Property deleted successfully" });
        });

        it('should handle non-existent property during deletion', async () => {
            mockPropertyRepository.findOneBy.mockResolvedValue(null);

            await expect(
                propertyService.deleteProperty(999, 1, 'user')
            ).rejects.toThrow('Property not found');
        });

        it('should throw error when non-owner tries to delete', async () => {
            const existingProperty = createMockProperty({ ownerId: 2 });

            mockPropertyRepository.findOneBy.mockResolvedValue(existingProperty);

            await expect(
                propertyService.deleteProperty(1, 1, 'user')
            ).rejects.toThrow('Forbidden');
        });
    });
});

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
        createdAt: new Date('2025-09-26'),
        ...overrides
    } as Property;
}