import { randomUUID } from "node:crypto";
import {
  TableClient,
  type TableEntity,
} from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import type {
  CreateTransactionRequest,
  PointsTransaction,
} from "../shared/contracts.js";

export class TransactionNotFoundError extends Error {}

export interface CreateOptions {
  /** Optional caller-supplied stable id used for idempotent replays. */
  id?: string;
  createdAt?: string;
}

export interface PointsStore {
  initialize(): Promise<void>;
  list(): Promise<PointsTransaction[]>;
  create(
    input: CreateTransactionRequest,
    options?: CreateOptions,
  ): Promise<PointsTransaction>;
  get(id: string): Promise<PointsTransaction>;
  checkHealth(): Promise<void>;
}

interface TransactionEntity extends TableEntity {
  memberId: string;
  points: number;
  reason: string;
  createdAt: string;
}

const toTransaction = (entity: TransactionEntity): PointsTransaction => ({
  id: entity.partitionKey,
  memberId: entity.memberId,
  points: entity.points,
  reason: entity.reason,
  createdAt: entity.createdAt,
});

const buildTransaction = (
  input: CreateTransactionRequest,
  options: CreateOptions,
): PointsTransaction => ({
  id: options.id ?? randomUUID(),
  memberId: input.memberId,
  points: input.points,
  reason: input.reason,
  createdAt: options.createdAt ?? new Date().toISOString(),
});

export class InMemoryPointsStore implements PointsStore {
  private readonly transactions = new Map<string, PointsTransaction>();

  async initialize(): Promise<void> {}

  list(): Promise<PointsTransaction[]> {
    return Promise.resolve([...this.transactions.values()]);
  }

  create(
    input: CreateTransactionRequest,
    options: CreateOptions = {},
  ): Promise<PointsTransaction> {
    const transaction = buildTransaction(input, options);
    const existing = this.transactions.get(transaction.id);
    if (existing) {
      return Promise.resolve(existing);
    }
    this.transactions.set(transaction.id, transaction);
    return Promise.resolve(transaction);
  }

  get(id: string): Promise<PointsTransaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      return Promise.reject(
        new TransactionNotFoundError(`Transaction ${id} was not found.`),
      );
    }
    return Promise.resolve(transaction);
  }

  async checkHealth(): Promise<void> {
    await this.list();
  }
}

export class AzureTablePointsStore implements PointsStore {
  constructor(private readonly table: TableClient) {}

  static fromEnvironment(): AzureTablePointsStore {
    const accountUrl = process.env.AZURE_STORAGE_ACCOUNT_URL;
    if (!accountUrl) {
      throw new Error(
        "AZURE_STORAGE_ACCOUNT_URL is required when STORAGE_BACKEND=azure.",
      );
    }
    const tableName = process.env.AZURE_STORAGE_TABLE_NAME ?? "rewards";
    return new AzureTablePointsStore(
      new TableClient(accountUrl, tableName, new DefaultAzureCredential()),
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.table.createTable();
    } catch (error) {
      if (!isStatus(error, 409)) {
        throw error;
      }
    }
  }

  async list(): Promise<PointsTransaction[]> {
    const items: PointsTransaction[] = [];
    const entities = this.table.listEntities<TransactionEntity>();
    for await (const entity of entities) {
      items.push(toTransaction(entity));
    }
    return items;
  }

  async create(
    input: CreateTransactionRequest,
    options: CreateOptions = {},
  ): Promise<PointsTransaction> {
    const transaction = buildTransaction(input, options);
    try {
      await this.table.createEntity<TransactionEntity>({
        partitionKey: transaction.id,
        rowKey: "transaction",
        memberId: transaction.memberId,
        points: transaction.points,
        reason: transaction.reason,
        createdAt: transaction.createdAt,
      });
      return transaction;
    } catch (error) {
      if (isStatus(error, 409)) {
        return this.get(transaction.id);
      }
      throw error;
    }
  }

  async get(id: string): Promise<PointsTransaction> {
    try {
      const entity = await this.table.getEntity<TransactionEntity>(
        id,
        "transaction",
      );
      return toTransaction(entity);
    } catch (error) {
      if (isStatus(error, 404)) {
        throw new TransactionNotFoundError(`Transaction ${id} was not found.`);
      }
      throw error;
    }
  }

  async checkHealth(): Promise<void> {
    const iterator = this.table.listEntities();
    await iterator.byPage({ maxPageSize: 1 }).next();
  }
}

const isStatus = (error: unknown, statusCode: number): boolean =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  error.statusCode === statusCode;

export const createStorageFromEnvironment = (): PointsStore =>
  (process.env.STORAGE_BACKEND ??
    (process.env.AZURE_STORAGE_ACCOUNT_URL ? "azure" : "memory")) === "azure"
    ? AzureTablePointsStore.fromEnvironment()
    : new InMemoryPointsStore();

const seedItems: Array<CreateTransactionRequest & CreateOptions> = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    memberId: "mbr-ada",
    points: 150,
    reason: "Signed up for the loyalty program",
    createdAt: "2025-01-01T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    memberId: "mbr-grace",
    points: 75,
    reason: "First purchase bonus",
    createdAt: "2025-01-01T09:05:00.000Z",
  },
];

export const seedStorage = async (storage: PointsStore): Promise<void> => {
  for (const { id, createdAt, ...input } of seedItems) {
    try {
      await storage.create(input, { id, createdAt });
    } catch (error) {
      if (!isStatus(error, 409)) {
        throw error;
      }
    }
  }
};
