import {portalHandler} from './service.ts';
Deno.serve(portalHandler('authenticated'));
