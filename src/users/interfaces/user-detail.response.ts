export interface UserDetailResponseDto {
  codUser: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  countryCode: string;
  role: string;
  country: string;
  phone: string;
  userDepartments: UserDepartmentDetailResponse[]; // Objeto completo
}
export interface UserDepartmentDetailResponse {
  id: string;
  assignedAt: Date;
  department: {
    id: number;
    name: string;
    isActive: boolean;
  };
}
