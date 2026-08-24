export function createSaveRegistry(options = {}) {
  const version = Math.max(1, Math.round(Number(options.version) || 1));
  const modules = Array.isArray(options.modules) ? options.modules : [];
  const moduleVersions = Object.freeze(Object.fromEntries(modules.map((module) => [module.id, module.version])));
  return Object.freeze({
    version,
    moduleVersions,
    migrate(raw) {
      if (!raw || typeof raw !== "object") return null;
      const migrated = options.migrate ? options.migrate(structuredClone(raw)) : structuredClone(raw);
      if (!migrated) return null;
      return { ...migrated, version, systemVersions: { ...(migrated.systemVersions ?? {}), ...moduleVersions } };
    },
    serialize(value) {
      const migrated = this.migrate(value);
      if (!migrated) throw new TypeError("保存できる状態ではありません。");
      return migrated;
    },
  });
}

export function readRegisteredSave(storage, key, registry) {
  try {
    const raw = JSON.parse(storage?.getItem(key));
    return registry.migrate(raw);
  } catch {
    return null;
  }
}

export function writeRegisteredSave(storage, key, registry, value) {
  const serialized = registry.serialize(value);
  storage?.setItem(key, JSON.stringify(serialized));
  return serialized;
}
