import { validate } from 'class-validator';
import { UpdateUserDto } from "../../../src/dto/user.dto";
import { RoleEnum } from "../../../src/models/role.enum";

describe('User DTO', () => {
    it('should validate correct update data', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.username = 'username';
        dto.email = 'email@mail.com';
        dto.role = RoleEnum.ADMIN;

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(0);
    });

    it('should validate when only username is provided', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.username = 'username';

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(0);
    });

    it('should validate when only email is provided', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.email = 'email@mail.com';

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(0);
    });

    it('should validate when only role is provided', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.role = RoleEnum.USER;

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(0);
    });

    it('should fail validation when email is invalid', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.email = 'invalidemail';

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(1);
        expect(errors[0].property).toBe('email');
    });

    it('should fail validation when username is empty string', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.username = '';

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'username')).toBe(true);
    });

    it('should fail validation when username is too long', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.username = 'a'.repeat(101);

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'username')).toBe(true);
    });

    it('should fail validation when role is invalid', async () => {
        // arrange
        const dto = new UpdateUserDto();
        dto.role = 'INAVLIDROLE' as any;

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(1);
        expect(errors[0].property).toBe('role');
    });

    it('should validate empty dto', async () => {
        // arrange
        const dto = new UpdateUserDto();

        // act
        const errors = await validate(dto);

        // assert
        expect(errors.length).toBe(0);
    });
});