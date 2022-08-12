import { Definition, Recordable } from "./schema";
import { writeFile, dataTypeMap } from "./util";

// 生成schema字符串模板
const createSchemaTemplate = (definition: Definition) => {
  if (definition?.properties === null) {
    console.log(definition, 'definition')
  }
  return `
    // ${definition.description}
    interface ${definition.title} {
      ${Object.entries(definition?.properties ?? {})
      .map(([key, value]) => {
        return `${key}:${value?.items ? (`${value?.items?.$ref?.split('/').reverse()[0] || dataTypeMap[value?.items?.type ?? 'string']}${value?.type === 'array' ? '[]' : ''}`) : dataTypeMap[value.type ?? 'string']}`;
      })
      .join(";\n")}
    }
  `;
};

// 生成全局schema文件
const createSchemaFile = async ({
  namespace,
  outDir,
  definitions
}: {
  namespace: string;
  outDir: string;
  definitions: Recordable<Definition>;
}) => {
  const schemaTemplates = Object.values(definitions).filter(({ title }) => !title.includes('PageEntity')).map((definition) => {
    const template = createSchemaTemplate(definition);
    return template;
  });
  const template = `
  declare namespace ${namespace} {
    ${schemaTemplates.join('\n\n')}
  }
  `;
  await writeFile(template, `${outDir}/schemas.d.ts`)
};

export default createSchemaFile;
