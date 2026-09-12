import "server-only";

export const DEFAULT_GRAPH_URL =
  "http://localhost:8000/subgraphs/name/verichain";

export function graphUrl(): string {
  const raw = process.env.GRAPH_URL?.trim() || DEFAULT_GRAPH_URL;
  return raw.replace(/\/+$/, "");
}

export class GraphQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphQueryError";
  }
}

export type GraphBatch = {
  id: string;
  quantity: string;
  mintedCount: string;
  status: string;
  createdAt: string;
  createdTx: string;
  mintedAt: string | null;
  mintedTx: string | null;
  events?: GraphRegistryEvent[];
};

export type GraphProduct = {
  id: string;
  batch: GraphBatch | null;
  boundTag: { id: string; status: string } | null;
  events: GraphRegistryEvent[];
};

export type GraphTag = {
  id: string;
  status: string;
  product: { id: string } | null;
};

export type GraphNonce = {
  id: string;
  tag: { id: string };
  txHash: string;
  timestamp: string;
};

export type GraphRegistryEvent = {
  id: string;
  type: string;
  txHash: string;
  timestamp: string;
  blockNumber: string;
  batch: { id: string } | null;
  product: { id: string } | null;
  tag: { id: string } | null;
  nonce: { id: string } | null;
};

type GraphResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

function normalizeGraphId(id: string): string {
  return id.trim().toLowerCase();
}

export async function graphQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = graphUrl();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (error) {
    throw new GraphQueryError(
      `The Graph is unreachable at ${url}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new GraphQueryError(
      `The Graph returned HTTP ${response.status} from ${url}`,
    );
  }

  let body: GraphResponse<T>;
  try {
    body = (await response.json()) as GraphResponse<T>;
  } catch {
    throw new GraphQueryError(`The Graph returned non-JSON from ${url}`);
  }

  if (body.errors?.length) {
    throw new GraphQueryError(body.errors.map((e) => e.message).join("; "));
  }
  if (!body.data) {
    throw new GraphQueryError(`The Graph returned no data from ${url}`);
  }
  return body.data;
}

const BATCH_FIELDS = `
  id
  quantity
  mintedCount
  status
  createdAt
  createdTx
  mintedAt
  mintedTx
`;

export async function fetchGraphBatches(first = 10): Promise<GraphBatch[]> {
  if (first <= 0) return [];
  const data = await graphQuery<{ batches: GraphBatch[] }>(
    `query LatestBatches($first: Int!) {
      batches(first: $first, orderBy: createdAt, orderDirection: desc) {
        ${BATCH_FIELDS}
      }
    }`,
    { first },
  );
  return data.batches;
}

export async function fetchGraphBatch(id: string): Promise<GraphBatch | null> {
  const normalized = normalizeGraphId(id);
  if (!normalized) return null;
  const data = await graphQuery<{ batch: GraphBatch | null }>(
    `query Batch($id: ID!) {
      batch(id: $id) { ${BATCH_FIELDS} }
    }`,
    { id: normalized },
  );
  return data.batch;
}

export async function fetchGraphProduct(
  id: string,
): Promise<GraphProduct | null> {
  const normalized = normalizeGraphId(id);
  if (!normalized) return null;
  const data = await graphQuery<{ product: GraphProduct | null }>(
    `query Product($id: ID!) {
      product(id: $id) {
        id
        batch {
          ${BATCH_FIELDS}
          events(orderBy: timestamp, orderDirection: asc) {
            id
            type
            txHash
            timestamp
            blockNumber
            batch { id }
            product { id }
            tag { id }
            nonce { id }
          }
        }
        boundTag { id status }
        events(orderBy: timestamp, orderDirection: asc) {
          id
          type
          txHash
          timestamp
          blockNumber
          batch { id }
          product { id }
          tag { id }
          nonce { id }
        }
      }
    }`,
    { id: normalized },
  );
  return data.product;
}

export async function fetchGraphTag(id: string): Promise<GraphTag | null> {
  const normalized = normalizeGraphId(id);
  if (!normalized) return null;
  const data = await graphQuery<{ tag: GraphTag | null }>(
    `query Tag($id: ID!) {
      tag(id: $id) {
        id
        status
        product { id }
      }
    }`,
    { id: normalized },
  );
  return data.tag;
}

export async function fetchGraphNonce(id: string): Promise<GraphNonce | null> {
  const normalized = normalizeGraphId(id);
  if (!normalized) return null;
  const data = await graphQuery<{ nonce: GraphNonce | null }>(
    `query Nonce($id: ID!) {
      nonce(id: $id) {
        id
        tag { id }
        txHash
        timestamp
      }
    }`,
    { id: normalized },
  );
  return data.nonce;
}

const DASHBOARD_PAGE = 1000;

export type GraphDashboardRows = {
  batches: Array<{ mintedCount: string }>;
  boundTags: Array<{ id: string }>;
};

export async function fetchGraphDashboardRows(): Promise<GraphDashboardRows> {
  const data = await graphQuery<{
    batches: Array<{ mintedCount: string }>;
    boundTags: Array<{ id: string }>;
  }>(
    `query DashboardCounts($first: Int!) {
      batches(first: $first) { mintedCount }
      boundTags: tags(first: $first, where: { status: "Bound" }) { id }
    }`,
    { first: DASHBOARD_PAGE },
  );
  return { batches: data.batches, boundTags: data.boundTags };
}

export async function fetchGraphEvents(
  first = 20,
): Promise<GraphRegistryEvent[]> {
  if (first <= 0) return [];
  const data = await graphQuery<{ registryEvents: GraphRegistryEvent[] }>(
    `query RegistryEvents($first: Int!) {
      registryEvents(first: $first, orderBy: timestamp, orderDirection: desc) {
        id
        type
        txHash
        timestamp
        blockNumber
        batch { id }
        product { id }
        tag { id }
        nonce { id }
      }
    }`,
    { first },
  );
  return data.registryEvents;
}
