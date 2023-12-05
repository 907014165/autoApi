import { ApiModel, Definition, Property, Recordable } from "./schema";
import { writeFile, camelCase, dataTypeMap, getOriginalRef,hyphenToCamelCase } from "./util";
import config from './config';

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
          if(parameter.name=='ids'){
            console.log(parameter);
          }
          return `${hyphenToCamelCase(parameter.name)}${parameter.required ? '' : '?'}:${(parameter.items?.type||parameter.type)
            ? `${dataTypeMap[(parameter.items?.type||parameter.type)]}${parameter?.type==='array'?'[]':''}`
            : `${parameter.schema?.originalRef ? `` : ''}${parameter.schema?.originalRef || dataTypeMap[parameter.schema?.items?.type ?? 'string']}${[parameter.schema?.type,parameter.type].includes('array') ? '[]' : ''}`
            }`;
        })
        .join(",\n") ?? '';
      const queryStr = apiModel.parameters?.map((parameter) => {
        return `${hyphenToCamelCase(parameter.name)}${parameter.default ? ` = ${typeof parameter.default === 'string' ? `'${parameter.default}'` : parameter.default}` : ''}`
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
        } as PageEntity<${getOriginalRef(okResponse?.schema?.originalRef??'')}>)
      ` : 'data'
    })();

    // 响应的数据类型
    const responseSchema = (() => {
      const okResponse = apiModel?.responses?.['200'];
      const isPageEntity = okResponse?.schema?.originalRef?.includes("PageEntity") ?? false;
      if (isPageEntity) {
        return `Array<${getOriginalRef(okResponse?.schema?.originalRef??'')}>`;
      }
      if (okResponse?.schema) {
        const { type, items, originalRef } = okResponse?.schema ?? {};
        return items ? `${items.originalRef ? `` : ''}${items.originalRef || dataTypeMap[items.type ?? 'string']}${type === 'array' ? '[]' : ''}` : `${originalRef ? `` : ''}${originalRef || dataTypeMap[type ?? 'string']}`;
      }
      return 'string';
    })();

    // api query请求参数
    const queryStr = (() => {
      const str = apiModel.parameters
        ?.filter((item) => item.in === "query")
        .map(({ name }) => {
          return `'${name}':${hyphenToCamelCase(name)}`;
        })
        .join(",\n") ?? '';
      return str ? `params:{${str}}` : ''
    })();

    // api body请求参数
    const bodyStr = (() => {
      const name =
        apiModel.parameters?.find((item) => item.in === "body")?.name ?? "";
      return name ? `${name}` : "";
    })();

    // headers请求参数
    const headersStr = (() => {
      const str = apiModel.parameters
        ?.filter((item) => item.in === "header")
        .map(({ name }) => {
          return `'${name}':${hyphenToCamelCase(name)}`;
        })
        .join(",\n") ?? '';
      return str ? `headers:{${str}}` : ''
    })();

    const templateMap = {
      'get': () => {
        return `
          /**${apiModel.summary} */
          export const ${apiName} = async (${paramsStr}) => {
            const ${responseDataStr} = await request.get<${responseSchema}>(${'`' + url + '`'},{
              ${headersStr ? `${headersStr},` : ""}
              ${queryStr ? `${queryStr},` : ""}
              ${bodyStr ? `data:${bodyStr}` : ""}
            });
            return ${returnParameterStr};
          }
        `;
      },
      'post': () => {
        return `
          /**${apiModel.summary} */
          export const ${apiName} = async (${paramsStr}) => {
            const ${responseDataStr} = await request.post<${responseSchema}>(${'`' + url + '`'},${bodyStr ||undefined}${queryStr||headersStr ? `,{
              ${headersStr ? `${headersStr},` : ""}
              ${queryStr}
            }` : ""});
            return ${returnParameterStr};
          }
        `;
      },
      'put': () => {
        return `
          /**${apiModel.summary} */
          export const ${apiName} = async (${paramsStr}) => {
            const ${responseDataStr} = await request.put<${responseSchema}>(${'`' + url + '`'},${bodyStr || undefined}${queryStr||headersStr ? `,{
              ${headersStr ? `${headersStr},` : ""}
              ${queryStr},
            }` : ""});
            return ${returnParameterStr};
          }
        `;
      },
      'delete': () => {
        return `
          /**${apiModel.summary} */
          export const ${apiName} = async (${paramsStr}) => {
            const ${responseDataStr} = await request.delete<${responseSchema}>(${'`' + url + '`'}${queryStr || bodyStr||headersStr ? `,{
              ${headersStr ? `${headersStr},` : ""}
              ${queryStr ? `${queryStr},` : ''}
              ${bodyStr ? `data:${bodyStr}` : ""}
            }` : ""});
            return ${returnParameterStr};
          }
        `;
      },
      'patch': () => {
        return `
          /**${apiModel.summary} */
          export const ${apiName} = async (${paramsStr}) => {
            const ${responseDataStr} = await request.patch<${responseSchema}>(${'`' + url + '`'}${bodyStr ? `,${bodyStr}` : `,${undefined}`}${queryStr || bodyStr||headersStr ? `,{
              ${headersStr ? `${headersStr},` : ""}
              ${queryStr ? `${queryStr},` : ''}
              ${bodyStr?`data:${bodyStr}`: ""}
            }` : ""});
            return ${returnParameterStr};
          }
        `;
      },
      'asyncRequest': () => {
        return `
          /**${apiModel.summary} */
          export const ${apiName} = async (${paramsStr}) => {
            const ${responseDataStr} = await request.asyncRequest<${responseSchema}>({
              method:'${method}',
              url:${'`' + url + '`'},
              axiosConfig:{
                ${headersStr ? `${headersStr},` : ""}
                ${queryStr ? `${queryStr},` : ""}
                ${bodyStr ? `data:${bodyStr}` : ""}
              }
            });
            return ${returnParameterStr};
          }
        `;
      }
    }

    if (Reflect.has(templateMap, method)) {
      return templateMap[method as 'get']();
    }
    return templateMap.asyncRequest();
  };
  return Object.entries(params.apiModels).map(([method, model]) => {
    return genTemplate({
      url: params.url,
      apiModel: model,
      method,
    });
  }).join('\n\n');
};

// 生成types字符串模板
const createSchemaTemplate = (definition: Definition) => {
  return `
    /**${definition.description} */
    export interface ${definition.title} {
      ${Object.entries(definition?.properties ?? {})
      .map(([key, value]) => {
        return `${key}:${value?.items ? (`${value?.items?.$ref?.split('/').reverse()[0] || dataTypeMap[value?.items?.type ?? 'string']}${value?.type === 'array' ? '[]' : ''}`) : dataTypeMap[value.type ?? 'string']}`;
      })
      .join(";\n")}
    }
  `;
};

// 创建api请求文件
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

  // 获取所有需要导入的types
  const set = new Set<string>();
  Object.values(groupPath).forEach((apiModels) => {
    Object.values(apiModels).forEach((apiModel) => {
      apiModel.parameters?.forEach((parameter) => {
        if (parameter.schema?.originalRef) {
          const originalRef = getOriginalRef(parameter.schema?.originalRef);
          set.add(originalRef);
        }
      });
      Object.values(apiModel.responses ?? {}).forEach((response) => {
        if (response.schema?.originalRef) {
          const originalRef = getOriginalRef(response.schema?.originalRef);
          set.add(originalRef);
        }
      });
    });
  });
  const importTypesStr =Array.from(set).filter(Boolean).length? `import type { ${Array.from(set).filter(Boolean).join(', ')} } from './types.ts';`:'';
  const template = `
    ${importTypesStr}\n
    ${config.importHeader}\n
    ${apiTemplates.join("\n\n")}
  `;
  const fileName = Object.keys(groupPath)[0].split("/")[2];
  // 生成文件
  await writeFile(template, `${outDir}/${fileName}/index.ts`);
};

// 创建types文件
const createTypesFile = async ({
  outDir,
  groupPath,
  definitions
}: {
  outDir: string;
  groupPath: Recordable<Recordable<ApiModel>>,
  definitions: Recordable<Definition>;
}) => {
  const set = new Set<Definition>();
  const dfsDefinition = (properties: Recordable<Property>) => {
    Object.values(properties).forEach((property) => {
      if (property.items?.originalRef) {
        const originalRef = getOriginalRef(property.items?.originalRef);
        set.add(definitions[originalRef]);
        dfsDefinition(definitions[originalRef]?.properties ?? {});
      }
    })
  }
  Object.values(groupPath).forEach((apiModels) => {
    Object.values(apiModels).forEach((apiModel) => {
      apiModel.parameters?.forEach((parameter) => {
        if (parameter.schema?.originalRef) {
          const originalRef = getOriginalRef(parameter.schema?.originalRef);
          set.add(definitions[originalRef]);
          definitions[originalRef] && dfsDefinition(definitions[originalRef].properties ?? {});
        }
      });
      Object.values(apiModel.responses ?? {}).forEach((response) => {
        if (response.schema?.originalRef) {
          const originalRef = getOriginalRef(response.schema?.originalRef);
          set.add(definitions[originalRef]);
          definitions[originalRef] && dfsDefinition(definitions[originalRef].properties ?? {});
        }
      });
    });
  });
  const schemaTemplates = Array.from(set).filter(Boolean).map((definition) => {
    const template = createSchemaTemplate(definition);
    return template;
  });
  if(!schemaTemplates.length){
    return;
  }

  const template = `
    ${schemaTemplates.join('\n\n')}
  `;

  const fileName = Object.keys(groupPath)[0].split("/")[2];
  // 生成文件
  await writeFile(template, `${outDir}/${fileName}/types.ts`);
}

export const batchCreateApiFile = async (params: {
  baseUrl: string;
  groupPaths: Recordable<Recordable<ApiModel>>[];
  outDir: string;
  namespace: string,
  definitions: Recordable<Definition>;
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

        await createTypesFile({
          outDir: params.outDir,
          groupPath,
          definitions: params.definitions
        });
      })();
    })
  );
};
