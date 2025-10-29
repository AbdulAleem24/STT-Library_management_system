import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Library Management API',
    version: '1.0.0',
    description: 'REST API for the Library Management System built with Express and Prisma.'
  },
  servers: [
    {
      url: 'http://localhost:4000/api',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
