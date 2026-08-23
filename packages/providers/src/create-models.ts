import {
  createModels,
  type CredentialStore,
  type MutableModels,
  type Provider,
} from "@earendil-works/pi-ai";

export function createHarnessModels(
  providers: readonly Provider[],
  credentials?: CredentialStore,
): MutableModels {
  const models = credentials === undefined ? createModels() : createModels({ credentials });

  for (const provider of providers) {
    models.setProvider(provider);
  }

  return models;
}
