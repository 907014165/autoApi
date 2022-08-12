// import apiDocs from "./api-docs.json";
import { ApiDocs, Definition, ApiModel, Recordable } from "./schema";
import createSchemaFile from "./createSchemaFile";
import { batchCreateApiFile } from "./createApiFile";
import { httpGetFile, getProcessArgv } from './util'

// 入口函数
const init = async () => {
  const { apiUrl } = getProcessArgv();
  const apiDocs = await httpGetFile<ApiDocs>(apiUrl);
  const groupPaths = Object.entries(
    (apiDocs as unknown as ApiDocs).paths
  ).reduce((prev, [path, apiModel]) => {
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
  const { definitions } = (apiDocs as unknown as ApiDocs);
  await batchCreateApiFile({
    baseUrl: "/dayu-chat-server/api",
    groupPaths: groupPaths,
    outDir: "./dist",
    namespace: "DayuChatServer"
  });

  await createSchemaFile({
    namespace: 'DayuChatServer',
    outDir: "./dist",
    definitions: definitions
  })
};

init();
