// Node's strip-types runtime needs explicit extensions for the Worker's imports.
import { existsSync } from 'node:fs';
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:email') return { url: 'data:text/javascript,' + encodeURIComponent('export class EmailMessage { constructor(from,to,raw) { this.from=from; this.to=to; this.raw=raw; } }'), shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
    const url = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(url)) return { url: url.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
