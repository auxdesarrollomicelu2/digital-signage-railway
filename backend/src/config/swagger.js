const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Signage API',
      version: '1.0.0',
      description: 'API para gestión de pantallas digitales - Sistema multi-tenant',
      contact: {
        name: 'Versat Team',
        email: 'juan.garcia@versat.ai',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Servidor de producción',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /api/auth/login',
        },
      },
      schemas: {
        Company: {
          type: 'object',
          required: ['name', 'username', 'password', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la empresa',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Nombre de la empresa',
              example: 'Acme Corporation',
            },
            username: {
              type: 'string',
              description: 'Usuario para login',
              example: 'acme-admin',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña (hasheada en BD)',
              example: 'SecurePass123!',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email de contacto',
              example: 'admin@acme.com',
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'owner'],
              description: 'Rol de la empresa',
              example: 'owner',
            },
            document_type: {
              type: 'string',
              description: 'Tipo de documento (NIT, CC, etc)',
              example: 'NIT',
            },
            document: {
              type: 'string',
              description: 'Número de documento',
              example: '900123456-7',
            },
            phone: {
              type: 'string',
              description: 'Teléfono de contacto',
              example: '+57 300 123 4567',
            },
            active: {
              type: 'boolean',
              description: 'Estado de la empresa',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
            },
          },
        },
        Venue: {
          type: 'object',
          required: ['name', 'company_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la sede',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Nombre de la sede',
              example: 'Sede Centro',
            },
            address: {
              type: 'string',
              description: 'Dirección de la sede',
              example: 'Calle 123 #45-67, Bogotá',
            },
            description: {
              type: 'string',
              description: 'Descripción de la sede',
              example: 'Sede principal en el centro de la ciudad',
            },
            company_id: {
              type: 'integer',
              description: 'ID de la empresa propietaria',
              example: 2,
            },
            screenCount: {
              type: 'integer',
              description: 'Número de pantallas en esta sede',
              example: 5,
            },
            Company: {
              type: 'object',
              description: 'Datos de la empresa propietaria',
              properties: {
                id: {
                  type: 'integer',
                  example: 2,
                },
                name: {
                  type: 'string',
                  example: 'Acme Corporation',
                },
                username: {
                  type: 'string',
                  example: 'acme-admin',
                },
              },
            },
            Screens: {
              type: 'array',
              description: 'Pantallas asociadas a esta sede',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    example: 1,
                  },
                  name: {
                    type: 'string',
                    example: 'Pantalla Recepción',
                  },
                  status: {
                    type: 'string',
                    enum: ['online', 'offline'],
                    example: 'online',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
            },
          },
        },
        Media: {
          type: 'object',
          required: ['filename', 'original_name', 'url', 'company_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del archivo',
              example: 1,
            },
            filename: {
              type: 'string',
              description: 'Nombre del archivo en el servidor',
              example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4',
            },
            original_name: {
              type: 'string',
              description: 'Nombre original del archivo',
              example: 'video_promocional.mp4',
            },
            url: {
              type: 'string',
              description: 'URL del archivo',
              example: '/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4',
            },
            cloudflare_key: {
              type: 'string',
              nullable: true,
              description: 'Clave para Cloudflare R2 (futuro)',
              example: null,
            },
            mime_type: {
              type: 'string',
              description: 'Tipo MIME del archivo',
              example: 'video/mp4',
            },
            size: {
              type: 'integer',
              description: 'Tamaño del archivo en bytes',
              example: 10485760,
            },
            company_id: {
              type: 'integer',
              description: 'ID de la empresa propietaria',
              example: 2,
            },
            Company: {
              type: 'object',
              description: 'Datos de la empresa propietaria',
              properties: {
                id: {
                  type: 'integer',
                  example: 2,
                },
                name: {
                  type: 'string',
                  example: 'Acme Corporation',
                },
                username: {
                  type: 'string',
                  example: 'acme-admin',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de subida',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
            },
          },
        },
        Screen: {
          type: 'object',
          required: ['name', 'device_id', 'venue_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la pantalla',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Nombre de la pantalla',
              example: 'Pantalla Recepción',
            },
            device_id: {
              type: 'string',
              description: 'ID único del dispositivo físico',
              example: 'SCREEN-001',
            },
            venue_id: {
              type: 'integer',
              description: 'ID de la sede donde está instalada',
              example: 1,
            },
            orientation: {
              type: 'string',
              enum: ['landscape', 'portrait'],
              description: 'Orientación de la pantalla',
              example: 'landscape',
            },
            status: {
              type: 'string',
              enum: ['online', 'offline'],
              description: 'Estado de conexión',
              example: 'online',
            },
            last_heartbeat: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Última vez que la pantalla reportó estar viva',
            },
            Venue: {
              type: 'object',
              description: 'Sede donde está instalada',
              properties: {
                id: {
                  type: 'integer',
                  example: 1,
                },
                name: {
                  type: 'string',
                  example: 'Sede Centro',
                },
                company_id: {
                  type: 'integer',
                  example: 2,
                },
                Company: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer',
                      example: 2,
                    },
                    name: {
                      type: 'string',
                      example: 'Acme Corporation',
                    },
                  },
                },
              },
            },
            ScreenMedia: {
              type: 'array',
              description: 'Playlist de la pantalla',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    example: 1,
                  },
                  screen_id: {
                    type: 'integer',
                    example: 1,
                  },
                  media_id: {
                    type: 'integer',
                    example: 1,
                  },
                  duration: {
                    type: 'integer',
                    description: 'Duración en segundos',
                    example: 10,
                  },
                  position: {
                    type: 'integer',
                    description: 'Orden en la playlist',
                    example: 0,
                  },
                  Media: {
                    $ref: '#/components/schemas/Media',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'Descripción del error',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operación exitosa',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Archivos donde están las anotaciones de Swagger
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
