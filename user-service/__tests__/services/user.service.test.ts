process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'username';
process.env.DB_PASSWORD = 'password';
process.env.DB_NAME = 'lab1db';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('../../src/config/database');

import { AppDataSource } from "../../src/config/database";
import { UserService } from "../../src/services/user.service";
import { UserEntity } from "../../src/models/user.entity";
import { RoleEnum } from "../../src/models/role.enum";
import { UpdateUserDto } from "../../src/dto/user.dto";

const mockedAppDataSource = jest.mocked(AppDataSource);

describe('User service', () => {
    let userService: UserService;
    let mockUserRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };

        mockedAppDataSource.getRepository.mockReturnValue(mockUserRepository);
        userService = new UserService();
    });

    describe('Get all users', () => {
        it('should return all users without passwords', async () => {
            // arrange
            const mockUsers: Partial<UserEntity>[] = [
                {
                    id: 1,
                    username: 'username1',
                    email: 'user1@mail.com',
                    role: RoleEnum.USER,
                    created_at: new Date('2025-09-25'),
                },
                {
                    id: 2,
                    username: 'username2',
                    email: 'user2@mail.com',
                    role: RoleEnum.ADMIN,
                    created_at: new Date('2025-09-26'),
                },
            ];

            mockUserRepository.find.mockResolvedValue(mockUsers);

            // act
            const result = await userService.getAllUsers();

            // assert
            expect(mockUserRepository.find).toHaveBeenCalledWith({
                select: ['id', 'username', 'email', 'role', 'created_at'],
            });
            expect(result).toEqual(mockUsers);
        });

        it('should return empty array when no users exist', async () => {
            // arrange
            mockUserRepository.find.mockResolvedValue([]);

            // act
            const result = await userService.getAllUsers();

            // assert
            expect(result).toEqual([]);
        });
    });

    describe('Get user by ID', () => {
        it('should return user by id without password', async () => {
            // arrange
            const userId = 1;
            const mockUser: Partial<UserEntity> = {
                id: userId,
                username: 'username',
                email: 'email@mail.com',
                role: RoleEnum.USER,
                created_at: new Date('2025-09-25'),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            // act
            const result = await userService.getUserById(userId);

            // assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId },
                select: ['id', 'username', 'email', 'role', 'created_at'],
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null for non-existing user', async () => {
            // arrange
            const userId = 999;
            mockUserRepository.findOne.mockResolvedValue(null);

            // act
            const result = await userService.getUserById(userId);

            // assert
            expect(result).toBeNull();
        });
    });

    describe('Get user by username/email', () => {
        it('should return user by username', async () => {
            // arrange
            const username = 'username';
            const mockUser: Partial<UserEntity> = {
                id: 1,
                username: username,
                email: 'email@mail.com',
                role: RoleEnum.USER,
                created_at: new Date('2025-09-25'),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            // act
            const result = await userService.getUserByUsernameOrEmail(username);

            // assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: [{ username }, { email: username }],
                select: ['id', 'username', 'email', 'role', 'created_at'],
            });
            expect(result).toEqual(mockUser);
        });

        it('should return user by email', async () => {
            // arrange
            const email = 'email@mail.com';
            const mockUser: Partial<UserEntity> = {
                id: 1,
                username: 'username',
                email: email,
                role: RoleEnum.USER,
                created_at: new Date('2025-09-25'),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            // act
            const result = await userService.getUserByUsernameOrEmail(email);

            // assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: [{ username: email }, { email }],
                select: ['id', 'username', 'email', 'role', 'created_at'],
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            // arrange
            const searchValue = 'nonexisting';
            mockUserRepository.findOne.mockResolvedValue(null);

            // act
            const result = await userService.getUserByUsernameOrEmail(searchValue);

            // assert
            expect(result).toBeNull();
        });
    });

    describe('Update user', () => {
        it('should update user successfully', async () => {
            // arrange
            const userId = 1;
            const updateData: UpdateUserDto = {
                username: 'updatedusername',
                email: 'updatedemail@mail.com',
            };

            const existingUser: UserEntity = {
                id: userId,
                username: 'username',
                email: 'email@mail.com',
                password: 'hashedpassword',
                role: RoleEnum.USER,
                created_at: new Date('2025-09-25'),
            } as UserEntity;

            const updatedUser = { ...existingUser, ...updateData };

            mockUserRepository.findOneBy.mockResolvedValue(existingUser);
            mockUserRepository.save.mockResolvedValue(updatedUser);

            // act
            const result = await userService.updateUser(userId, updateData);

            // assert
            expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
            expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
            expect(result).toEqual({
                id: userId,
                username: updateData.username,
                email: updateData.email,
                role: existingUser.role,
            });
        });

        it('should throw error for non-existing user', async () => {
            // arrange
            const userId = 999;
            const updateData: UpdateUserDto = { username: 'newuser' };

            mockUserRepository.findOneBy.mockResolvedValue(null);

            // ACT & ASSERT
            await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
                'User not found'
            );
        });
    });

    describe('Delete user', () => {
        it('should delete user successfully', async () => {
            // arrange
            const userId = 1;
            const deleteResult = { affected: 1, raw: {} };

            mockUserRepository.delete.mockResolvedValue(deleteResult);

            // act
            const result = await userService.deleteUser(userId);

            // assert
            expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
            expect(result).toEqual(deleteResult);
        });

        it('should return result with zero affected for non-existing user', async () => {
            // arrange
            const userId = 999;
            const deleteResult = { affected: 0, raw: {} };

            mockUserRepository.delete.mockResolvedValue(deleteResult);

            // act
            const result = await userService.deleteUser(userId);

            // assert
            expect(result.affected).toBe(0);
        });
    });
});