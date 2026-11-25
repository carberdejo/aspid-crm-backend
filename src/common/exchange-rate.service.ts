import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule'; // Importar el decorador
import { ExchangeRateInterface } from './interfaces/exchange-rate.interfaces';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly CACHE_KEY = 'TODAY_EXCHANGE_RATES';
  // Reemplaza esto con tu API Key real de ExchangeRate-API cuando la crees

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  // Interfaz de NestJS: Se ejecuta automáticamente apenas levanta el servidor
  async onModuleInit() {
    this.logger.log('Inicializando tasas de cambio...');
    await this.updateRatesDaily();
  }

  // Este decorador le dice a NestJS que ejecute esto todos los días a la medianoche
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateRatesDaily() {
    try {
      this.logger.log(
        'Ejecutando Cron: Actualizando tasas desde ExchangeRate-API...',
      );

      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (isDevelopment) {
        this.logger.log(
          '🛠️ Entorno DEV detectado. Usando Mock de tasas de cambio (Sin consumo de API).',
        );

        const mockRates = {
          USD: 1,
          PEN: 3.41, // Puedes poner números cerrados aquí para que probar cálculos sea más fácil
          MXN: 17.0,
          CLP: 950.0,
        };

        await this.cacheManager.set(this.CACHE_KEY, mockRates);
        return mockRates;
      }

      this.logger.log(
        'Entorno PROD. Actualizando tasas desde ExchangeRate-API...',
      );
      const apiKey = this.configService.get<string>('exchangeRate.apiKey');
      const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Error en la API externa: ${response.statusText}`);
      }

      const data = (await response.json()) as ExchangeRateInterface;

      // Filtramos solo las monedas de LatAm que le interesan a ASPID (PEN, MXN, CLP)
      // La API nos devuelve un objeto "conversion_rates" con base USD
      const rates = {
        USD: 1,
        PEN: data.conversion_rates.PEN || 3.8, // Fallbacks por si acaso
        MXN: data.conversion_rates.MXN || 16.5,
        CLP: data.conversion_rates.CLP || 940.0,
      };

      // Guardamos el objeto limpio en nuestra caché en RAM
      await this.cacheManager.set(this.CACHE_KEY, rates);
      return rates;
    } catch (error) {
      this.logger.error(
        'Error al actualizar las tasas en el Cron. Se mantendrá la data previa en caché.',
        error.message,
      );

      // Retornar un fallback para que la app no rompa si es la primera vez que inicia y la API está caída
      return { USD: 1, PEN: 3.8, MXN: 16.5, CLP: 940.0 };
    }
  }

  // El método rápido que consumirá tu Dashboard de Cotizaciones
  async getRates(): Promise<Record<string, number>> {
    let rates = await this.cacheManager.get<Record<string, number>>(
      this.CACHE_KEY,
    );

    if (!rates) {
      this.logger.warn(
        'La caché expiró o está vacía inesperadamente. Forzando actualización manual...',
      );
      rates = await this.updateRatesDaily();
    }

    return rates;
  }
}
