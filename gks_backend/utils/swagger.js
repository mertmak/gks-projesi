const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'GKS — Geçiş Kontrol Sistemi API',
            version: '1.0.0',
            description: 'Personel erişim kontrolü, vardiya yönetimi, puantaj ve raporlama API\'si.',
        },
        servers: [{ url: '/api', description: 'GKS API' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Login endpoint\'inden alınan JWT token\'ı girin.',
                },
            },
            schemas: {
                Pagination: {
                    type: 'object',
                    properties: {
                        page:       { type: 'integer', example: 1 },
                        limit:      { type: 'integer', example: 100 },
                        total:      { type: 'integer', example: 500 },
                        totalPages: { type: 'integer', example: 5 },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string',  example: 'Hata mesajı' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth',      description: 'Kimlik doğrulama ve hesap işlemleri' },
            { name: 'Personel',  description: 'Personel CRUD ve toplu işlemler' },
            { name: 'Kapılar',   description: 'Kapı yönetimi' },
            { name: 'Vardiyalar',description: 'Vardiya tanımları' },
            { name: 'İzinler',   description: 'İzin kayıtları' },
            { name: 'Mesailer',  description: 'Fazla mesai onay işlemleri' },
            { name: 'Raporlar',  description: 'Puantaj ve günlük devam raporu' },
            { name: 'Dashboard', description: 'Özet istatistikler ve loglar' },
        ],
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
