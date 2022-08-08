import { Definition, Recordable } from "./schema";
import { writeFile, dataTypeMap } from "./util";

// 生成schema字符串模板
const createSchemaTemplate = (definition: Definition) => {
  return `
    // ${definition.description}
    interface ${definition.title} {
      ${Object.entries(definition.properties)
        .map(([key, value]) => {
          return `${key}:${dataTypeMap[value.type]}`;
        })
        .join(";\n")}
    }
  `;
};

// 生成全局schema文件
const createSchemaFile = async (params: {
  namespace: string;
  outDir: string;
  definitions: Recordable<Definition>;
}) => {
  console.log("na lai ba ni");
};

export default createSchemaFile;
