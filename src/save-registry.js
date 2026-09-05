export function createSaveRegistry({ version, modules = [], validate = () => true } = {}) {
  if (!Number.isInteger(version) || version < 1) throw new TypeError("保存版には正の整数が必要です。");
  for (const module of modules) {
    if (!module?.id || !Number.isInteger(module.version) || module.version < 1) throw new TypeError("保存システムにはidと正のversionが必要です。");
  }
  if (new Set(modules.map(({ id }) => id)).size !== modules.length) throw new Error("保存システムIDが重複しています。");
  const moduleVersions = Object.freeze(Object.fromEntries(modules.map(({ id, version: moduleVersion }) => [id, moduleVersion])));
  const matchesVersions = (stored) => stored && typeof stored === "object"
    && Object.keys(stored).length === modules.length
    && modules.every(({ id, version: moduleVersion }) => stored[id] === moduleVersion);
  const isCurrent = (value) => value?.version === version && validate(value);
  return Object.freeze({
    version,
    moduleVersions,
    deserialize(raw) {
      if (!isCurrent(raw) || !matchesVersions(raw.systemVersions)) return null;
      return structuredClone(raw);
    },
    serialize(value) {
      if (!isCurrent(value) || (value.systemVersions !== undefined && !matchesVersions(value.systemVersions))) {
        throw new TypeError("現在の保存形式に対応していない状態です。");
      }
      return { ...structuredClone(value), systemVersions: { ...moduleVersions } };
    },
  });
}

export function readRegisteredSave(storage, key, registry) {
  try {
    return registry.deserialize(JSON.parse(storage?.getItem(key)));
  } catch {
    return null;
  }
}

export function writeRegisteredSave(storage, key, registry, value) {
  const serialized = registry.serialize(value);
  storage?.setItem(key, JSON.stringify(serialized));
  return serialized;
}
