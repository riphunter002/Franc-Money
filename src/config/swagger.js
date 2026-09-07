const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Franc Money API',
      version: '1.0.0',
      description: 'Documentação oficial da API de gerenciamento financeiro pessoal.',
    },
    servers: [
      {
        url: 'http://localhost:3333',
        description: 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT gerado no login.',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };