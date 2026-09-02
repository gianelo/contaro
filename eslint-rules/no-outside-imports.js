import path from "node:path";

/**
 * ADR-0005: the domain module may not import the framework.
 *
 * A file under the domain directory may only import from inside that same
 * directory, from a `node:` builtin, or from the explicit `allow` list.
 * Everything else the domain needs arrives as an argument.
 *
 * `node:module` is not a builtin the domain may have: `createRequire` would
 * hand it back everything this rule exists to keep out.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "forbid the domain module from importing anything outside itself",
    },
    schema: [
      {
        type: "object",
        properties: {
          /** Absolute path to the domain directory. */
          domainDir: { type: "string" },
          /** Bare specifiers this file may import anyway, e.g. "vitest". */
          allow: { type: "array", items: { type: "string" }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      outsideImport:
        "The domain module may not import '{{source}}'. Everything the domain needs from the outside arrives as an argument (ADR-0005).",
      escapeHatch:
        "'{{source}}' would let the domain module load anything at all, which is what ADR-0005 exists to prevent.",
      unresolvable:
        "The domain module may only import literal paths, so the boundary can be checked. This import cannot be read (ADR-0005).",
    },
  },

  create(context) {
    const { domainDir = "src/domain", allow = [] } = context.options[0] ?? {};
    const domainRoot = path.resolve(context.cwd, domainDir);
    const filename = path.resolve(context.cwd, context.filename);

    if (!isInside(domainRoot, filename)) return {};

    const here = path.dirname(filename);
    const allowed = new Set(allow);

    /** @param {{ type: string, value?: unknown }} node */
    const check = (node) => {
      if (node.type !== "Literal" || typeof node.value !== "string") {
        context.report({ node, messageId: "unresolvable" });
        return;
      }

      const source = node.value;

      if (source === "node:module" || source === "module") {
        context.report({ node, messageId: "escapeHatch", data: { source } });
        return;
      }
      if (source.startsWith("node:")) return;
      if (allowed.has(source) || allowed.has(source.split("/")[0])) return;
      if (
        source.startsWith(".") &&
        isInside(domainRoot, path.resolve(here, source))
      ) {
        return;
      }

      context.report({ node, messageId: "outsideImport", data: { source } });
    };

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => node.source && check(node.source),
      ExportAllDeclaration: (node) => node.source && check(node.source),
      ImportExpression: (node) => check(node.source),
      TSImportEqualsDeclaration: (node) =>
        node.moduleReference?.type === "TSExternalModuleReference" &&
        check(node.moduleReference.expression),
      CallExpression: (node) => {
        if (node.callee.type !== "Identifier" || node.callee.name !== "require") {
          return;
        }
        check(node.arguments[0] ?? node);
      },
    };
  },
};

/** True when `target` is `root` itself or sits underneath it. */
function isInside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export default rule;
