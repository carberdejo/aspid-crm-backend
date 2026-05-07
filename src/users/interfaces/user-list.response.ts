import { Role } from './role.interface';

export interface UserListResponseDto {
  codUser: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: Role;
  departments: string[]; // Solo nombres
  countryCode: string;
  phone: string;
}
