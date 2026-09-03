// The CLI calls process.exit immediately, which races native handle cleanup on
// Windows. Use the same build/prerender APIs and let Node exit naturally.
import fs from 'node:fs';
process.env.NODE_ENV='production';
const {createBuilder}=await import('vite');
const {runPrerender}=await import('vinext/internal/build/run-prerender');
try{
 const builder=await createBuilder();
 await builder.buildApp();
 const result=await runPrerender({root:process.cwd().replaceAll('\\','/')});
 if(!result||!fs.existsSync('dist/client/index.html'))throw Error('Static game export was not produced');
 console.log('Wildseed static browser build complete.');
}catch(error){console.error(error);process.exitCode=1;}

