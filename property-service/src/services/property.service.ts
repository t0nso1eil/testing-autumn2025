import { AppDataSource } from "../config/database";
import { Property } from "../models/property.entity";
import { CreatePropertyDto, UpdatePropertyDto, SearchPropertyDto } from "../dto/property.dto";
import userClient from "./user.client";
import { Request } from 'express';
import { validate } from "class-validator";

export class PropertyService {
    private propertyRepository = AppDataSource.getRepository(Property);

    async getAllProperties(req?: Request) {
        const properties = await this.propertyRepository.find();
        return this.enrichPropertiesWithOwner(properties, req);
    }

    async getPropertyById(id: number, req?: Request) {
        const property = await this.propertyRepository.findOneBy({ id });
        if (!property) {
            throw new Error("Property not found");
        }
        return this.enrichPropertyWithOwner(property, req);
    }

    async createProperty(dto: CreatePropertyDto, userId: number, req: Request) {
        if (!req.headers.authorization) {
            throw new Error('Authorization header is required');
        }

        const validationErrors = await validate(dto as any);
        if (validationErrors.length > 0) {
            const errorMessages = validationErrors.map(error => Object.values(error.constraints || {})).flat();
            throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
        }

        await userClient.getUserById(userId, req.headers.authorization);

        const property = this.propertyRepository.create({
            ...dto,
            ownerId: userId,
            price: typeof dto.price === 'string' ? parseFloat(dto.price) : dto.price
        });

        await this.propertyRepository.save(property);
        return this.getPropertyById(property.id, req);
    }

    async updateProperty(id: number, dto: UpdatePropertyDto, userId: number, role: string, req?: Request) {
        const property = await this.propertyRepository.findOneBy({ id });
        if (!property) {
            throw new Error("Property not found");
        }

        if (property.ownerId !== userId && role !== 'admin') {
            throw new Error("Forbidden");
        }

        const validationErrors = await validate(dto as any);
        if (validationErrors.length > 0) {
            const errorMessages = validationErrors.map(error => Object.values(error.constraints || {})).flat();
            throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
        }

        if (dto.price && typeof dto.price === 'string') {
            dto.price = parseFloat(dto.price);
        }

        Object.assign(property, dto);
        await this.propertyRepository.save(property);
        return this.enrichPropertyWithOwner(property, req);
    }

    async deleteProperty(id: number, userId: number, role: string) {
        const property = await this.propertyRepository.findOneBy({ id });
        if (!property) {
            throw new Error("Property not found");
        }

        if (property.ownerId !== userId && role !== 'admin') {
            throw new Error("Forbidden");
        }

        await this.propertyRepository.remove(property);
        return { message: "Property deleted successfully" };
    }

    async searchProperties(dto: SearchPropertyDto, req?: Request) {
        const qb = this.propertyRepository.createQueryBuilder("property");

        console.log('Search filters:', dto);

        if (dto.location) {
            qb.andWhere("property.location ILIKE :location", { location: `%${dto.location}%` });
        }

        if (dto.minPrice !== undefined && dto.minPrice !== null) {
            qb.andWhere("property.price >= :minPrice", { minPrice: Number(dto.minPrice) });
        }

        if (dto.maxPrice !== undefined && dto.maxPrice !== null) {
            qb.andWhere("property.price <= :maxPrice", { maxPrice: Number(dto.maxPrice) });
        }

        if (dto.propertyType) {
            qb.andWhere("property.propertyType = :propertyType", { propertyType: dto.propertyType });
        }

        if (dto.rentalType) {
            qb.andWhere("property.rentalType = :rentalType", { rentalType: dto.rentalType });
        }

        const sql = qb.getSql();
        console.log('SQL Query:', sql);

        const properties = await qb.getMany();
        console.log('Found properties:', properties.length);

        return this.enrichPropertiesWithOwner(properties, req);
    }

    private async enrichPropertyWithOwner(property: Property, req?: Request) {
        try {
            const token = req?.headers.authorization;
            if (!token) {
                console.warn('No authorization token available for owner enrichment');
                return property;
            }

            const owner = await userClient.getUserById(property.ownerId, token);
            return { ...property, owner };
        } catch (error) {
            console.error('Failed to fetch owner:', error);
            return property;
        }
    }

    private async enrichPropertiesWithOwner(properties: Property[], req?: Request) {
        if (!req || !req.headers.authorization) {
            console.warn('No authorization token available for owner enrichment');
            return properties;
        }

        return Promise.all(
            properties.map(async property => {
                try {
                    const owner = await userClient.getUserById(property.ownerId, req.headers.authorization!);
                    return { ...property, owner };
                } catch (error) {
                    console.error(`Failed to fetch owner for property ${property.id}:`, error);
                    return property;
                }
            })
        );
    }
}

export default new PropertyService();