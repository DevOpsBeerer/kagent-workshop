import { KubeConfig, CoreV1Api } from "@kubernetes/client-node";

export type Operator = {
  id: string;
  secret: string;
};

const NAMESPACE_PREFIX = "w-";
const SECRET_NAME = "code-server";
const PASSWORD_KEY = "password";

export async function fetchOperators(): Promise<Operator[]> {
  const api = getCoreApi();
  if (!api) return [];

  const ids = await listOperatorIds(api);
  const operators = await Promise.all(ids.map((id) => fetchOperatorSecret(api, id)));
  return operators.filter((op): op is Operator => op !== null);
}

function getCoreApi(): CoreV1Api | null {
  const kc = new KubeConfig();
  try {
    kc.loadFromDefault();
  } catch (err) {
    console.error("[operators] failed to load kubeconfig:", err);
    return null;
  }
  if (!kc.getCurrentCluster()) {
    console.error("[operators] no current cluster in kubeconfig");
    return null;
  }
  return kc.makeApiClient(CoreV1Api);
}

async function listOperatorIds(api: CoreV1Api): Promise<string[]> {
  try {
    const res = await api.listNamespace();
    return (res.items ?? [])
      .map((ns) => ns.metadata?.name)
      .filter((name): name is string => !!name && name.startsWith(NAMESPACE_PREFIX))
      .map((name) => name.slice(NAMESPACE_PREFIX.length))
      .sort();
  } catch (err) {
    console.error("[operators] listNamespace failed:", err);
    return [];
  }
}

async function fetchOperatorSecret(api: CoreV1Api, id: string): Promise<Operator | null> {
  const namespace = `${NAMESPACE_PREFIX}${id}`;
  try {
    const secret = await api.readNamespacedSecret({ name: SECRET_NAME, namespace });
    const encoded = secret.data?.[PASSWORD_KEY];
    if (!encoded) {
      console.warn(`[operators] ${namespace}/${SECRET_NAME} missing key "${PASSWORD_KEY}"`);
      return { id, secret: "" };
    }
    return { id, secret: Buffer.from(encoded, "base64").toString("utf-8") };
  } catch (err) {
    console.error(`[operators] failed to read ${namespace}/${SECRET_NAME}:`, err);
    return null;
  }
}
