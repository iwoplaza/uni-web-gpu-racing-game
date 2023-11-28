import type { PluginOption } from 'vite';
import injectSocketIO from './socketIOHandler';

export const socketIOServer: PluginOption = {
  name: 'socketIOServer',
  configureServer(server) {
    if (!server.httpServer) {
      throw new Error(`Failed to inject Socket.io server`);
    }

    injectSocketIO(server.httpServer);
  }
};
