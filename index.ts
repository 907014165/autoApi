// import apiDocs from "./api-docs.json";
import { ApiDocs, Definition, ApiModel, Recordable } from "./schema";
import createSchemaFile from "./createSchemaFile";
import { batchCreateApiFile } from "./createApiFile";
import { httpGetFile, getProcessArgv, camelCase } from './util'

// 入口函数
const init = async () => {
  const { apiUrl, outDir } = getProcessArgv();
  const apiDocs = await httpGetFile<ApiDocs>(apiUrl);
  const groupPaths = Object.entries(apiDocs.paths).reduce((prev, [path, apiModel]) => {
    const index = prev.findIndex((item) => {
      return Object.keys(item)[0].includes(path.split("/")[2]);
    });
    if (index === -1) {
      prev.push({
        [path]: apiModel,
      });
    } else {
      prev[index][path] = apiModel;
    }
    return prev;
  }, [] as Recordable<Recordable<ApiModel>>[]);

  await batchCreateApiFile({
    baseUrl: apiDocs.basePath,
    groupPaths: groupPaths,
    outDir: outDir,
    namespace: camelCase(apiDocs.basePath)
  });

  const { definitions } = apiDocs;
  await createSchemaFile({
    namespace: camelCase(apiDocs.basePath),
    outDir: outDir,
    definitions: definitions
  })
};

init();
