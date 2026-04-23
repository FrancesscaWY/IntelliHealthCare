type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type SwaggerSchemaObject = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  properties?: Record<string, SwaggerSchemaObject | undefined>;
  items?: SwaggerSchemaObject;
  additionalProperties?: boolean | SwaggerSchemaObject;
  allOf?: SwaggerSchemaObject[];
  anyOf?: SwaggerSchemaObject[];
  oneOf?: SwaggerSchemaObject[];
  enum?: JsonValue[];
  examples?: JsonValue[];
  example?: JsonValue;
  default?: JsonValue;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  nullable?: boolean;
  readOnly?: boolean;
};

type SwaggerMediaTypeObject = {
  schema?: SwaggerSchemaObject;
  example?: JsonValue;
  examples?: Record<string, { value?: JsonValue }>;
};

type SwaggerParameterObject = {
  name?: string;
  schema?: SwaggerSchemaObject;
  example?: JsonValue;
  content?: Record<string, SwaggerMediaTypeObject>;
};

type SwaggerRequestBodyObject = {
  $ref?: string;
  content?: Record<string, SwaggerMediaTypeObject>;
};

type SwaggerOperationObject = {
  parameters?: SwaggerParameterObject[];
  requestBody?: SwaggerRequestBodyObject;
};

type SwaggerPathItemObject = Record<string, unknown> & {
  parameters?: SwaggerParameterObject[];
};

type SwaggerDocument = {
  components?: {
    schemas?: Record<string, SwaggerSchemaObject | undefined>;
    requestBodies?: Record<string, SwaggerRequestBodyObject | undefined>;
    [key: string]: unknown;
  };
  paths?: Record<string, SwaggerPathItemObject | undefined>;
};

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace"
]);

type ExampleContext = "request" | "parameter";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (isObject(value)) {
    return Object.values(value).every((item) => isJsonValue(item));
  }

  return false;
}

function isEmptyPlainObject(value: unknown) {
  return isObject(value) && Object.keys(value).length === 0;
}

function cloneJsonValue<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveLocalRef(document: SwaggerDocument, ref: string): unknown {
  if (!ref.startsWith("#/")) {
    return undefined;
  }

  return ref
    .slice(2)
    .split("/")
    .reduce<unknown>((current, segment) => {
      if (!isObject(current)) {
        return undefined;
      }

      return current[segment];
    }, document);
}

function isEmptyObjectSchema(schema: SwaggerSchemaObject | undefined) {
  if (!schema) {
    return false;
  }

  return (
    getSchemaType(schema) === "object" &&
    Object.keys(schema.properties ?? {}).length === 0 &&
    !schema.additionalProperties &&
    !schema.allOf &&
    !schema.anyOf &&
    !schema.oneOf
  );
}

function inferPrimitiveParameterSchema(
  parameter: SwaggerParameterObject
): SwaggerSchemaObject | undefined {
  const normalizedName = (parameter.name ?? "").toLowerCase();

  if (normalizedName === "page") {
    return {
      type: "integer",
      minimum: 1,
      example: 1
    };
  }

  if (normalizedName === "pagesize") {
    return {
      type: "integer",
      minimum: 1,
      maximum: 100,
      example: 20
    };
  }

  if (normalizedName === "limit") {
    return {
      type: "integer",
      minimum: 1,
      example: 20
    };
  }

  return undefined;
}

function toExampleIdentifier(name: string) {
  const normalized = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || "value";
}

function getSchemaType(schema: SwaggerSchemaObject) {
  if (typeof schema.type === "string") {
    return schema.type;
  }

  if (Array.isArray(schema.type)) {
    return schema.type.find((item) => item !== "null");
  }

  if (schema.properties) {
    return "object";
  }

  if (schema.items) {
    return "array";
  }

  return undefined;
}

