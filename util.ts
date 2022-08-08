import {
  exists as _exists,
  readFile as _readFile,
  writeFile as _writeFile,
  mkdir as _mkdir,
  copyFile as _copyFile,
} from "fs";

import { promisify } from "util";

const fileExists = async (filename: string) => {
  const flag = (await promisify(_exists)(filename)) as boolean;
  return flag;
};

export const writeFile = async (content: string, filename: string) => {
  if (!(await fileExists(filename))) {
    console.log(`创建 ${filename}`);
    // 清除空行
    content = content
      .split("\n")
      .filter((_) => !!_.replace(/ /gim, ""))
      .join("\n");
    await promisify(_writeFile)(filename, content);
  }
};

export function camelCase(params: string) {
  return params.replace(/[\/_-][a-zA-z]/g, (str) =>
    str.substr(-1).toUpperCase()
  );
}

export const dataTypeMap = {
  object: "object",
  string: "string",
  integer: "number",
  array: "array",
};
