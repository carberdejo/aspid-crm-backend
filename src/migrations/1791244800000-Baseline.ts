import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Línea base: estado del esquema al 2026-10-06, antes de usar migraciones.
 * Mismo SQL que aspid-crm-database/schema/baseline.sql (verificado contra un pg_dump).
 *
 * - Base NUEVA: crea el esquema completo.
 * - Base EXISTENTE (creada con los scripts antiguos): no hace nada; solo queda
 *   registrada para que corran las migraciones posteriores.
 *
 * No modificar: cualquier cambio de esquema va en una migración nueva.
 */
export class Baseline1791244800000 implements MigrationInterface {
  name = 'Baseline1791244800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = process.env.POSTGRES_SCHEMA || 'concar1';

    const [{ exists }] = (await queryRunner.query(
      `SELECT to_regclass('${s}."user"') IS NOT NULL AS exists`,
    )) as { exists: boolean }[];
    if (exists) return; // Base existente: el esquema ya está creado

    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS ${s};

      CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid() para user_session

      CREATE TYPE ${s}.quote_currency_enum AS ENUM ('PEN', 'USD', 'CLP', 'MXN');

      -- ---------------------------------------------------------------------
      -- 1. TABLAS MAESTRAS
      -- ---------------------------------------------------------------------

      CREATE TABLE ${s}.department (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          name varchar(100) NOT NULL,
          is_active boolean DEFAULT true,
          CONSTRAINT department_pk PRIMARY KEY (id),
          CONSTRAINT department_name_unique UNIQUE (name)
      );

      CREATE TABLE ${s}."user" (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          cod_user varchar(50) NOT NULL,
          first_name varchar(100) NOT NULL,
          last_name varchar(100) NOT NULL,
          email varchar(100) NOT NULL,
          password varchar(255) NOT NULL,
          is_active boolean DEFAULT true,
          role varchar(50) NOT NULL,
          country varchar(100),
          phone varchar(20) NOT NULL,
          country_code varchar(5),
          CONSTRAINT user_pk PRIMARY KEY (id),
          CONSTRAINT user_email_unique UNIQUE (email),
          CONSTRAINT user_cod_unique UNIQUE (cod_user)
      );

      CREATE TABLE ${s}.industry_segment (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          code varchar(20) NOT NULL,   -- Ej: 'AC', 'MI', 'AG'
          name varchar(100) NOT NULL,  -- Ej: 'Acería', 'Minería'
          is_active boolean DEFAULT true,
          CONSTRAINT industry_segment_pk PRIMARY KEY (id),
          CONSTRAINT industry_segment_code_unique UNIQUE (code)
      );

      CREATE TABLE ${s}.portfolio (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          code varchar(20) NOT NULL,   -- Ej: 'C1', 'C2'
          type varchar(50) NOT NULL,   -- Ej: 'INDUSTRIAL', 'DISTRIBUIDOR', 'DIDACTICA'
          province varchar(100),
          zone varchar(50),            -- Ej: 'NORTE', 'SUR', 'ESTE'
          is_active boolean DEFAULT true,
          CONSTRAINT portfolio_pk PRIMARY KEY (id),
          CONSTRAINT portfolio_code_unique UNIQUE (code)
      );

      -- ---------------------------------------------------------------------
      -- 2. CLIENTES Y ASIGNACIONES
      -- ---------------------------------------------------------------------

      CREATE TABLE ${s}.client (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          commercial_name varchar(100) NOT NULL,
          business_name varchar(100) NOT NULL,
          ruc varchar(20) NOT NULL,
          address varchar(255) NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          segment_id bigint,
          portfolio_id bigint,
          district varchar(100),
          zone varchar(100),
          province varchar(100),
          CONSTRAINT client_pk PRIMARY KEY (id),
          CONSTRAINT client_ruc_unique UNIQUE (ruc),
          CONSTRAINT fk_client_industry_segment FOREIGN KEY (segment_id) REFERENCES ${s}.industry_segment (id),
          CONSTRAINT fk_client_portfolio FOREIGN KEY (portfolio_id) REFERENCES ${s}.portfolio (id)
      );

      CREATE TABLE ${s}.contact_client (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          first_name varchar(100) NOT NULL,
          last_name varchar(100) NOT NULL,
          position varchar(100) NOT NULL,
          phone varchar(20) NOT NULL,
          client_id bigint NOT NULL,
          email varchar(100),
          country_code varchar(5),
          CONSTRAINT contact_client_pk PRIMARY KEY (id),
          CONSTRAINT fk_contact_client_client FOREIGN KEY (client_id) REFERENCES ${s}.client (id) ON DELETE CASCADE
      );

