import { User } from '../entities/user.entity';
import {
  UserDetailResponseDto,
  UserListResponseDto,
  Role,
} from '../interfaces';

export class UserMapper {
  static toListResponse(user: User): UserListResponseDto {
    return {
      codUser: user.codUser,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role as Role,
      isActive: user.isActive,
      countryCode: user.countryCode,
      phone: user.phone,
      // Simplificamos los nombres de departamentos para la tabla
      departments: user.userDepartments?.map((ud) => ud.department.name) || [],
    };
  }

  static toDetailResponse(user: User): UserDetailResponseDto {
    return {
      codUser: user.codUser,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
      country: user.country,
      countryCode: user.countryCode,
      phone: user.phone,
      userDepartments: user.userDepartments.map((ud) => ({
        id: ud.id.toString(),
        assignedAt: ud.assignedAt,
        department: {
          id: ud.department.id,
          name: ud.department.name,
          isActive: ud.department.isActive,
        },
      })),
    };
  }

  static toManyListResponse(users: User[]): UserListResponseDto[] {
    return users.map((user) => this.toListResponse(user));
  }
}
