import type { ProjectSettings } from "../types.js";

const CONFIG_PATH = `${import.meta.dir}/../../data/projects.json`;

type ConfigData = Record<string, ProjectSettings>;

async function readConfig(): Promise<ConfigData> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) return {};
  return file.json();
}

async function writeConfig(data: ConfigData): Promise<void> {
  Bun.spawnSync(["mkdir", "-p", `${import.meta.dir}/../../data`]);
  await Bun.write(CONFIG_PATH, JSON.stringify(data, null, 2));
}

export async function getProjectSettings(name: string): Promise<ProjectSettings | null> {
  const config = await readConfig();
  return config[name] ?? null;
}

export async function setProjectSettings(name: string, settings: Partial<ProjectSettings>): Promise<ProjectSettings> {
  const config = await readConfig();
  const current = config[name] ?? { coverageThreshold: 80 };
  const updated = { ...current, ...settings };
  config[name] = updated;
  await writeConfig(config);
  return updated;
}

export async function deleteProjectSettings(name: string): Promise<void> {
  const config = await readConfig();
  delete config[name];
  await writeConfig(config);
}
