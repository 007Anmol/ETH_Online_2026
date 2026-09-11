import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  BatchCreated,
  BatchMinted,
  NonceConsumed,
  TagBound,
  TagRevoked,
  VeriChainRegistry,
} from "../generated/VeriChainRegistry/VeriChainRegistry";
import { Batch, Nonce, Product, RegistryEvent, Tag } from "../generated/schema";

function eventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
}

function relatedBatch(product: Product | null): Batch | null {
  if (product == null || product.batch == null) {
    return null;
  }
  return Batch.load(product.batch as string);
}

function saveEvent(
  event: ethereum.Event,
  type: string,
  batch: Batch | null,
  product: Product | null,
  tag: Tag | null,
  nonce: Nonce | null,
): void {
  let row = new RegistryEvent(eventId(event));
  row.type = type;
  row.batch = batch != null ? batch.id : null;
  row.product = product != null ? product.id : null;
  row.tag = tag != null ? tag.id : null;
  row.nonce = nonce != null ? nonce.id : null;
  row.txHash = event.transaction.hash;
  row.timestamp = event.block.timestamp;
  row.blockNumber = event.block.number;
  row.save();
}

export function handleBatchCreated(event: BatchCreated): void {
  let batch = new Batch(event.params.batchIdHash.toHexString());
  batch.quantity = event.params.quantity;
  batch.mintedCount = BigInt.fromI32(0);
  batch.status = "Created";
  batch.createdAt = event.block.timestamp;
  batch.createdTx = event.transaction.hash;
  batch.save();

  saveEvent(event, "BatchCreated", batch, null, null, null);
}

export function handleBatchMinted(event: BatchMinted): void {
  let batchId = event.params.batchIdHash.toHexString();
  let batch = Batch.load(batchId);
  if (batch == null) {
    batch = new Batch(batchId);
    batch.quantity = BigInt.fromI32(0);
    batch.status = "Created";
    batch.createdAt = event.block.timestamp;
    batch.createdTx = event.transaction.hash;
  }

  batch.mintedCount = event.params.mintedCount;
  if (
    batch.quantity.gt(BigInt.fromI32(0)) &&
    batch.mintedCount.ge(batch.quantity)
  ) {
    batch.status = "Minted";
  }
  batch.mintedAt = event.block.timestamp;
  batch.mintedTx = event.transaction.hash;
  batch.save();

  saveEvent(event, "BatchMinted", batch as Batch, null, null, null);
}

export function handleTagBound(event: TagBound): void {
  let productId = event.params.productIdHash.toHexString();
  let tagId = event.params.tagIdHash.toHexString();

  let product = Product.load(productId);
  if (product == null) {
    product = new Product(productId);
  }

  let bound = VeriChainRegistry.bind(event.address);
  let productCall = bound.try_getProduct(event.params.productIdHash);
  if (!productCall.reverted && productCall.value.getExists()) {
    product.batch = productCall.value.getBatchIdHash().toHexString();
  }

  let tag = new Tag(tagId);
  tag.status = "Bound";
  tag.product = product.id;
  tag.save();

  product.boundTag = tag.id;
  product.save();

  saveEvent(event, "TagBound", relatedBatch(product as Product), product as Product, tag, null);
}

export function handleTagRevoked(event: TagRevoked): void {
  let productId = event.params.productIdHash.toHexString();
  let tagId = event.params.tagIdHash.toHexString();

  let tag = Tag.load(tagId);
  if (tag == null) {
    tag = new Tag(tagId);
  }
  tag.status = "Revoked";
  tag.product = null;
  tag.save();

  let product = Product.load(productId);
  if (product != null) {
    product.boundTag = null;
    product.save();
  }

  saveEvent(event, "TagRevoked", relatedBatch(product), product, tag as Tag, null);
}

export function handleNonceConsumed(event: NonceConsumed): void {
  let tagId = event.params.tagIdHash.toHexString();
  let nonceId = event.params.nonceHash.toHexString();

  let tag = Tag.load(tagId);
  if (tag == null) {
    tag = new Tag(tagId);
    tag.status = "Bound";
    tag.save();
  }

  let nonce = new Nonce(nonceId);
  nonce.tag = tag.id;
  nonce.txHash = event.transaction.hash;
  nonce.timestamp = event.block.timestamp;
  nonce.save();

  let product =
    tag.product != null ? Product.load(tag.product as string) : null;

  saveEvent(
    event,
    "NonceConsumed",
    relatedBatch(product),
    product,
    tag as Tag,
    nonce,
  );
}
