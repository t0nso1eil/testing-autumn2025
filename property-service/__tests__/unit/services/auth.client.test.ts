process.env.AUTH_SERVICE_URL = 'http://localhost:3000';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('axios');

import axios from 'axios';
import { AuthClient } from "../../../src/services/auth.client";
import { Request } from 'express';

const mockedAxios = jest.mocked(axios);

describe('Auth client', () => {
    let authClient: AuthClient;

    beforeEach(() => {
        jest.clearAllMocks();
        authClient = new AuthClient();
    });

    describe('Verify token', () => {
        it('should verify valid token successfully', async () => {
            //arrange
            const mockRequest: Partial<Request> = {
                headers: { authorization: 'Bearer tokentokentoken' }
            };

            const mockUser = { id: 1, email: 'email@mail.com', role: 'user' };
            mockedAxios.get.mockResolvedValue({ data: { user: mockUser } });

            //act
            const result = await authClient.verifyToken(mockRequest as Request);

            //assert
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://localhost:3000/auth/verify',
                {
                    headers: { Authorization: 'Bearer tokentokentoken' }
                }
            );
            expect(result).toEqual(mockUser);
        });

        it('should throw error when no authorization header', async () => {
            //arrange
            const mockRequest: Partial<Request> = { headers: {} };

            //act
            const act = authClient.verifyToken(mockRequest as Request);

            //assert
            await expect(act).rejects.toThrow('Invalid or expired token');
        });
    });
});