import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import basicAuth from 'express-basic-auth';
import routes from './routes/index.js';
import { config } from './config/env.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/apiError.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Welcome to the Library Management API' });
});

if (config.swaggerUser && config.swaggerPass) {
  app.use(
    '/docs',
    basicAuth({
      users: { [config.swaggerUser]: config.swaggerPass },
      challenge: true
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );
} else {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use('/api', routes);

app.use('*', (req) => {
  throw new ApiError(404, `Route ${req.originalUrl} not found`);
});

app.use(errorHandler);

export default app;
