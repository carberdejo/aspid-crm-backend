import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule'; // Importar el decorador
import { ExchangeRateInterface } from './interfaces/exchange-rate.interfaces';

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly CACHE_KEY = 'TODAY_EXCHANGE_RATES';
  // Reemplaza esto con tu API Key real de ExchangeRate-API cuando la crees
  private readonly API_URL =
    'https://v6.exchangerate-api.com/v6/1442d4a05144b6a23cde0452/latest/USD';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Interfaz de NestJS: Se ejecuta automáticamente apenas levanta el servidor
  async onModuleInit() {
    this.logger.log(
      'Inicializando tasas de cambio al arrancar la aplicación...',
    );
    await this.updateRatesDaily();
  }

  // Este decorador le dice a NestJS que ejecute esto todos los días a la medianoche
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateRatesDaily() {
    try {
      this.logger.log(
        'Ejecutando Cron: Actualizando tasas desde ExchangeRate-API...',
      );

      // Hacemos la petición HTTP nativa a la API externa
      const response = await fetch(this.API_URL);

      if (!response.ok) {
        throw new Error(`Error en la API externa: ${response.statusText}`);
      }

      const data = (await response.json()) as ExchangeRateInterface;

      // Filtramos solo las monedas de LatAm que le interesan a Concar (PEN, MXN, CLP)
      // La API nos devuelve un objeto "conversion_rates" con base USD
      const rates = {
        USD: 1,
        PEN: data.conversion_rates.PEN || 3.8, // Fallbacks por si acaso
        MXN: data.conversion_rates.MXN || 16.5,
        CLP: data.conversion_rates.CLP || 940.0,
      };

      // Guardamos el objeto limpio en nuestra caché en RAM
      await this.cacheManager.set(this.CACHE_KEY, rates);

      this.logger.log('Caché de tasas de cambio actualizada con éxito.');
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