      CREATE TABLE ${s}.user_departments (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          user_id bigint NOT NULL,
          department_id bigint NOT NULL,
          assigned_at timestamp DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT user_departments_pk PRIMARY KEY (id),
          CONSTRAINT fk_user_dept_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id) ON DELETE CASCADE,
          CONSTRAINT fk_user_dept_dept FOREIGN KEY (department_id) REFERENCES ${s}.department (id) ON DELETE CASCADE
      );

      CREATE TABLE ${s}.portfolio_users (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          portfolio_id bigint NOT NULL,
          user_id bigint NOT NULL,
          role_in_portfolio varchar(50) NOT NULL, -- Ej: 'RESPONSABLE', 'ING_PROYECTOS', 'SERVICIOS'
          assigned_at timestamp DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT portfolio_users_pk PRIMARY KEY (id),
          CONSTRAINT fk_pu_portfolio FOREIGN KEY (portfolio_id) REFERENCES ${s}.portfolio (id) ON DELETE CASCADE,
          CONSTRAINT fk_pu_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id) ON DELETE CASCADE,
          CONSTRAINT portfolio_user_unique UNIQUE (portfolio_id, user_id, role_in_portfolio)
      );

      CREATE TABLE ${s}.user_client_exception (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          user_id bigint NOT NULL,
          client_id bigint NOT NULL,
          granted_at date DEFAULT CURRENT_DATE,
          notes varchar(255), -- Justificación del acceso fuera de cartera
          is_active boolean DEFAULT true,
          revoked_at timestamp,
          CONSTRAINT user_client_exception_pk PRIMARY KEY (id),
          CONSTRAINT fk_uce_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id) ON DELETE CASCADE,
          CONSTRAINT fk_uce_client FOREIGN KEY (client_id) REFERENCES ${s}.client (id) ON DELETE CASCADE,
          CONSTRAINT user_client_exception_unique UNIQUE (user_id, client_id)
      );

      -- ---------------------------------------------------------------------
      -- 3. ACTIVIDADES COMERCIALES
      -- ---------------------------------------------------------------------

      CREATE TABLE ${s}.quote (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          quote_number varchar(50),
          client_id bigint NOT NULL,
          user_id bigint NOT NULL,
          contact_id bigint NOT NULL,
          department_id bigint NOT NULL,
          amount decimal(12,2) NOT NULL,
          status varchar(50) DEFAULT 'PENDIENTE',
          status_reason text,
          description text,
          type varchar(50),
          order_type varchar(50),
          collaborator_id bigint,
          created_at date DEFAULT CURRENT_TIMESTAMP,
          updated_at date DEFAULT CURRENT_TIMESTAMP,
          currency ${s}.quote_currency_enum DEFAULT 'USD',
          CONSTRAINT quote_pk PRIMARY KEY (id),
          CONSTRAINT quote_number_unique UNIQUE (quote_number),
          CONSTRAINT fk_quote_client FOREIGN KEY (client_id) REFERENCES ${s}.client (id),
          CONSTRAINT fk_quote_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id),
          CONSTRAINT fk_quote_contact FOREIGN KEY (contact_id) REFERENCES ${s}.contact_client (id),
          CONSTRAINT fk_quote_department FOREIGN KEY (department_id) REFERENCES ${s}.department (id)
      );

      CREATE TABLE ${s}.purchase_order (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          po_number varchar(100) NOT NULL,
          received_at date,
          quote_id bigint NOT NULL,
          billing_status varchar(50) DEFAULT 'PENDIENTE_FACTURACION',
          currency ${s}.quote_currency_enum DEFAULT 'USD',
          amount decimal(12,2),
          CONSTRAINT purchase_order_pk PRIMARY KEY (id),
          CONSTRAINT uk_po_number UNIQUE (po_number),
          CONSTRAINT fk_po_quote FOREIGN KEY (quote_id) REFERENCES ${s}.quote (id)
      );

      CREATE TABLE ${s}.invoice (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          order_id bigint NOT NULL,
          issue_date date DEFAULT CURRENT_DATE,
          invoice_number varchar(100) NOT NULL,
          amount decimal(12,2) NOT NULL,
          currency ${s}.quote_currency_enum DEFAULT 'USD',
          CONSTRAINT invoice_pk PRIMARY KEY (id),
          CONSTRAINT uk_invoice_number UNIQUE (invoice_number),
          CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES ${s}.purchase_order (id)
      );

      CREATE TABLE ${s}.visit (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          user_id bigint NOT NULL,
          client_id bigint NOT NULL,
          contact_id bigint,
          department_id bigint NOT NULL,
          date date NOT NULL,
          visit_topics text,
          outcome_summary text,
          CONSTRAINT visit_pk PRIMARY KEY (id),
          CONSTRAINT fk_visit_client FOREIGN KEY (client_id) REFERENCES ${s}.client (id),
          CONSTRAINT fk_visit_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id),
          CONSTRAINT fk_visit_contact FOREIGN KEY (contact_id) REFERENCES ${s}.contact_client (id),
          CONSTRAINT fk_visit_department FOREIGN KEY (department_id) REFERENCES ${s}.department (id)
      );

      CREATE TABLE ${s}.deliveries (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          client_id bigint,
          user_id bigint NOT NULL,
          delivery_date date DEFAULT CURRENT_DATE,
          delivery_items jsonb DEFAULT '[]', -- [{ descripción, cantidad }]
          created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT deliveries_pk PRIMARY KEY (id),
          CONSTRAINT fk_client_deliveries FOREIGN KEY (client_id) REFERENCES ${s}.client (id),
          CONSTRAINT fk_user_deliveries FOREIGN KEY (user_id) REFERENCES ${s}."user" (id)
      );

      -- ---------------------------------------------------------------------
      -- 4. SESIONES Y NOTIFICACIONES
      -- ---------------------------------------------------------------------

      CREATE TABLE ${s}.user_session (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          user_id bigint NOT NULL,
          refresh_token_hash varchar(255) NOT NULL,
          device_info varchar(255),
          ip_address varchar(45),
          last_active timestamp DEFAULT CURRENT_TIMESTAMP,
          expires_at timestamp NOT NULL,
          CONSTRAINT user_session_pkey PRIMARY KEY (id),
          CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id) ON DELETE CASCADE
      );

      CREATE TABLE ${s}.notification (
          id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
          message text NOT NULL,
          is_read boolean DEFAULT false,
          type varchar(50) NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          user_id bigint NOT NULL,
          CONSTRAINT notification_pk PRIMARY KEY (id),
          CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES ${s}."user" (id)
      );

      -- ---------------------------------------------------------------------
      -- 5. ÍNDICES
      -- ---------------------------------------------------------------------

      CREATE INDEX idx_client_comercial_name ON ${s}.client (commercial_name);
      CREATE INDEX idx_client_ruc ON ${s}.client (ruc);
      CREATE INDEX idx_client_segment ON ${s}.client (segment_id);
      CREATE INDEX idx_client_portfolio ON ${s}.client (portfolio_id);
      CREATE INDEX idx_department_name ON ${s}.department (name);
      CREATE INDEX idx_user_cod_user ON ${s}."user" (cod_user);
      CREATE INDEX idx_user_email ON ${s}."user" (email);
      CREATE INDEX idx_pu_user ON ${s}.portfolio_users (user_id);
      CREATE INDEX idx_pu_portfolio ON ${s}.portfolio_users (portfolio_id);
      CREATE INDEX idx_uce_user ON ${s}.user_client_exception (user_id);
      CREATE INDEX idx_uce_client ON ${s}.user_client_exception (client_id);
      CREATE INDEX idx_quote_number ON ${s}.quote (quote_number);
      CREATE INDEX idx_quote_status ON ${s}.quote (status);
      CREATE INDEX idx_quote_department ON ${s}.quote (department_id);
      CREATE INDEX idx_po_number ON ${s}.purchase_order (po_number);
      CREATE INDEX idx_po_billing_status ON ${s}.purchase_order (billing_status);
      CREATE INDEX idx_invoice_number ON ${s}.invoice (invoice_number);
      CREATE INDEX idx_invoice_order_id ON ${s}.invoice (order_id);
      CREATE INDEX idx_visit_date ON ${s}.visit (date);
      CREATE INDEX idx_visit_department ON ${s}.visit (department_id);
      CREATE INDEX idx_deliveries_client_id ON ${s}.deliveries (client_id);
      CREATE INDEX idx_deliveries_user_id ON ${s}.deliveries (user_id);
      CREATE INDEX idx_deliveries_items_gin ON ${s}.deliveries USING gin (delivery_items);
      CREATE INDEX idx_user_session_user_id ON ${s}.user_session (user_id);
      CREATE INDEX idx_user_session_refresh_token ON ${s}.user_session (refresh_token_hash);

      -- ---------------------------------------------------------------------
      -- 6. CATÁLOGO: SEGMENTOS INDUSTRIALES (parte del historial original)
      -- ---------------------------------------------------------------------

      INSERT INTO ${s}.industry_segment (code, name) VALUES
      ('AC', 'Acería'),
      ('AG', 'Agroindustria'),
      ('AB', 'Alimento Balanceado'),
      ('F&B', 'Alimentos y bebidas'),
      ('CM', 'Cemento'),
      ('CE', 'Cerámicas'),
      ('DI', 'Didactica'),
      ('DRL', 'Drilling'),
      ('EX', 'Explosivos'),
      ('FM', 'Fabricante de Máquinas'),
      ('FA', 'Farma'),
      ('GE', 'Generación de energía'),
      ('MI', 'Minería'),
      ('MV', 'Movimiento de tierras'),
      ('OT', 'Otros'),
      ('PLT', 'Plastico'),
      ('P&A', 'Puertos y aeropuertos'),
      ('PPQR', 'Pulpa, papel, químicas, refinerías'),
      ('RE', 'Revendedores'),
      ('TX', 'Textil');
    `);
  }

  public down(): Promise<void> {
    // Revertir la línea base implicaría borrar todo el esquema y sus datos
    throw new Error(
      'La migración Baseline no se puede revertir. Para empezar de cero, elimina el esquema manualmente.',
    );
  }
}
