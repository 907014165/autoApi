import apiDocs from "./api-docs.json";
import { ApiDocs, Definition, ApiModel, Recordable } from "./schema";
import createSchemaFile from "./createSchemaFile";
import { batchCreateApiFile } from "./createApiFile";

// 入口函数
const init = async () => {
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

  await batchCreateApiFile({
    baseUrl: "/dayu-chat-server/api",
    groupPaths: groupPaths,
    outDir: "./dist",
  });
};

init();
