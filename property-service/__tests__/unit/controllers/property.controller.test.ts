process.env.AUTH_SERVICE_URL = 'http://localhost:3000';

jest.mock('../../../src/services/property.service');
jest.mock('../../../src/services/auth.client');
jest.mock('../../../src/utils/validate.util');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

import { PropertyController } from "../../../src/controllers/property.controller";
import propertyService from "../../../src/services/property.service";
import authClient from "../../../src/services/auth.client";
import { validateDto } from "../../../src/utils/validate.util";
import {CreatePropertyDto, SearchPropertyDto, UpdatePropertyDto} from "../../../src/dto/property.dto";
import { PropertyType } from '../../../src/models/property-type.enum';
import { RentalType } from '../../../src/models/rental-type.enum';

const mockedPropertyService = jest.mocked(propertyService);
const mockedAuthClient = jest.mocked(authClient);
const mockedValidateDto = jest.mocked(validateDto);

describe('Property controller', () => {
    let propertyController: PropertyController;

    const createMockResponse = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    const createMockRequest = (body: any = {}, headers: any = {}, params: any = {}) => ({
        body,
        headers,
        params
    });

    beforeEach(() => {
        jest.clearAllMocks();
        propertyController = new PropertyController();
    });

    describe('Create property', () => {
        it('should create property successfully', async () => {
            //arrange
            const createDto: CreatePropertyDto = {
                title: 'Property',
                rentalType: RentalType.MONTHLY,
                price: 10000,
                location: 'Location',
                propertyType: PropertyType.APARTMENT
            };

            const mockProperty = { ...createDto, id: 1, ownerId: 1 };
            const req = createMockRequest(createDto, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();
            const mockUser = { id: 1, role: 'user' };

            mockedValidateDto.mockResolvedValue(createDto);
            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.createProperty.mockResolvedValue(mockProperty as any);

            //act
            await propertyController.createProperty(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockProperty);
        });

        it('should return 401 for invalid token', async () => {
            //arrange
            const createDto: CreatePropertyDto = {
                title: 'Property',
                rentalType: RentalType.MONTHLY,
                price: 10000,
                location: 'Location',
                propertyType: PropertyType.APARTMENT
            };

            const req = createMockRequest(createDto, { authorization: 'Bearer invalidtokentokentoken' });
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(createDto);
            mockedAuthClient.verifyToken.mockRejectedValue(new Error('Invalid token'));

            //act
            await propertyController.createProperty(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Get all properties', () => {
        it('should return all properties', async () => {
            //arrange
            const mockProperties = [createMockProperty()];
            const req = createMockRequest();
            const res = createMockResponse();

            mockedPropertyService.getAllProperties.mockResolvedValue(mockProperties as any);

            //act
            await propertyController.getAllProperties(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockProperties);
        });

        it('should return empty array when no properties exist', async () => {
            //arrange
            const req = createMockRequest();
            const res = createMockResponse();

            mockedPropertyService.getAllProperties.mockResolvedValue([]);

            //act
            await propertyController.getAllProperties(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith([]);
        })
    });

    describe('Get property by ID', () => {
        it('should return property by id', async () => {
            //arrange
            const mockProperty = createMockProperty();
            const req = createMockRequest({}, {}, { id: '1' });
            const res = createMockResponse();

            mockedPropertyService.getPropertyById.mockResolvedValue(mockProperty as any);

            //act
            await propertyController.getPropertyById(req as any, res as any);

            //assert
            expect(mockedPropertyService.getPropertyById).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith(mockProperty);
        });

        it('should return 404 for non-existing property', async () => {
            //arrange
            const req = createMockRequest({}, {}, { id: '999' });
            const res = createMockResponse();

            mockedPropertyService.getPropertyById.mockRejectedValue(new Error('Property not found'));

            //act
            await propertyController.getPropertyById(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Update property', () => {
        it('should update property successfully', async () => {
            //arrange
            const updateDto: UpdatePropertyDto = { title: 'Updated property' };
            const mockProperty = createMockProperty({ title: 'Updated property' });
            const req = createMockRequest(updateDto, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();
            const mockUser = { id: 1, role: 'user' };

            mockedValidateDto.mockResolvedValue(updateDto);
            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.updateProperty.mockResolvedValue(mockProperty as any);

            //act
            await propertyController.updateProperty(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockProperty);
        });

        it('should allow admin to update any property', async () => {
            //arrange
            const updateDto: UpdatePropertyDto = { title: 'Updated property' };
            const mockProperty = createMockProperty({ title: 'Updated property' });
            const req = createMockRequest(updateDto, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();
            const mockAdminUser = { id: 2, role: 'ADMIN' };

            mockedValidateDto.mockResolvedValue(updateDto);
            mockedAuthClient.verifyToken.mockResolvedValue(mockAdminUser as any);
            mockedPropertyService.updateProperty.mockResolvedValue(mockProperty as any);

            //act
            await propertyController.updateProperty(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockProperty);
        });

        it('should return 403 when user is not owner', async () => {
            //arrange
            const updateDto: UpdatePropertyDto = { title: 'Updated property' };
            const req = createMockRequest(updateDto, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();
            const mockUser = { id: 2, role: 'user' };

            mockedValidateDto.mockResolvedValue(updateDto);
            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.updateProperty.mockRejectedValue(new Error('Forbidden'));

            //act
            await propertyController.updateProperty(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should handle property not found during update', async () => {
            //arrange
            const updateDto: UpdatePropertyDto = { title: 'Updated property' };
            const req = createMockRequest(updateDto, { authorization: 'Bearer tokentokentoken' }, { id: '999' });
            const res = createMockResponse();
            const mockUser = { id: 1, role: 'user' };

            mockedValidateDto.mockResolvedValue(updateDto);
            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.updateProperty.mockRejectedValue(new Error('Property not found'));

            //act
            await propertyController.updateProperty(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Delete property', () => {
        it('should delete property successfully when user is owner', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();
            const mockUser = { id: 1, role: 'user' };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.deleteProperty.mockResolvedValue({
                message: 'Property deleted successfully'
            } as any);

            //act
            await propertyController.deleteProperty(req as any, res as any);

            //assert
            expect(mockedPropertyService.deleteProperty).toHaveBeenCalledWith(1, 1, 'user');
            expect(res.json).toHaveBeenCalledWith({ message: 'Property deleted successfully' });
        });

        it('should delete property successfully when user is admin', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();
            const mockAdminUser = { id: 2, role: 'ADMIN' };

            mockedAuthClient.verifyToken.mockResolvedValue(mockAdminUser as any);
            mockedPropertyService.deleteProperty.mockResolvedValue({
                message: 'Property deleted successfully'
            } as any);

            //act
            await propertyController.deleteProperty(req as any, res as any);

            //assert
            expect(mockedPropertyService.deleteProperty).toHaveBeenCalledWith(1, 2, 'ADMIN');
            expect(res.json).toHaveBeenCalledWith({ message: 'Property deleted successfully' });
        });

        it('should return 403 when non-owner tries to delete property', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();
            const mockUser = { id: 2, role: 'user' };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.deleteProperty.mockRejectedValue(new Error('Forbidden'));

            //act
            await propertyController.deleteProperty(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
        });

        it('should return 404 when property not found during deletion', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '999' });
            const res = createMockResponse();
            const mockUser = { id: 1, role: 'user' };

            mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);
            mockedPropertyService.deleteProperty.mockRejectedValue(new Error('Property not found'));

            //act
            await propertyController.deleteProperty(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Property not found' });
        });
    });

    describe('Search properties', () => {
        it('should search properties successfully with filters', async () => {
            //arrange
            const searchDto = {
                location: 'Location',
                minPrice: 100,
                maxPrice: 10000,
                propertyType: PropertyType.APARTMENT,
                rentalType: RentalType.MONTHLY
            };
            const mockProperties = [createMockProperty(), createMockProperty({ id: 2 })];
            const req = createMockRequest(searchDto);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(searchDto as any);
            mockedPropertyService.searchProperties.mockResolvedValue(mockProperties as any);

            //act
            await propertyController.searchProperties(req as any, res as any);

            //assert
            expect(mockedValidateDto).toHaveBeenCalledWith(SearchPropertyDto, searchDto, req, res);
            expect(mockedPropertyService.searchProperties).toHaveBeenCalledWith(searchDto);
            expect(res.json).toHaveBeenCalledWith(mockProperties);
        });

        it('should search properties with partial filters', async () => {
            //arrange
            const searchDto = { location: 'Location' };
            const mockProperties = [createMockProperty()];
            const req = createMockRequest(searchDto);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(searchDto as any);
            mockedPropertyService.searchProperties.mockResolvedValue(mockProperties as any);

            //act
            await propertyController.searchProperties(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockProperties);
        });

        it('should return empty array when no properties match search criteria', async () => {
            //arrange
            const searchDto = { location: 'Unreal location' };
            const req = createMockRequest(searchDto);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(searchDto as any);
            mockedPropertyService.searchProperties.mockResolvedValue([]);

            //act
            await propertyController.searchProperties(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should handle service errors during search', async () => {
            //arrange
            const searchDto = { location: 'Location' };
            const req = createMockRequest(searchDto);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(searchDto as any);
            mockedPropertyService.searchProperties.mockRejectedValue(new Error('Search service unavailable'));

            //act
            await propertyController.searchProperties(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Search service unavailable' });
        });

        it('should handle search with no filters', async () => {
            //arrange
            const searchDto = {};
            const mockProperties = [createMockProperty(), createMockProperty({ id: 2 })];
            const req = createMockRequest(searchDto);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(searchDto as any);
            mockedPropertyService.searchProperties.mockResolvedValue(mockProperties as any);

            //act
            await propertyController.searchProperties(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockProperties);
        });
    });
});

function createMockProperty(overrides: Partial<any> = {}) {
    return {
        id: 1,
        ownerId: 1,
        title: 'Property',
        rentalType: RentalType.MONTHLY,
        price: 1000,
        location: 'Location',
        propertyType: PropertyType.APARTMENT,
        ...overrides
    };
}