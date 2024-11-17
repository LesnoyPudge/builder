import ts from "typescript";



export type Transformer = ts.TransformerFactory<ts.SourceFile>;

export type JSFileNameToDataMap = Map<string, string>;