function buildStringExample(name?: string, format?: string) {
  const normalized = (name ?? "").toLowerCase();

  if (format === "date-time" || normalized.endsWith("at") || normalized.includes("time")) {
    return "2026-04-22T09:00:00.000Z";
  }

  if (format === "date" || normalized.endsWith("date")) {
    return "2026-04-22";
  }

  if (format === "uuid") {
    return "00000000-0000-4000-8000-000000000000";
  }

  if (format === "email") {
    return "demo@example.com";
  }

  if (format === "uri" || format === "url" || /url|uri|link/.test(normalized)) {
    return "https://example.com/resource";
  }

  if (format === "binary") {
    return "binary-content";
  }

  if (/phone|mobile/.test(normalized)) {
    return "13800138000";
  }

  if (/password/.test(normalized)) {
    return "123456";
  }

  if (/token/.test(normalized)) {
    return "token_example_001";
  }

  if (/code/.test(normalized)) {
    return "1234";
  }

  if (/idcard/.test(normalized)) {
    return "110101199001011234";
  }

  if (/title/.test(normalized)) {
    return "Example title";
  }

  if (/keyword/.test(normalized)) {
    return "example keyword";
  }

  if (/content|message|reason|remark|comment|summary|topic/.test(normalized)) {
    return "Example content";
  }

  if (/name/.test(normalized)) {
    return "Example name";
  }

  if (/id$/.test(normalized)) {
    return `${toExampleIdentifier(normalized)}_001`;
  }

  return "string";
}

function buildFallbackExample(
  schema: SwaggerSchemaObject,
  propertyName?: string
): JsonValue | undefined {
  const schemaType = getSchemaType(schema);

  if (schemaType === "string") {
    return buildStringExample(propertyName, schema.format);
  }

  if (schemaType === "integer" || schemaType === "number") {
    if (typeof schema.minimum === "number") {
      return schema.minimum;
    }

    if (typeof schema.exclusiveMinimum === "number") {
      return schema.exclusiveMinimum + 1;
    }

    return schemaType === "integer" ? 1 : 0.1;
  }

  if (schemaType === "boolean") {
    return true;
  }

  if (schemaType === "array") {
    return [];
  }

  if (schemaType === "object") {
    return {};
  }

  return undefined;
}

function mergeAllOfExamples(
  schema: SwaggerSchemaObject,
  document: SwaggerDocument,
  context: ExampleContext,
  refStack: Set<string>
) {
  const merged: Record<string, JsonValue> = {};
  let primitiveExample: JsonValue | undefined;

  for (const member of schema.allOf ?? []) {
    const example = buildExampleFromSchema(
      member,
      document,
      context,
      undefined,
      refStack
    );

    if (example === undefined) {
      continue;
    }

    if (isObject(example)) {
      Object.assign(merged, example);
      continue;
    }

    if (primitiveExample === undefined) {
      primitiveExample = example;
    }
  }

  if (Object.keys(merged).length > 0) {
    return merged;
  }

  return primitiveExample;
}

function buildExampleFromSchema(
  schema: SwaggerSchemaObject | undefined,
  document: SwaggerDocument,
  context: ExampleContext,
  propertyName?: string,
  refStack = new Set<string>()
): JsonValue | undefined {
  if (!schema) {
    return undefined;
  }

  if (isJsonValue(schema.example)) {
    return cloneJsonValue(schema.example);
  }

  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    const [firstExample] = schema.examples;
    if (isJsonValue(firstExample)) {
      return cloneJsonValue(firstExample);
    }
  }

  if (isJsonValue(schema.default)) {
    return cloneJsonValue(schema.default);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const [firstOption] = schema.enum;
    if (isJsonValue(firstOption)) {
      return cloneJsonValue(firstOption);
    }
  }

  if (typeof schema.$ref === "string") {
    if (refStack.has(schema.$ref)) {
      return undefined;
    }

    const resolved = resolveLocalRef(document, schema.$ref);
    if (!isObject(resolved)) {
      return undefined;
    }

    refStack.add(schema.$ref);
    const example = buildExampleFromSchema(
      resolved as SwaggerSchemaObject,
      document,
      context,
      propertyName,
      refStack
    );
    refStack.delete(schema.$ref);

    return example;
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const example = mergeAllOfExamples(schema, document, context, refStack);
    if (example !== undefined) {
      return example;
    }
  }

  for (const members of [schema.oneOf, schema.anyOf]) {
    if (!Array.isArray(members)) {
      continue;
    }

    for (const member of members) {
      const example = buildExampleFromSchema(
        member,
        document,
        context,
        propertyName,
        refStack
      );

      if (example !== undefined) {
        return example;
      }
    }
  }

  const schemaType = getSchemaType(schema);

  if (schemaType === "object") {
    const objectExample: Record<string, JsonValue> = {};

    for (const [childName, childSchema] of Object.entries(schema.properties ?? {})) {
      if (!childSchema || (context === "request" && childSchema.readOnly)) {
        continue;
      }

      const childExample =
        buildExampleFromSchema(childSchema, document, context, childName, refStack) ??
        buildFallbackExample(childSchema, childName);

      if (childExample !== undefined) {
        objectExample[childName] = childExample;
      }
    }

    if (Object.keys(objectExample).length > 0) {
      return objectExample;
    }

    if (isObject(schema.additionalProperties)) {
      const additionalExample =
        buildExampleFromSchema(
          schema.additionalProperties as SwaggerSchemaObject,
          document,
          context,
          "value",
          refStack
        ) ?? buildFallbackExample(schema.additionalProperties as SwaggerSchemaObject, "value");

      if (additionalExample !== undefined) {
        return {
          additionalProp1: additionalExample
        };
      }
    }

    return {};
  }

  if (schemaType === "array") {
    const itemExample =
      buildExampleFromSchema(schema.items, document, context, propertyName, refStack) ??
      (schema.items ? buildFallbackExample(schema.items, propertyName) : undefined);

    return itemExample !== undefined ? [itemExample] : [];
  }

  return buildFallbackExample(schema, propertyName);
}

