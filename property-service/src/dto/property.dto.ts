import { IsNotEmpty, IsNumber, IsPositive, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { PropertyType } from '../models/property-type.enum';
import { RentalType } from '../models/rental-type.enum';
import { Transform } from 'class-transformer';

export class CreatePropertyDto {
    @IsNotEmpty({ message: 'Title is required' })
    @IsString()
    title!: string;

    @IsNotEmpty({ message: 'Description is required' })
    @IsString()
    description!: string;

    @IsEnum(RentalType, { message: 'Invalid rental type' })
    rentalType!: RentalType;

    @IsNumber({}, { message: 'Price must be a number' })
    @IsPositive({ message: 'Price must be positive' })
    @Min(1, { message: 'Price must be at least 1' })
    price!: number;

    @IsNotEmpty({ message: 'Location is required' })
    @IsString()
    location!: string;

    @IsEnum(PropertyType, { message: 'Invalid property type' })
    propertyType!: PropertyType;
}

export class UpdatePropertyDto {
    @IsOptional()
    @IsNotEmpty({ message: 'Title cannot be empty' })
    @IsString()
    title?: string;

    @IsOptional()
    @IsNotEmpty({ message: 'Description cannot be empty' })
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(RentalType, { message: 'Invalid rental type' })
    rentalType?: RentalType;

    @IsOptional()
    @IsNumber({}, { message: 'Price must be a number' })
    @IsPositive({ message: 'Price must be positive' })
    @Min(1, { message: 'Price must be at least 1' })
    price?: number;

    @IsOptional()
    @IsNotEmpty({ message: 'Location cannot be empty' })
    @IsString()
    location?: string;

    @IsOptional()
    @IsEnum(PropertyType, { message: 'Invalid property type' })
    propertyType?: PropertyType;
}

export class SearchPropertyDto {
    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    @IsNumber({}, { message: 'Min price must be a number' })
    @Min(0, { message: 'Min price cannot be negative' })
    minPrice?: number;

    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : Number(value))
    @IsNumber({}, { message: 'Max price must be a number' })
    @Min(0, { message: 'Max price cannot be negative' })
    maxPrice?: number;

    @IsOptional()
    @IsString()
    propertyType?: string;

    @IsOptional()
    @IsString()
    rentalType?: string;
}