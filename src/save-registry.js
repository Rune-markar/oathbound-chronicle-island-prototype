function normalizeModule(module) {
  if (!module?.id || !Number.isInteger(module.version) || module.version < 1) throw new TypeError("保存システムにはidと正のversionが必要です。");
  const legacyVersion = module.legacyVersion;
  if (!(Number.isInteger(legacyVersion) && legacyVersion >= 0 && legacyVersion <= module.version)
    && typeof legacyVersion !== "function") {
    throw new TypeError(`保存システム ${module.id} にはlegacyVersionが必要です。`);
  }
  return Object.freeze({ ...module, migrations: Object.freeze({ ...(module.migrations ?? {}) }) });
}

function sourceModuleVersion(module, value, storedVersions) {
  if (Object.hasOwn(storedVersions, module.id)) {
    const stored = Number(storedVersions[module.id]);
    if (!Number.isInteger(stored) || stored < 0) throw new TypeError(`保存システム ${module.id} の版が不正です。`);
    return stored;
  }
  const detected = typeof module.legacyVersion === "function" ? module.legacyVersion(value) : module.legacyVersion;
  const version = Number(detected);
  if (!Number.isInteger(version) || version < 0 || version > module.version) throw new TypeError(`保存システム ${module.id} の旧版を判定できません。`);
  return version;
}

export function createSaveRegistry(options = {}) {
  const version = Math.max(1, Math.round(Number(options.version) || 1));
  const modules = (Array.isArray(options.modules) ? options.modules : []).map(normalizeModule);
  if (new Set(modules.map((module) => module.id)).size !== modules.length) throw new Error("保存システムIDが重複しています。");
  const moduleVersions = Object.freeze(Object.fromEntries(modules.map((module) => [module.id, module.version])));
  return Object.freeze({
    version,
    moduleVersions,
    migrate(raw) {
      if (!raw || typeof raw !== "object") return null;
      let migrated = options.migrate ? options.migrate(structuredClone(raw)) : structuredClone(raw);
      if (!migrated || typeof migrated !== "object") return null;
      const storedVersions = migrated.systemVersions && typeof migrated.systemVersions === "object"
        ? { ...migrated.systemVersions }
        : {};
      const nextVersions = { ...storedVersions };
      for (const module of modules) {
        let currentVersion = sourceModuleVersion(module, migrated, storedVersions);
        if (currentVersion > module.version) throw new RangeError(`保存システム ${module.id} は未対応の未来版です: ${currentVersion}`);
        while (currentVersion < module.version) {
          const migrate = module.migrations[currentVersion];
          if (typeof migrate !== "function") throw new Error(`保存システム ${module.id} の ${currentVersion}→${currentVersion + 1} 移行がありません。`);
          const next = migrate(structuredClone(migrated), {
            moduleId: module.id,
            fromVersion: currentVersion,
            toVersion: currentVersion + 1,
          });
          if (!next || typeof next !== "object") throw new TypeError(`保存システム ${module.id} の移行結果が不正です。`);
          migrated = next;
          currentVersion += 1;
        }
        nextVersions[module.id] = module.version;
      }
      return { ...migrated, version, systemVersions: nextVersions };
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
