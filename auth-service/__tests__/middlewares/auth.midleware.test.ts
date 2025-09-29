import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middlewares/auth.middleware';
import authService from '../../src/services/auth.service';

jest.mock('../../src/services/auth.service');

const mockedAuthService = jest.mocked(authService);

describe('Auth middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = {
            headers: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('Authenticate', () => {
        it('should set user in request and call next when valid token provided', async () => {
            // arrange
            const token = 'tokentokentoken';
            const userPayload = {
                id: 1,
                email: 'email@mail.com',
                role: 'user'
            };

            mockRequest.headers = {
                authorization: `Bearer ${token}`
            };
            mockedAuthService.verifyToken.mockResolvedValue(userPayload as any);

            // act
            await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // assert
            expect(mockedAuthService.verifyToken).toHaveBeenCalledWith(token);
            expect(mockRequest.user).toEqual(userPayload);
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header is missing', async () => {
            // arrange
            mockRequest.headers = {};

            // act
            await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Authorization header missing or in wrong format'
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockedAuthService.verifyToken).not.toHaveBeenCalled();
        });

        it('should return 401 when token verification fails', async () => {
            // arrange
            const token = 'invalidtokentokentoken';
            mockRequest.headers = {
                authorization: `Bearer ${token}`
            };

            const errorMessage = 'Invalid or expired token';
            mockedAuthService.verifyToken.mockRejectedValue(new Error(errorMessage));

            // act
            await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // assert
            expect(mockedAuthService.verifyToken).toHaveBeenCalledWith(token);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: errorMessage
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('JWT verification error:', expect.any(Error));
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRequest.user).toBeUndefined();
        });

        it('should handle case insensitive authorization header', async () => {
            // arrange
            const token = 'tokentokentoken';
            const userPayload = {
                id: 1,
                email: 'email@mail.com',
                role: 'user'
            };

            mockRequest.headers = {
                authorization: `bearer ${token}`
            };

            // act
            await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            // assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Authorization header missing or in wrong format'
            });
            expect(mockedAuthService.verifyToken).not.toHaveBeenCalled();
        });
    });
});