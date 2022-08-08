import { camelCase } from './util';

console.log(camelCase('/v1/advertisement/{id}'.replace(/\{.*?\}/g, (target) => {
  return target.slice(1, target.length - 1);
})))


