// import apiDocs from "./api-docs.json";
import { ApiDocs, Definition, ApiModel, Recordable } from "./schema";
import { batchCreateApiFile } from "./createApiFile";
import { httpGetFile, getProcessArgv, camelCase } from './util';
import config from './runConfig.json'

// 入口函数
const init = async () => {
  const { apiUrl, outDir, namespace } = config;
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
  const { definitions } = apiDocs;
  await batchCreateApiFile({
    baseUrl: '',
    groupPaths: groupPaths,
    outDir: outDir,
    namespace: namespace,
    definitions: definitions
  });
};

init();
