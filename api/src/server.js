import app from './app.js';
import { config } from './config/env.js';

const { port } = config;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Library API listening on port ${port}`);
});
