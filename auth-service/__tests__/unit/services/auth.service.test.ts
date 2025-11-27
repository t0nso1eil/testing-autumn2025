import { AppDataSource } from "../../../src/config/database";
import { AuthService } from "../../../src/services/auth.service";
import { UserEntity } from "../../../src/models/user.entity";
import { RoleEnum } from "../../../src/models/role.enum";
import * as bcrypt from 'bcryptjs';
import * as jwtUtils from '../../../src/utils/jwt';

jest.mock('../../../src/config/database');
jest.mock('bcryptjs');
jest.mock('../../../src/utils/jwt');

const mockedAppDataSource = jest.mocked(AppDataSource);
const mockedBcrypt = jest.mocked(bcrypt);
const mockedJwtUtils = jest.mocked(jwtUtils);

describe('Auth service', () => {
    let authService: AuthService;
    let mockUserRepository: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserRepository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };

        mockedAppDataSource.getRepository.mockReturnValue(mockUserRepository);
        authService = new AuthService();
    });

    describe('Register', () => {
        it('should successfully register new user', async () => {
            // arrange
            const registerData = {
                username: 'username',
                email: 'email@mail.com',
                password: 'password',
            };

            const hashedPassword = 'hashedpassword';
            const savedUser: UserEntity = {
                id: 1,
                username: registerData.username,
                email: registerData.email,
                password: hashedPassword,
                role: RoleEnum.USER,
                created_at: new Date('2025-09-25')
            } as UserEntity;

            mockUserRepository.findOne.mockResolvedValue(null);
            mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
            mockUserRepository.create.mockReturnValue(savedUser);
            mockUserRepository.save.mockResolvedValue(savedUser);

            // act
            const result = await authService.register(registerData);

            // assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: registerData.email }
            });
            expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                username: registerData.username,
                email: registerData.email,
                password: hashedPassword,
            });
            expect(mockUserRepository.save).toHaveBeenCalledWith(savedUser);
            expect(result).toEqual({
                id: savedUser.id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role,
            });
        });

        it('should throw error when user already exists', async () => {
            // arrange
            const registerData = {
                username: 'username',
                email: 'email@mail.com',
                password: 'pasword',
            };

            const existingUser = { id: 1, email: registerData.email };
            mockUserRepository.findOne.mockResolvedValue(existingUser);

            // act
            const registerPromise = authService.register(registerData);

            // assert
            await expect(registerPromise).rejects.toThrow('User already exists');
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: registerData.email }
            });
            expect(mockedBcrypt.hash).not.toHaveBeenCalled();
        });
    });

    describe('Login', () => {
        it('should successfully login user with valid credentials', async () => {
            // arrange
            const loginData = {
                email: 'email@mail.com',
                password: 'password',
            };

            const user: UserEntity = {
                id: 1,
                email: loginData.email,
                password: 'hashedpassword',
                username: 'username',
                role: RoleEnum.USER,
                created_at: new Date()
            } as UserEntity;

            const token = 'tokentokentoken';

            mockUserRepository.findOne.mockResolvedValue(user);
            mockedBcrypt.compare.mockResolvedValue(true as never);
            mockedJwtUtils.generateToken.mockReturnValue(token);

            // act
            const result = await authService.login(loginData);

            // assert
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: loginData.email }
            });
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, user.password);
            expect(mockedJwtUtils.generateToken).toHaveBeenCalledWith(user);
            expect(result).toEqual({ token });
        });

        it('should throw error for non-existing user', async () => {
            // arrange
            const loginData = {
                email: 'nonexisting@mail.com',
                password: 'password'
            };

            mockUserRepository.findOne.mockResolvedValue(null);

            // act
            const loginPromise = authService.login(loginData);

            // assert
            await expect(loginPromise).rejects.toThrow('Invalid credentials');
            expect(mockedBcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw error for invalid password', async () => {
            // arrange
            const loginData = {
                email: 'email@mail.com',
                password: 'wrongpassword'
            };

            const user: UserEntity = {
                id: 1,
                email: loginData.email,
                password: 'hashedpassword',
                username: 'username',
                role: RoleEnum.USER,
                created_at: new Date()
            } as UserEntity;

            mockUserRepository.findOne.mockResolvedValue(user);
            mockedBcrypt.compare.mockResolvedValue(false as never);

            // act
            const loginPromise = authService.login(loginData);

            // assert
            await expect(loginPromise).rejects.toThrow('Invalid credentials');
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, user.password);
        });
    });

    describe('Verify token', () => {
        it('should verify valid token and return user', async () => {
            // arrange
            const token = 'tokentokentoken';
            const payload = { id: 1, email: 'email@mail.com', role: RoleEnum.USER };
            const user = {
                id: 1,
                email: 'email@mail.com',
                role: RoleEnum.USER
            };

            mockedJwtUtils.verifyToken.mockReturnValue(payload);
            mockUserRepository.findOne.mockResolvedValue(user);

            // act
            const result = await authService.verifyToken(token);

            // assert
            expect(mockedJwtUtils.verifyToken).toHaveBeenCalledWith(token);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: payload.id },
                select: ['id', 'email', 'role']
            });
            expect(result).toEqual(user);
        });

        it('should throw error for invalid token', async () => {
            // arrange
            const token = 'invalidtoken';
            mockedJwtUtils.verifyToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            // act
            const verifyPromise = authService.verifyToken(token);

            // assert
            await expect(verifyPromise).rejects.toThrow('Invalid token');
            expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw error when user not found', async () => {
            // arrange
            const token = 'tokentokentoken';
            const payload = { id: 999, email: 'nonexisting@mail.com', role: RoleEnum.USER };

            mockedJwtUtils.verifyToken.mockReturnValue(payload);
            mockUserRepository.findOne.mockResolvedValue(null);

            // act
            const verifyPromise = authService.verifyToken(token);

            // assert
            await expect(verifyPromise).rejects.toThrow('User not found');
        });
    });
});