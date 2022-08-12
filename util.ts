import {
  exists as _exists,
  readFile as _readFile,
  writeFile as _writeFile,
  mkdir as _mkdir,
  copyFile as _copyFile,
} from "fs";
import http from 'http';

import { promisify } from "util";
import { Recordable } from "./schema";

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
  number: 'number',
  array: "array",
  boolean: 'boolean'
};

// 获取环境变量参数
export const getProcessArgv = () => {
  const args: Recordable<string> = {};
  process.argv.slice(2).reduce((prev, item) => {
    const [key, value] = item.split('=');
    prev[key] = value;
    return prev;
  }, args);
  return args;
}

export const httpGetFile = <T = unknown>(url: string): Promise<T> => new Promise((resolve, reject) => {
  http.get(url, (data) => {
    let str = '';
    data.on('data', function (chunk) {
      str += chunk;
    });
    data.on('end', function () {
      resolve(JSON.parse(str) as unknown as T);
    });
    data.on('error', function (error) {
      reject(error);
    });
  })
});
