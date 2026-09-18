import {sites} from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig({
 css:{postcss:{plugins:[tailwindcss()]}},
 resolve:{dedupe:['react','react-dom']},
 optimizeDeps:{include:['react','react-dom/client','react/jsx-runtime','@base-ui/react/dialog','@base-ui/react/progress','@base-ui/react/button','lucide-react','class-variance-authority','clsx','tailwind-merge','three','three/addons/loaders/GLTFLoader.js','three/addons/utils/SkeletonUtils.js']},
 plugins:[vinext(),...(process.env.WILDSEED_HOST==='vercel'||process.env.VERCEL?[]:[sites()])],
});