function enrichParameterExamples(
  parameters: SwaggerParameterObject[] | undefined,
  document: SwaggerDocument
) {
  if (!Array.isArray(parameters)) {
    return;
  }

  for (const parameter of parameters) {
    if (!isObject(parameter)) {
      continue;
    }

    if (parameter.schema?.$ref) {
      const resolved = resolveLocalRef(document, parameter.schema.$ref);

      if (isObject(resolved) && isEmptyObjectSchema(resolved as SwaggerSchemaObject)) {
        const inferredSchema = inferPrimitiveParameterSchema(parameter);
        if (inferredSchema) {
          parameter.schema = inferredSchema;

          if (parameter.example === undefined || isEmptyPlainObject(parameter.example)) {
            parameter.example = inferredSchema.example;
          }
        }
      }
    }

    if (
      (parameter.example === undefined || isEmptyPlainObject(parameter.example)) &&
      parameter.schema
    ) {
      const example =
        buildExampleFromSchema(
          parameter.schema,
          document,
          "parameter",
          parameter.name
        ) ?? buildFallbackExample(parameter.schema, parameter.name);

      if (example !== undefined) {
        parameter.example = example;
      }
    }

    for (const mediaType of Object.values(parameter.content ?? {})) {
      if (!mediaType || mediaType.example !== undefined || mediaType.examples) {
        continue;
      }

      const example = buildExampleFromSchema(
        mediaType.schema,
        document,
        "parameter",
        parameter.name
      );

      if (example !== undefined) {
        mediaType.example = example;
      }
    }
  }
}

function resolveRequestBodyObject(
  requestBody: SwaggerRequestBodyObject,
  document: SwaggerDocument
) {
  if (typeof requestBody.$ref !== "string") {
    return requestBody;
  }

  const resolved = resolveLocalRef(document, requestBody.$ref);
  return isObject(resolved) ? (resolved as SwaggerRequestBodyObject) : requestBody;
}

function enrichRequestBodyExamples(
  requestBody: SwaggerRequestBodyObject | undefined,
  document: SwaggerDocument
) {
  if (!requestBody) {
    return;
  }

  const resolvedRequestBody = resolveRequestBodyObject(requestBody, document);

  for (const mediaType of Object.values(resolvedRequestBody.content ?? {})) {
    if (!mediaType || mediaType.example !== undefined || mediaType.examples) {
      continue;
    }

    const example = buildExampleFromSchema(mediaType.schema, document, "request");
    if (example !== undefined) {
      mediaType.example = example;
    }
  }
}

export function enhanceSwaggerDocument(document: {
  components?: unknown;
  paths?: unknown;
}) {
  const typedDocument = document as SwaggerDocument;

  for (const pathItem of Object.values(typedDocument.paths ?? {})) {
    if (!isObject(pathItem)) {
      continue;
    }

    enrichParameterExamples(pathItem.parameters, typedDocument);

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !isObject(operation)) {
        continue;
      }

      const typedOperation = operation as SwaggerOperationObject;
      enrichParameterExamples(typedOperation.parameters, typedDocument);
      enrichRequestBodyExamples(typedOperation.requestBody, typedDocument);
    }
  }
}
