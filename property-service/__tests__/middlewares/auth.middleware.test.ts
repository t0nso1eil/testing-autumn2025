import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middlewares/auth.middleware';
import authClient from '../../src/services/auth.client';

jest.mock('../../src/services/auth.client');

const mockedAuthClient = jest.mocked(authClient);

describe('Auth middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        nextFunction = jest.fn();
    });

    it('should set user on request when token is valid', async () => {
        //arrange
        const mockUser = { id: 1, email: 'email@mail.com', role: 'user' };
        mockRequest.headers = { authorization: 'Bearer tokentokentoken' };

        mockedAuthClient.verifyToken.mockResolvedValue(mockUser as any);

        //act
        await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        //assert
        expect(mockRequest.user).toEqual(mockUser);
        expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
        //arrange
        mockRequest.headers = {};

        mockedAuthClient.verifyToken.mockRejectedValue(new Error('Token not provided'));

        //act
        await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        //assert
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Token not provided' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
        //arrange
        mockRequest.headers = { authorization: 'Bearer invalidtokentokentoken' };

        mockedAuthClient.verifyToken.mockRejectedValue(new Error('Invalid or expired token'));

        //act
        await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        //assert
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });
});