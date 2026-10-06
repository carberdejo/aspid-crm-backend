import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { LoginUserDto, LogoutDto, RefreshTokenDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserSession } from 'src/users/entities';
import { Repository } from 'typeorm';
import { ApiException } from 'src/common/exceptions/api.exception';
import * as bcrypt from 'bcrypt';
import { JwtPayload, JwtTokens, RefreshTokenPayload } from './interfaces';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/users/interfaces';
import { ConfigService } from '@nestjs/config';
import { parseDurationToMs } from 'src/common/helpers/duration.helper';
import { extractClientIp } from 'src/common/helpers/ip.helper';

@Injectable()
export class AuthService {
  protected readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    private readonly configService: ConfigService,
  ) {}

  async login(loginUserDto: LoginUserDto, req: Request): Promise<JwtTokens> {
    const { email, password } = loginUserDto;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.password', // Seleccionamos explícitamente el password
        'user.codUser',
        'user.role',
      ])
      // Primer Join: de Usuario a sus relaciones de departamento
      .leftJoinAndSelect('user.userDepartments', 'userDept')
      // Segundo Join: de la relación al Departamento real para traer el nombre
      .leftJoinAndSelect('userDept.department', 'dept')
      .where('user.email = :email', { email })
      .getOne();

    // Validamos que el usuario exista
    if (!user)
      throw new ApiException(401, 'Credentials are not valid (email)', []);

    // Validamos que la contraseña sea correcta
    if (!bcrypt.compareSync(password, user.password))
      throw new ApiException(401, 'Credentials are not valid (password)', []);

    // Validamos que el usuario esté activo
    if (user.isActive === false)
      throw new ApiException(403, 'User account is inactive', []);

    //validamos y eliminamos si pasan maximo 5 sesiones activas
    const activeSessionsCount = await this.userSessionRepository.count({
      where: { userId: user.id },
    });
    if (activeSessionsCount >= 5) {
      // Eliminar la sesión más antigua
      const oldSession = await this.userSessionRepository.findOne({
        where: { userId: user.id },
        order: { expiresAt: 'ASC' }, // La sesión que expira primero es la más antigua
      });
      if (oldSession) await this.userSessionRepository.delete(oldSession.id);
    }

    const payload = {
      sub: user.id,
      codUser: user.codUser,
      email: user.email,
      role: user.role as Role,
      depts: user.userDepartments?.map((ud) => ud.department.id) || [],
    };

    const sessionId = uuidv4();
    const { accessToken, refreshToken } = this.getJwtTokens(payload, sessionId);

    const deviceInfo = this.generateDeviceInfo(req);
    const ipAddress = extractClientIp(req);

    const refreshTokenHash = bcrypt.hashSync(refreshToken, 10);
    const refreshExpiresInMs = parseDurationToMs(
      this.configService.get<string>('jwt.refreshExpiresIn')!,
    );

    await this.userSessionRepository.save({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: refreshTokenHash,
      deviceInfo: deviceInfo,
      ipAddress: ipAddress,
      expiresAt: new Date(Date.now() + refreshExpiresInMs),
    });
    this.logger.log(
      `User ${user.email} logged in. Session ID: ${sessionId}, Device: ${deviceInfo}, IP: ${ipAddress}`,
    );
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload: RefreshTokenPayload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get('jwt.refreshSecret'), // Usa un secreto distinto al del Access Token
        },
      );

      const session = await this.userSessionRepository.findOne({
        where: { id: payload.sessionId },
        relations: [
          'user',
          'user.userDepartments',
          'user.userDepartments.department',
        ],
      });

      // 3. Validaciones de seguridad
      if (!session) throw new UnauthorizedException('Session not found');
      // Verificar que la sesión no haya expirado
      console.log({ hora: new Date(), expiresAt: session.expiresAt });
      if (new Date() > session.expiresAt) {
        await this.userSessionRepository.delete(session.id);
        throw new UnauthorizedException('Session expired');
      }

      // 4. Verificar que el token enviado coincida con el hash guardado
      const isMatch = bcrypt.compareSync(
        refreshTokenDto.refreshToken,
        session.refreshTokenHash,
      );
      if (!isMatch) throw new ForbiddenException('Invalid token hash');

      // 5. Generar un NUEVO Access Token (y opcionalmente rotar el Refresh Token)
      const user = session.user;
      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          codUser: user.codUser,
          email: user.email,
          role: user.role,
          depts: user.userDepartments?.map((ud) => ud.department.id) || [],
        },
        { expiresIn: this.configService.get('jwt.accessExpiresIn') },
      );

      // 6. Actualizar la fecha de última actividad
      await this.userSessionRepository.update(session.id, {
        lastActive: new Date(),
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      this.logger.error('Invalid refresh token', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(logoutDto: LogoutDto, user: User) {
    // const currentUser = await this.userRepository.findOneBy({
    //   id: user.sub,
    // });

    // if (!currentUser || currentUser.isActive === false) {
    //   throw new ApiException(404, 'Usuario no encontrado o inactivo', []);
    // }
    // const data = { result: DeleteResult };

    const data = logoutDto.allDevices
      ? await this.userSessionRepository.delete({ userId: user.id })
      : await this.userSessionRepository.delete({
          id: logoutDto.sessionId,
          userId: user.id,
        });

    if (data.affected === 0) {
      throw new ApiException(
        404,
        'Sesión no encontrada o no pertenece al usuario',
        [],
      );
    }
    this.logger.log(
      `User ${user.email} logged out from session ${logoutDto.sessionId}`,
    );

    return {
      message: `Sesión cerrada exitosamente`,
    };
  }

  async profile(codUser: string, currentUser: User) {
    // Un usuario sin rol admin solo puede consultar su propio perfil y sesiones
    if (
      (currentUser.role as Role) !== Role.ADMIN &&
      currentUser.codUser !== codUser
    )
      throw new ForbiddenException('No tienes permisos para ver este perfil');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userDepartments', 'userDept')
      .leftJoinAndSelect('userDept.department', 'dept')
      // Traemos las sesiones mediante la relación de ID interna
      .leftJoinAndSelect('user.sessions', 'session')
      .where('user.codUser = :codUser', { codUser })
      // .orderBy('session.lastAccess', 'DESC') // Las más recientes primero
      .getOne();
    if (!user) throw new ApiException(404, 'Usuario no encontrado', []);

    return user;
  }

  private getJwtTokens(payload: JwtPayload, uuid: string) {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.accessExpiresIn'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, sessionId: uuid },
      {
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        secret: this.configService.get('jwt.refreshSecret'), // Usa un secreto distinto al del Access Token
      },
    );
    return { accessToken, refreshToken };
  }

  generateDeviceInfo(req: Request) {
    const parser = new UAParser(req.headers['user-agent']);
    const ua = parser.getResult();
    const deviceInfo = `${ua.browser.name || 'Unknown'} en ${ua.os.name || 'Unknown'} (${ua.device.model || 'PC'})`;
    return deviceInfo;
  }
}
