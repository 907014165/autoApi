declare type DataType = "object" | "string" | "integer" | "array";
export type Recordable<T = any> = Record<string, T>;
type QueryIn = "query" | "body"|'header';


interface PropertyItem {
  type: DataType;
  "$ref": string,
  "originalRef": string
}
export interface Property {
  type?: DataType;
  description: string;
  enum?: string[];
  items?: PropertyItem;
  $ref?: string
}

interface Parameter {
  name: string;
  in: QueryIn;
  description: string;
  required: boolean;
  type: DataType;
  default?: any;
  format?: string;
  allowEmptyValue?: boolean;
  schema?: Schema;
  items?: PropertyItem;
}

interface Schema {
  originalRef?: string;
  type?: DataType;
  $ref?: string;
  items?: Schema;
}

interface Response {
  description: string;
  schema?: Schema;
}

export interface Definition {
  type: DataType;
  required?: string[];
  properties: Recordable<Property>;
  title: string;
  description: string;
}

export interface ApiModel {
  tags: string[];
  summary: string;
  operationId: string;
  produces: string[];
  parameters?: Parameter[];
  responses?: Recordable<Response>;
  deprecated: boolean;
  security: any[];
}

export interface ApiDocs {
  definitions: Recordable<Definition>;
  paths: Recordable<Recordable<ApiModel>>;
  basePath: string
}
