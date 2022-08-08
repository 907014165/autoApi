import { js as jsBeautify } from 'js-beautify';
import { ApiModel, Recordable } from "./schema";
import { writeFile, camelCase, dataTypeMap } from "./util";

const createApiTemplate = (params: {
  url: string;
  apiModels: Recordable<ApiModel>;
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

    const apiName = camelCase(url.replace(/\{.*?\}/g, (target) => {
      return target.slice(1, target.length - 1);
    }));
    url = url.replace(/\{.*?\}/g, (target) => {
      return `$${target}`;
    })
    const responseDataStr = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      return isPageEntity ? `{data, page: currentPage, perPage: pageSize, total}` : '{data}'
    })();

    const returnParameterStr = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      return isPageEntity ? `({
          data, page: currentPage, perPage: pageSize, total
        } as PageEntity<${okResponse?.schema?.originalRef?.replace('PageEntity«', '').replace('»', '')}>)
      ` : 'data'
    })();

    const responseSchema = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      if (isPageEntity) {
        return `Array<${okResponse?.schema?.originalRef?.replace('PageEntity«', '').replace('»', '')}>`;
      }
      if (okResponse?.schema) {
        const { type, items, originalRef } = okResponse?.schema ?? {};
        return items ? `${items.originalRef}${type === 'array' ? '[]' : ''}` : type || originalRef;
      }
      return 'string';
    })();

    const queryStr = (() => {
      const str = apiModel.parameters
        ?.filter((item) => item.in === "query")
        .map(({ name }) => {
          return `${name}`;
        })
        .join(",\n") ?? '';
      return str ? `params:{${str}}` : ''
    })();

    const bodyStr = (() => {
      const name =
        apiModel.parameters?.find((item) => item.in === "body")?.name ?? "";
      return name ? `data:${name}` : "";
    })();

    const paramsStr = (() => {
      const schemaStr = apiModel.parameters
        ?.map((parameter) => {
          return `${parameter.name}${parameter.required ? '' : '?'}:${parameter.type
            ? dataTypeMap[parameter.type]
            : parameter.schema?.originalRef
            }`;
        })
        .join(",\n") ?? '';
      const queryStr = apiModel.parameters?.map((parameter) => {
        return `${parameter.name}${parameter.default ? ` = ${parameter.default}` : ''}`
      }).join(',\n') ?? '';

      return schemaStr ? `{${queryStr}}:{${schemaStr}}` : "";
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
}: {
  baseUrl: string;
  outDir: string;
  groupPath: Recordable<Recordable<ApiModel>>;
}) => {
  // todo
  const apiTemplates: string[] = Object.entries(groupPath).map(([path, apiModels]) => {
    const template = createApiTemplate({
      url: `${baseUrl}${path}`,
      apiModels
    });
    return template;
  });

  const template = `
    import send from 'kikyoLib/request';
    interface PageEntity<T> {
      data: Array<T>,
      total?: number,
      page?: number,
      perPage?: number
    }
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
}) => {
  // 批量生成
  await Promise.all(
    params.groupPaths.map((groupPath) => {
      return (async () => {
        await createApiFile({
          outDir: params.outDir,
          groupPath,
          baseUrl: params.baseUrl,
        });
      })();
    })
  );
};
