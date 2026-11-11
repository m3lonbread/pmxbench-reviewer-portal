import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const [owner,repo]=process.env.GITHUB_REPOSITORY?.split('/')??[];
const automatic=repo&&repo.toLowerCase()!==`${owner}.github.io`.toLowerCase()?`/${repo}/`:'/';
export default defineConfig({plugins:[react()],base:process.env.PAGES_BASE_PATH||automatic,build:{outDir:'dist',sourcemap:false},server:{port:5174}});
