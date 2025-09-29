process.env.AUTH_SERVICE_URL = 'http://localhost:3000';

jest.mock('../../src/services/favorite.service');
jest.mock('../../src/services/auth.client');
jest.mock('../../src/utils/validate.util');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

import { FavoriteController } from "../../src/controllers/favorite.controller";
import favoriteService from "../../src/services/favorite.service";
import authClient from "../../src/services/auth.client";
import { validateDto } from "../../src/utils/validate.util";
import { CreateFavoriteDto, UpdateFavoriteDto } from "../../src/dto/favorite.dto";

const mockedFavoriteService = jest.mocked(favoriteService);
const mockedAuthClient = jest.mocked(authClient);
const mockedValidateDto = jest.mocked(validateDto);

describe('Favorite controller', () => {
    let favoriteController: FavoriteController;

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
        favoriteController = new FavoriteController();
    });

    describe('Get all favorites', () => {
        it('should return all favorites for user', async () => {
            //arrange
            const mockFavorites = [{ id: 1, propertyId: 1, userId: 1 }];
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();

            mockedFavoriteService.getAllFavorites.mockResolvedValue(mockFavorites as any);

            //act
            await favoriteController.getAllFavorites(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockFavorites);
        });

        it('should return 401 for invalid token', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer invalidtokentokentoken' });
            const res = createMockResponse();

            mockedFavoriteService.getAllFavorites.mockRejectedValue(
                new Error('Invalid or expired token')
            );

            //act
            await favoriteController.getAllFavorites(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
        });

        it('should return empty array when user has no favorites', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();

            mockedFavoriteService.getAllFavorites.mockResolvedValue([]);

            //act
            await favoriteController.getAllFavorites(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith([]);
        })
    });

    describe('Get favorite by ID', () => {
        it('should return favorite by id', async () => {
            //arrange
            const mockFavorite = { id: 1, propertyId: 1, userId: 1 };
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();

            mockedFavoriteService.getFavoriteById.mockResolvedValue(mockFavorite as any);

            //act
            await favoriteController.getFavoriteById(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockFavorite);
        });

        it('should return 404 when favorite not found', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '999' });
            const res = createMockResponse();

            mockedFavoriteService.getFavoriteById.mockRejectedValue(
                new Error('Favorite not found')
            );

            //act
            await favoriteController.getFavoriteById(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Add favorite', () => {
        it('should add favorite successfully', async () => {
            //arrange
            const createDto: CreateFavoriteDto = { propertyId: 1 };
            const mockFavorite = { id: 1, ...createDto, userId: 1 };
            const req = createMockRequest(createDto, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(createDto);
            mockedFavoriteService.addFavorite.mockResolvedValue(mockFavorite as any);

            //act
            await favoriteController.addFavorite(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockFavorite);
        });

        it('should return 400 when property already in favorites', async () => {
            //arrange
            const createDto: CreateFavoriteDto = { propertyId: 1 };
            const req = createMockRequest(createDto, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(createDto);
            mockedFavoriteService.addFavorite.mockRejectedValue(
                new Error('Property already in favorites')
            );

            //act
            await favoriteController.addFavorite(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when property not found', async () => {
            //arrange
            const createDto: CreateFavoriteDto = { propertyId: 999 };
            const req = createMockRequest(createDto, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(createDto);
            mockedFavoriteService.addFavorite.mockRejectedValue(
                new Error('Property not found')
            );

            //act
            await favoriteController.addFavorite(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Update favorite', () => {
        it('should successfuly update favorite', async () => {
            //arrange
            const updateDto: UpdateFavoriteDto = { propertyId: 2 };
            const mockFavorite = { id: 1, ...updateDto, userId: 1 };
            const req = createMockRequest(updateDto, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(updateDto);
            mockedFavoriteService.updateFavorite.mockResolvedValue(mockFavorite as any);

            //act
            await favoriteController.updateFavorite(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith(mockFavorite);
        });

        it('should return 404 when favorite not found during update', async () => {
            //arrange
            const updateDto: UpdateFavoriteDto = { propertyId: 2 };
            const req = createMockRequest(updateDto, { authorization: 'Bearer token' }, { id: '999' });
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(updateDto);
            mockedFavoriteService.updateFavorite.mockRejectedValue(new Error('Favorite not found'));

            //act
            await favoriteController.updateFavorite(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Remove favorite', () => {
        it('should remove favorite successfully', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '1' });
            const res = createMockResponse();

            mockedFavoriteService.removeFavorite.mockResolvedValue({
                message: 'Favorite removed successfully'
            } as any);

            //act
            await favoriteController.removeFavorite(req as any, res as any);

            //assert
            expect(res.json).toHaveBeenCalledWith({ message: 'Favorite removed successfully' });
        });

        it('should return 404 when favorite not found', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, { id: '999' });
            const res = createMockResponse();

            mockedFavoriteService.removeFavorite.mockRejectedValue(
                new Error('Favorite not found')
            );

            //act
            await favoriteController.removeFavorite(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should handle user trying to remove another users favorite', async () => {
            //arrange
            const req = createMockRequest({}, { authorization: 'Bearer token' }, { id: '1' });
            const res = createMockResponse();

            mockedFavoriteService.removeFavorite.mockRejectedValue(new Error('Favorite not found'));

            //act
            await favoriteController.removeFavorite(req as any, res as any);

            //assert
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});