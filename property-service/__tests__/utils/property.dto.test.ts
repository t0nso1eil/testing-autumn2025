process.env.USER_SERVICE_URL = 'http://localhost:3001';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('axios');

import axios from 'axios';
import { UserClient } from "../../src/services/user.client";

const mockedAxios = jest.mocked(axios);

describe('User client', () => {
    let userClient: UserClient;

    beforeEach(() => {
        jest.clearAllMocks();
        userClient = new UserClient();
    });

    describe('Get user by ID', () => {
        it('should fetch user successfully', async () => {
            //arrange
            const mockUser = { id: 1, username: 'username', email: 'email@mail.com' };
            mockedAxios.get.mockResolvedValue({ data: mockUser });

            //act
            const result = await userClient.getUserById(1, 'Bearer tokentokentoken');

            //assert
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://localhost:3001/users/1',
                {
                    headers: { Authorization: 'Bearer tokentokentoken' }
                }
            );
            expect(result).toEqual(mockUser);
        });

        it('should throw error when no authorization header', async () => {
            //act
            const act = userClient.getUserById(1, '');

            //assert
            await expect(act).rejects.toThrow('Failed to fetch user');
        });
    });
});