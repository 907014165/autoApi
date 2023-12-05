const config = {
  importHeader: `
  import { request } from '@/service/request';
  interface PageEntity<T> {
    data: Array<T>,
    total?: number,
    page?: number,
    perPage?: number
  }
  `
}

export default config;