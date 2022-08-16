import { js as jsBeautify } from 'js-beautify';
import { ApiModel, Recordable } from "./schema";
import { writeFile, camelCase, dataTypeMap } from "./util";
import config from './config'

const createApiTemplate = (params: {
  url: string;
  apiModels: Recordable<ApiModel>;
  namespace: string
}) => {
  // 创建单个api请求模板
  const genTemplate = ({
    url,
    method,
    apiModel,
  }: {
    url: string;
    method: string;
    apiModel: ApiModel;
  }) => {

    // api请求接口名称
    const apiName = camelCase(`${url}/${method}`.replace(/\{.*?\}/g, (target) => {
      return target.slice(1, target.length - 1);
    }));

    // api所有请求参数以及对应的数据类型
    const paramsStr = (() => {
      const schemaStr = apiModel.parameters
        ?.map((parameter) => {
          return `${parameter.name}${parameter.required ? '' : '?'}:${parameter.type
            ? dataTypeMap[parameter.type]
            : `${parameter.schema?.originalRef ? `${params.namespace}.` : ''}${parameter.schema?.originalRef || dataTypeMap[parameter.schema?.items?.type ?? 'string']}${parameter.schema?.type === 'array' ? '[]' : ''}`
            }`;
        })
        .join(",\n") ?? '';
      const queryStr = apiModel.parameters?.map((parameter) => {
        return `${parameter.name}${parameter.default ? ` = ${typeof parameter.default === 'string' ? `'${parameter.default}'` : parameter.default}` : ''}`
      }).join(',\n') ?? '';

      return schemaStr ? `{
        ${queryStr}}:{${schemaStr}
      }` : "";
    })();

    // api请求路径
    url = url.replace(/\{.*?\}/g, (target) => {
      return `$${target}`;
    });

    // 响应参数
    const responseDataStr = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      return isPageEntity ? `{data, page: currentPage, perPage: pageSize, total}` : '{data}'
    })();

    // api接口返回参数
    const returnParameterStr = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      return isPageEntity ? `({
          data, page: currentPage, perPage: pageSize, total
        } as PageEntity<${params.namespace}.${okResponse?.schema?.originalRef?.replace('PageEntity«', '').replace('»', '')}>)
      ` : 'data'
    })();

    // 响应的数据类型
    const responseSchema = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      if (isPageEntity) {
        return `Array<${params.namespace}.${okResponse?.schema?.originalRef?.replace('PageEntity«', '').replace('»', '')}>`;
      }
      if (okResponse?.schema) {
        const { type, items, originalRef } = okResponse?.schema ?? {};
        return items ? `${items.originalRef ? `${params.namespace}.` : ''}${items.originalRef || dataTypeMap[items.type ?? 'string']}${type === 'array' ? '[]' : ''}` : `${originalRef ? `${params.namespace}.` : ''}${originalRef || dataTypeMap[type ?? 'string']}`;
      }
      return 'string';
    })();

    // api query请求参数
    const queryStr = (() => {
      const str = apiModel.parameters
        ?.filter((item) => item.in === "query")
        .map(({ name }) => {
          return `${name}`;
        })
        .join(",\n") ?? '';
      return str ? `params:{${str}}` : ''
    })();

    // api body请求参数
    const bodyStr = (() => {
      const name =
        apiModel.parameters?.find((item) => item.in === "body")?.name ?? "";
      return name ? `data:${name}` : "";
    })();

    return `
      // ${apiModel.summary}
      export const ${apiName} = async (${paramsStr}) => {
        const ${responseDataStr} = await send<${responseSchema}>({
          method:'${method}',
          url:${'`' + url + '`'},
          ${queryStr ? `${queryStr},` : ""}
          ${bodyStr || ""}
        });
        return ${returnParameterStr};
      }
    `;
  };
  return Object.entries(params.apiModels).map(([method, model]) => {
    return genTemplate({
      url: params.url,
      apiModel: model,
      method,
    });
  }).join('\n\n');
};

const createApiFile = async ({
  baseUrl,
  outDir,
  groupPath,
  namespace,
}: {
  baseUrl: string;
  outDir: string;
  groupPath: Recordable<Recordable<ApiModel>>;
  namespace: string
}) => {
  // todo
  const apiTemplates: string[] = Object.entries(groupPath).map(([path, apiModels]) => {
    const template = createApiTemplate({
      url: `${baseUrl}${path}`,
      apiModels,
      namespace
    });
    return template;
  });

  const template = `
    ${config.importHeader}
    ${apiTemplates.join("\n\n")}
  `;
  const fileName = Object.keys(groupPath)[0].split("/")[2];
  // 生成文件
  await writeFile(template, `${outDir}/${fileName}.ts`);
};

export const batchCreateApiFile = async (params: {
  baseUrl: string;
  groupPaths: Recordable<Recordable<ApiModel>>[];
  outDir: string;
  namespace: string
}) => {
  // 批量生成
  await Promise.all(
    params.groupPaths.map((groupPath) => {
      return (async () => {
        await createApiFile({
          outDir: params.outDir,
          groupPath,
          baseUrl: params.baseUrl,
          namespace: params.namespace
        });
      })();
    })
  );
};
