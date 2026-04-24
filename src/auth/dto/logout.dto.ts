import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  sessionId: string;

  @IsBoolean()
  @IsOptional()
  allDevices?: boolean;
}
