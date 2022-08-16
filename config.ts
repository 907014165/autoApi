const config = {
  importHeader: `
  import send from 'kikyoLib/request';
  interface PageEntity<T> {
    data: Array<T>,
    total?: number,
    page?: number,
    perPage?: number
  }
  `
}

export default config;