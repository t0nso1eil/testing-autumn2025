process.env.AUTH_SERVICE_URL = 'http://localhost:3000';

jest.mock('../../src/services/user.service');
jest.mock('../../src/services/auth.client');
jest.mock('../../src/utils/validate.util');
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

import { UserController } from "../../src/controllers/user.controller";
import userService from "../../src/services/user.service";
import authClient from "../../src/services/auth.client";
import { validateDto } from "../../src/utils/validate.util";
import { UpdateUserDto } from "../../src/dto/user.dto";

const mockedUserService = jest.mocked(userService);
const mockedAuthClient = jest.mocked(authClient);
const mockedValidateDto = jest.mocked(validateDto);

describe('User controller', () => {
    let userController: UserController;

    const createMockResponse = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    const createMockRequest = (body: any = {}, headers: any = {}, params: any = {}, query: any = {}) => ({
        body,
        headers,
        params,
        query
    });

    beforeEach(() => {
        jest.clearAllMocks();
        userController = new UserController();
    });

    describe('Get all users', () => {
        it('should return all users for authenticated user', async () => {
            // arrange
            const mockUsers = [
                { id: 1, username: 'user1', email: 'user1@mail.com', role: 'user' },
                { id: 2, username: 'user2', email: 'user2@mail.com', role: 'admin' },
            ];

            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' });
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.getAllUsers.mockResolvedValue(mockUsers as any);

            // act
            await userController.getAllUsers(req as any, res as any);

            // assert
            expect(mockedAuthClient.verifyToken).toHaveBeenCalledWith(req);
            expect(mockedUserService.getAllUsers).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockUsers);
        });

        it('should return 401 for invalid token', async () => {
            // arrange
            const req = createMockRequest({}, { authorization: 'Bearer invalidtokentokentoken' });
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockRejectedValue(new Error('Invalid token'));

            // act
            await userController.getAllUsers(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        });
    });

    describe('Get user by ID', () => {
        it('should return user by id for authenticated user', async () => {
            // arrange
            const mockUser = { id: 1, username: 'user1', email: 'user1@mail.com', role: 'user' };

            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                { id: '1' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.getUserById.mockResolvedValue(mockUser as any);

            // act
            await userController.getUserById(req as any, res as any);

            // assert
            expect(mockedUserService.getUserById).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it('should return 404 for non-existing user', async () => {
            // arrange
            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                { id: '999' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.getUserById.mockResolvedValue(null);

            // act
            await userController.getUserById(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });

    describe('Get user by username/email', () => {
        it('should return user by username', async () => {
            // arrange
            const mockUser = { id: 1, username: 'username', email: 'email@mail.com', role: 'user' };

            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                {},
                { username: 'username' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.getUserByUsernameOrEmail.mockResolvedValue(mockUser as any);

            // act
            await userController.getUserByUsernameOrEmail(req as any, res as any);

            // assert
            expect(mockedUserService.getUserByUsernameOrEmail).toHaveBeenCalledWith('username');
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it('should return user by email', async () => {
            // arrange
            const mockUser = { id: 1, username: 'username', email: 'email@mail.com', role: 'user' };

            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                {},
                { email: 'email@mail.com' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.getUserByUsernameOrEmail.mockResolvedValue(mockUser as any);

            // act
            await userController.getUserByUsernameOrEmail(req as any, res as any);

            // assert
            expect(mockedUserService.getUserByUsernameOrEmail).toHaveBeenCalledWith('email@mail.com');
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it('should return 400 if no username or email provided', async () => {
            // arrange
            const req = createMockRequest({}, { authorization: 'Bearer tokentokentoken' }, {}, {});
            const res = createMockResponse();

            // act
            await userController.getUserByUsernameOrEmail(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Provide username or email' });
        });
    });

    describe('Update user', () => {
        it('should update user if user is owner', async () => {
            // arrange
            const updateData = { username: 'updateduser' };
            const updatedUser = { id: 1, username: 'updateduser', email: 'test@example.com', role: 'user' };

            const req = createMockRequest(
                updateData,
                { authorization: 'Bearer tokentokentoken' },
                { id: '1' }
            );
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(updateData as UpdateUserDto);
            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.updateUser.mockResolvedValue(updatedUser as any);

            // act
            await userController.updateUser(req as any, res as any);

            // assert
            expect(mockedValidateDto).toHaveBeenCalled();
            expect(mockedUserService.updateUser).toHaveBeenCalledWith(1, updateData);
            expect(res.json).toHaveBeenCalledWith(updatedUser);
        });

        it('should allow admin to update any user', async () => {
            // arrange
            const updateData = { role: 'admin' };
            const updatedUser = { id: 2, username: 'user2', email: 'user2@mail.com', role: 'admin' };

            const req = createMockRequest(
                updateData,
                { authorization: 'Bearer tokentokentoken' },
                { id: '2' }
            );
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(updateData as UpdateUserDto);
            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'ADMIN' });
            mockedUserService.updateUser.mockResolvedValue(updatedUser as any);

            // act
            await userController.updateUser(req as any, res as any);

            // assert
            expect(mockedUserService.updateUser).toHaveBeenCalledWith(2, updateData);
            expect(res.json).toHaveBeenCalledWith(updatedUser);
        });

        it('should return 403 if user is not owner and not admin', async () => {
            // arrange
            const updateData = { username: 'updatedusername' };

            const req = createMockRequest(
                updateData,
                { authorization: 'Bearer tokentokentoken' },
                { id: '2' }
            );
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(updateData as UpdateUserDto);
            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });

            // act
            await userController.updateUser(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
            expect(mockedUserService.updateUser).not.toHaveBeenCalled();
        });
    });

    describe('Delete user', () => {
        it('should delete user if user is owner', async () => {
            // arrabge
            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                { id: '1' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.deleteUser.mockResolvedValue({ affected: 1 } as any);

            // act
            await userController.deleteUser(req as any, res as any);

            // assert
            expect(mockedUserService.deleteUser).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
        });

        it('should return 404 for non-existing user when user is owner', async () => {
            // arrange
            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                { id: '1' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'user' });
            mockedUserService.deleteUser.mockResolvedValue({ affected: 0 } as any);

            // act
            await userController.deleteUser(req as any, res as any);

            // assert
            expect(mockedUserService.deleteUser).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should allow admin to delete any user', async () => {
            // arrange
            const req = createMockRequest(
                {},
                { authorization: 'Bearer tokentokentoken' },
                { id: '2' }
            );
            const res = createMockResponse();

            mockedAuthClient.verifyToken.mockResolvedValue({ id: 1, role: 'ADMIN' });
            mockedUserService.deleteUser.mockResolvedValue({ affected: 1 } as any);

            // act
            await userController.deleteUser(req as any, res as any);

            // assert
            expect(mockedUserService.deleteUser).toHaveBeenCalledWith(2);
            expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
        });
    });
});