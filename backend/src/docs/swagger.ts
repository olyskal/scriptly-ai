import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import fs from 'fs';

// Carrega o arquivo OpenAPI YAML
const openApiSpecification = fs.readFileSync(path.join(__dirname, '../../openapi.yaml'), 'utf8');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scriptly API',
      version: '1.0.0',
      description: 'API para o gerenciamento de posts e assinaturas do Scriptly',
      contact: {
        name: 'Suporte Scriptly',
        email: 'suporte@scriptly.app',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.scriptly.app/api',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/features/**/*.ts'],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Rota para a documentação Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Scriptly API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // Rota para o JSON da especificação OpenAPI
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Rota para o YAML da especificação OpenAPI
  app.get('/api-docs.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(openApiSpecification);
  });

  console.log('📚 Documentação da API disponível em /api-docs');
}
